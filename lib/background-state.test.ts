import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWorkspace } from "./fixtures";
import {
  applyHRReply,
  isCurrentRun,
  staleSubmission,
  recoverSubmission,
  SUBMISSION_STALE_MS,
  type HRReply,
} from "./background-state";
const reply = (overrides: Partial<HRReply> = {}): HRReply => ({
  id: "message-1",
  threadId: "thread",
  at: "2026-10-04T10:00:00Z",
  text: "Your reimbursement is approved.",
  quote: "reimbursement is approved",
  status: "approved",
  nextAction: "",
  missing: [],
  ...overrides,
});
test("older and duplicate HR messages cannot reverse approval", () => {
  const t = makeWorkspace().tasks[0];
  t.status = "waiting";
  assert.equal(applyHRReply(t, reply()), true);
  assert.equal(t.status, "approved");
  assert.equal(applyHRReply(t, reply()), false);
  assert.equal(
    applyHRReply(
      t,
      reply({ id: "old", status: "request", at: "2026-10-03T10:00:00Z" }),
    ),
    false,
  );
  assert.equal(t.status, "approved");
});
test("in-flight older classification cannot replace a newer request", () => {
  const t = makeWorkspace().tasks[0];
  t.status = "waiting";
  applyHRReply(t, reply({ status: "request" }));
  assert.equal(
    applyHRReply(t, reply({ id: "old", at: "2026-10-03T10:00:00Z" })),
    false,
  );
  assert.equal(t.status, "needs_info");
  assert.equal(t.mailMessageId, "message-1");
});
test("invalid timestamps and unsupported evidence never alter a claim", () => {
  const t = makeWorkspace().tasks[0];
  t.status = "waiting";
  assert.equal(applyHRReply(t, reply({ quote: "not in email" })), false);
  assert.equal(applyHRReply(t, reply({ at: "invalid" })), false);
  assert.equal(t.status, "waiting");
});
test("submission recovery waits past the request lifetime and preserves reviewed payload", () => {
  const t = makeWorkspace().tasks[0];
  t.status = "submitting";
  t.submittingAt = new Date(0).toISOString();
  assert.equal(staleSubmission(t, SUBMISSION_STALE_MS - 1), false);
  assert.equal(staleSubmission(t, SUBMISSION_STALE_MS + 1), true);
  recoverSubmission(t, false);
  assert.equal(t.status, "ready");
  t.status = "submitting";
  recoverSubmission(t, true);
  assert.equal(t.status, "waiting");
});
test("pausing or restarting fences off the previous workflow", () => {
  const w = makeWorkspace();
  w.background = {
    enabled: true,
    generation: "new",
    status: "running",
    startedAt: "",
  };
  assert.equal(isCurrentRun(w, "old"), false);
  assert.equal(isCurrentRun(w, "new"), true);
  w.background.enabled = false;
  assert.equal(isCurrentRun(w, "new"), false);
});
