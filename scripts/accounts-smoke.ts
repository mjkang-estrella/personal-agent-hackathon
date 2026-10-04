// Real Postgres and real Next.js handlers with a local identity-provider fixture.
// Uses an isolated disposable schema; never logs in to Google or sends email.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import pg from "pg";

const admin = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
});
await admin.connect();
const schema = `accounts_test_${randomUUID().replaceAll("-", "")}`;
const port = Number(process.env.ACCOUNTS_TEST_PORT || 3006);
const origin = `http://localhost:${port}`;
const tokenName = "__Secure-neon-auth.session_token";
const users = new Map([
  ["fixture-a", "account-a"],
  ["fixture-b", "account-b"],
]);
let outage = false;
const provider = createServer((req, res) => {
  const token = (req.headers.cookie || "").match(
    /__Secure-neon-auth\.session_token=([^;]+)/,
  )?.[1];
  res.setHeader("content-type", "application/json");
  if (outage) {
    res.writeHead(503);
    res.end(JSON.stringify({ message: "fixture outage" }));
    return;
  }
  if (req.url?.startsWith("/sign-out")) {
    if (token) users.delete(token);
    res.setHeader(
      "set-cookie",
      `${tokenName}=; Path=/; HttpOnly; Secure; Max-Age=0`,
    );
    res.end(JSON.stringify({ success: true }));
    return;
  }
  assert.ok(
    req.url?.startsWith("/get-session"),
    "Only session verification may reach the fixture",
  );
  const id = token && users.get(token);
  res.end(
    JSON.stringify(
      id
        ? {
            user: {
              id,
              email: `${id}@example.com`,
              name: "Fictional account",
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            session: {
              id: randomUUID(),
              token,
              userId: id,
              expiresAt: new Date(Date.now() + 3600000),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }
        : null,
    ),
  );
});
await new Promise<void>((resolve) => provider.listen(0, "127.0.0.1", resolve));
const providerPort = (provider.address() as { port: number }).port;
let child: ReturnType<typeof spawn> | undefined;
const jar = () => new Map<string, string>();
async function request(
  cookies: Map<string, string>,
  path: string,
  body?: unknown,
  requestOrigin = origin,
) {
  const r = await fetch(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      origin: requestOrigin,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  for (const value of r.headers.getSetCookie()) {
    const pair = value.split(";")[0];
    const index = pair.indexOf("=");
    if (pair.slice(index + 1))
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    else cookies.delete(pair.slice(0, index));
  }
  const raw = await r.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  return { status: r.status, data, headers: r.headers };
}
try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.query(`SET search_path TO ${schema}`);
  for (const file of ["001_jobswitch.sql", "002_gmail.sql", "004_accounts.sql"])
    await admin.query(await readFile(`migrations/${file}`, "utf8"));
  const db = new URL(process.env.DATABASE_URL_UNPOOLED!);
  db.searchParams.set("options", `-c search_path=${schema}`);
  child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--port", String(port)],
    {
      env: {
        ...process.env,
        DATABASE_URL: db.toString(),
        NEON_AUTH_BASE_URL: `http://127.0.0.1:${providerPort}`,
        NEON_AUTH_COOKIE_SECRET: "fixture-cookie-secret-at-least-32-characters",
        SESSION_SECRET: "fixture-workspace-secret",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  // Consume output without printing identity cookies, auth URLs, or provider errors.
  child.stdout?.resume();
  child.stderr?.resume();
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(`${origin}/api/account`)).ok) break;
    } catch {}
    if (child.exitCode !== null)
      throw new Error(
        `Test server exited (${child.exitCode}). Check that the test port and build directory are free.`,
      );
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (i === 89) throw new Error("Account test server did not start.");
  }
  const guest = jar();
  assert.equal((await request(guest, "/api/state")).status, 200);
  const guestCopy = new Map(guest);
  for (const path of [
    "/api/documents",
    "/api/gmail/connect",
    "/api/gmail/threads",
    "/api/gmail/track",
    "/api/gmail/sync",
    "/api/gmail/disconnect",
  ]) {
    assert.ok(
      (await request(guest, path, {})).status >= 400,
      `Guest denied: ${path}`,
    );
  }
  assert.equal(
    (
      await request(guest, "/api/action", {
        action: "new_workspace",
        mode: "personal",
      })
    ).status,
    400,
  );
  const guestId = guest.get("jobswitch_session")!.split(".")[0];
  await admin.query(
    "UPDATE jobswitch_workspaces SET data=jsonb_set(data,'{analysisSummary}','\"Preserved guest progress\"') WHERE id=$1",
    [guestId],
  );
  guest.set(tokenName, "fixture-a");
  const a = guest;
  const adopted = await request(a, "/api/account");
  assert.equal(adopted.data.activeWorkspace, guestId);
  assert.equal(
    (await request(a, "/api/state")).data.analysisSummary,
    "Preserved guest progress",
  );
  assert.equal(
    (await request(guestCopy, "/api/state")).status,
    401,
    "Old guest capability is no longer enough",
  );
  const secondDevice = jar();
  secondDevice.set(tokenName, "fixture-a");
  assert.equal(
    (await request(secondDevice, "/api/account")).data.activeWorkspace,
    guestId,
  );
  const b = new Map(guestCopy);
  b.set(tokenName, "fixture-b");
  const bAccount = await request(b, "/api/account");
  assert.notEqual(bAccount.data.activeWorkspace, guestId);
  assert.equal(
    (
      await request(b, "/api/account", {
        action: "switch",
        workspaceId: guestId,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(
        a,
        "/api/account",
        { action: "sign_out" },
        "https://attacker.example",
      )
    ).status,
    400,
  );
  assert.equal(
    (await request(a, "/api/auth/sign-up/email", { email: "test@example.com" }))
      .status,
    404,
  );
  assert.equal(
    (
      await request(a, "/api/action", {
        action: "new_workspace",
        mode: "personal",
      })
    ).status,
    200,
  );
  const personal = await request(a, "/api/account");
  assert.equal(personal.data.workspaces.length, 2);
  assert.equal((await request(a, "/api/state")).data.demo, false);
  assert.equal(
    (
      await request(a, "/api/account", {
        action: "switch",
        workspaceId: guestId,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request(a, "/api/state")).data.analysisSummary,
    "Preserved guest progress",
  );
  outage = true;
  assert.equal(
    (await request(a, "/api/state")).status,
    503,
    "Provider outage fails closed",
  );
  outage = false;
  const stale = new Map(a);
  assert.equal(
    (await request(a, "/api/account", { action: "sign_out" })).status,
    200,
  );
  assert.equal(a.has("jobswitch_session"), false);
  assert.equal(
    (await request(stale, "/api/state")).status,
    401,
    "Revoked session cannot reuse cached identity",
  );
  assert.equal((await request(a, "/api/state")).data.demo, true);
  assert.notEqual(a.get("jobswitch_session")?.split(".")[0], guestId);
  console.log(
    "PASS: guest gates, adoption, progress preservation, second-device restore, cross-account isolation, saved workspace switching, CSRF, disabled login methods, provider outage, sign-out and stale-session rejection.",
  );
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => child!.once("exit", () => resolve()));
  }
  await new Promise<void>((resolve) => provider.close(() => resolve()));
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.end();
}
