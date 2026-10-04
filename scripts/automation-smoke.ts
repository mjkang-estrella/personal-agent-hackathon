// Preparation-only integration checks. Never approve or send a valid payload.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, lockPool, withWorkspaceLock } from "../lib/db";
import type { Workspace } from "../lib/types";

const base = process.env.JOBSWITCH_TEST_URL || "http://localhost:3000";
let cookie = "";
async function request(action?: Record<string, unknown>, origin = base) {
  const response = await fetch(`${base}/api/${action ? "action" : "state"}`, {
    method: action ? "POST" : "GET",
    headers: { "content-type": "application/json", cookie, origin },
    body: action ? JSON.stringify(action) : undefined,
  });
  cookie = response.headers.get("set-cookie")?.split(";")[0] || cookie;
  return { status: response.status, body: await response.json() };
}
async function act(
  action: string,
  extra: Record<string, unknown> = {},
): Promise<Workspace> {
  const r = await request({ action, ...extra });
  assert.equal(r.status, 200, r.body.error);
  return r.body;
}
try {
  const lockId = randomUUID();
  let entered!: () => void;
  let release!: () => void;
  const ready = new Promise<void>((r) => {
    entered = r;
  });
  const wait = new Promise<void>((r) => {
    release = r;
  });
  const first = withWorkspaceLock(lockId, async () => {
    entered();
    await wait;
  });
  await ready;
  try {
    await assert.rejects(
      withWorkspaceLock(lockId, async () => {}),
      /finishing a step/,
    );
    await withWorkspaceLock(randomUUID(), async () => {
      await pool.query("SELECT 1");
    });
  } finally {
    release();
    await first;
  }
  await assert.rejects(
    withWorkspaceLock(lockId, async () => {
      throw new Error("test failure");
    }),
    /test failure/,
  );
  await withWorkspaceLock(lockId, async () => {});
  await Promise.all(
    Array.from({ length: 5 }, () =>
      withWorkspaceLock(randomUUID(), async () => {
        await pool.query("SELECT 1");
      }),
    ),
  );
  console.log(
    "PASS: workspace lock isolation, failure release, and five concurrent workspaces",
  );

  assert.equal((await request()).status, 200);
  let w: Workspace;
  const concurrent = await Promise.all([
    request({ action: "advance" }),
    request({ action: "advance" }),
  ]);
  assert.equal(concurrent.filter((r) => r.status === 200).length, 1);
  assert.match(
    concurrent.find((r) => r.status !== 200)!.body.error,
    /finishing a step/,
  );
  w = concurrent.find((r) => r.status === 200)!.body;
  for (let i = 0; i < 10 && w.agent?.pending; i++) w = await act("advance");
  assert.equal(w.agent?.error, undefined);
  assert.equal(w.agent?.pending, false);
  const claim = w.tasks.find(
    (t) => t.status === "ready" && t.claim?.amount === 850,
  );
  assert.ok(
    claim,
    "Expected the evidenced fictional $850 claim to be ready for review",
  );
  assert.ok(w.tasks.some((t) => t.status === "todo" && t.missing.length));
  assert.ok(
    !w.tasks.some((t) =>
      ["waiting", "submitting", "approved"].includes(t.status),
    ),
  );
  const count = w.activity.length;
  const lastRun = w.agent!.lastRunAt;
  w = await act("advance");
  assert.equal(
    w.activity.length,
    count,
    "no repeated preparation on unchanged input",
  );
  assert.equal(w.agent!.lastRunAt, lastRun);
  console.log(
    "PASS: automatic analysis/preparation stops at review; unknowns remain blocked; repeated ticks are idle",
  );

  assert.equal(
    (await request({ action: "submit", taskId: claim.id, approval: "{}" }))
      .status,
    400,
  );
  assert.equal(
    (await request({ action: "advance" }, "https://untrusted.example")).status,
    400,
  );
  w = await act("agent_pause");
  assert.equal(w.agent!.enabled, false);
  w = await act("dates", { lastDay: "2026-10-20", startDay: "2026-10-25" });
  assert.equal(w.tasks.find((t) => t.id === claim.id)?.claim, undefined);
  assert.equal(w.agent!.enabled, false);
  w = await act("advance");
  assert.equal(
    w.agent!.lastRunAt,
    lastRun,
    "paused agent must not analyze changed inputs",
  );
  assert.equal(
    (
      await request({
        action: "submit",
        taskId: claim.id,
        approval: JSON.stringify(claim.claim),
      })
    ).status,
    400,
  );
  const workspaceId = cookie.split("=")[1].split(".")[0];
  const claims = await pool.query(
    "SELECT count(*)::int AS count FROM jobswitch_claims WHERE workspace_id=$1",
    [workspaceId],
  );
  assert.equal(claims.rows[0].count, 0);
  const originalCookie = cookie;
  cookie = "";
  const isolated = await request();
  assert.equal(
    isolated.body.tasks.some((t: { id: string }) => t.id === claim.id),
    false,
  );
  assert.equal(
    (await request({ action: "submit", taskId: claim.id, approval: "{}" }))
      .status,
    400,
  );
  cookie = originalCookie;
  w = await act("agent_resume");
  assert.equal(w.agent!.enabled, true);
  assert.equal(w.agent!.pending, true);
  await act("agent_pause");
  console.log(
    "PASS: pause/resume, date invalidation, stale/missing approval rejection, cross-origin rejection, tenant isolation, zero submissions",
  );
} finally {
  await Promise.all([pool.end(), lockPool.end()]);
}
