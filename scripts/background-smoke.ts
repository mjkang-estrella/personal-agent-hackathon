// Local integration test. Creates and removes only its own fictional workspace.
import assert from "node:assert/strict";
import { pool } from "../lib/db";
const base = process.env.TEST_BASE_URL || "http://localhost:3001";
const initial = await fetch(base + "/api/state");
assert.equal(initial.status, 200);
const cookie = initial.headers.get("set-cookie")!.split(";")[0];
const id = cookie.split("=")[1].split(".")[0];
assert.match(id, /^[0-9a-f-]{36}$/);
try {
  const w = await initial.json();
  w.tasks[0].status = "submitting";
  w.tasks[0].submittingAt = new Date(Date.now() - 11 * 60_000).toISOString();
  w.tasks[0].claim = {
    employee: "Alex",
    course: "Fictional test",
    amount: 1,
    receiptId: "course-receipt",
    certificateId: null,
    policyDocumentId: "northstar-policy",
    policyPage: 2,
    note: "",
  };
  await pool.query("UPDATE jobswitch_workspaces SET data=$2 WHERE id=$1", [
    id,
    JSON.stringify(w),
  ]);
  const action = async (enabled: boolean, origin = base) =>
    fetch(base + "/api/background", {
      method: "POST",
      headers: { cookie, origin, "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  assert.equal((await action(true, "https://other.example.test")).status, 400);
  assert.equal((await action(true)).status, 200);
  let checked = false;
  for (let n = 0; n < 25; n++) {
    const state = await (
      await fetch(base + "/api/state", { headers: { cookie } })
    ).json();
    if (state.background?.lastCheckedAt) {
      assert.equal(state.tasks[0].status, "ready");
      assert.equal(state.background.status, "running");
      checked = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(checked, "Durable workflow did not execute");
  const unrelated = await (await fetch(base + "/api/state")).json();
  assert.equal(unrelated.background, undefined);
  const paused = await (await action(false)).json();
  assert.equal(paused.background.enabled, false);
  console.log(
    "PASS: durable execution, stale-submission recovery, cross-origin rejection, workspace isolation, pause. No external messages or submissions sent.",
  );
} finally {
  await pool.query("DELETE FROM jobswitch_workspaces WHERE id=$1", [id]);
  await pool.end();
}
