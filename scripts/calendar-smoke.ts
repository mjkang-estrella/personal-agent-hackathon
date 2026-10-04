// Disposable development workspaces; all provider HTTP mocked. No real calendar writes.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, getWorkspace, mutate } from "../lib/db";
import { begin, finish } from "../lib/connections/oauth";
import { disconnect, connection, access } from "../lib/connections/store";
import { preview, createReminder, receipts } from "../lib/connections/calendar";
import { seal } from "../lib/gmail/security";
import { disconnect as disconnectGmail } from "../lib/gmail/oauth";
import { services, type Service } from "../lib/connections/config";
const ids = [randomUUID(), randomUUID()];
process.env.GOOGLE_CLIENT_ID = "fixture";
process.env.GOOGLE_CLIENT_SECRET = "fixture";
process.env.MICROSOFT_CLIENT_ID = "fixture";
process.env.MICROSOFT_CLIENT_SECRET = "fixture";
process.env.GOOGLE_CONNECTIONS_REDIRECT_URI =
  "http://localhost:3001/api/connections/callback";
process.env.MICROSOFT_CONNECTIONS_REDIRECT_URI =
  process.env.GOOGLE_CONNECTIONS_REDIRECT_URI;
process.env.GMAIL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString("base64");
process.env.SESSION_SECRET = "fixture-calendar-secret";
const originalFetch = globalThis.fetch;
let current: Service = "google-calendar",
  writes = 0,
  timeout = false,
  revoked = false,
  googleRevocations = 0;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.endsWith("/revoke")) {
    googleRevocations++;
    return new Response(null, { status: 200 });
  }
  if (url.endsWith("/token")) {
    if (revoked)
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    return Response.json({
      access_token: "fake-access",
      refresh_token: "fake-refresh",
      scope: services[current].scope,
    });
  }
  if (url.includes("/userinfo"))
    return Response.json({
      sub: "fake-user",
      email: "fictional@example.com",
      email_verified: true,
    });
  if (url.includes("/me?$select"))
    return Response.json({ id: "fake-user", mail: "fictional@example.com" });
  if (url.endsWith("/events")) {
    assert.equal(init?.method, "POST");
    const body = JSON.parse(String(init?.body));
    assert.ok(!body.attendees);
    writes++;
    if (timeout)
      throw new Error(
        "Simulated lost response after provider accepted request",
      );
    return Response.json({ id: body.id || "graph-event" });
  }
  throw new Error("Unexpected network destination in calendar smoke.");
};
try {
  for (const id of ids) {
    await getWorkspace(id);
    await mutate(id, (w) => {
      w.demo = false;
    });
  }
  for (const service of ["google-calendar", "microsoft-calendar"] as const) {
    current = service;
    const url = new URL(await begin(ids[0], service)),
      state = url.searchParams.get("state")!;
    await assert.rejects(finish(ids[1], state, "fake-code"));
    assert.equal((await finish(ids[0], state, "fake-code")).connected, true);
    await assert.rejects(finish(ids[0], state, "fake-code"));
    assert.notEqual(
      (await connection(ids[0], service))?.encrypted_refresh,
      "fake-refresh",
    );
    if (service === "google-calendar") {
      await pool.query(
        "INSERT INTO jobswitch_gmail_connections(workspace_id,generation,email,encrypted_refresh,status) VALUES($1,$2,'fictional@example.com',$3,'connected')",
        [ids[0], randomUUID(), seal("fake-gmail-refresh", ids[0])],
      );
      assert.equal((await disconnectGmail(ids[0])).revoked, false);
      assert.equal(googleRevocations, 0);
      assert.equal((await connection(ids[0], service))?.status, "connected");
    }

    const p = await preview(ids[0], service, {
      taskId: "learning",
      title: "Fictional reminder",
      date: "2026-10-16",
      timeZone: "America/Los_Angeles",
    });
    await assert.rejects(
      createReminder(ids[0], service, {
        ...p,
        preview: { ...p.preview, title: "tampered" },
        approved: true,
      }),
    );
    assert.equal(writes, service === "google-calendar" ? 0 : 1);
    timeout = service === "microsoft-calendar";
    const created = await createReminder(ids[0], service, {
      ...p,
      approved: true,
    });
    assert.equal(created.status, timeout ? "unknown" : "created");
    const count = writes;
    await createReminder(ids[0], service, { ...p, approved: true });
    assert.equal(writes, count);
    assert.equal((await receipts(ids[1], service)).length, 0);
    assert.equal((await receipts(ids[0], service)).length, 1);
    revoked = true;
    await assert.rejects(access(ids[0], service));
    assert.equal((await connection(ids[0], service))?.status, "reconnect");
    revoked = false;
    googleRevocations = 0;
    await disconnect(ids[0], service);
    assert.equal(await connection(ids[0], service), undefined);
    assert.equal((await receipts(ids[0], service)).length, 1);
  }
  const started = new URL(await begin(ids[0], "google-calendar"));
  await disconnect(ids[0]);
  await assert.rejects(
    finish(ids[0], started.searchParams.get("state")!, "fake-code"),
  );
  console.log(
    "Calendar smoke passed: workspace isolation, OAuth replay/disconnect, encrypted tokens, exact approval, duplicate suppression, unknown outcomes, receipts retained. Provider calls mocked.",
  );
} finally {
  globalThis.fetch = originalFetch;
  await pool.query(
    "DELETE FROM jobswitch_workspaces WHERE id=ANY($1::uuid[])",
    [ids],
  );
  await pool.end();
}
