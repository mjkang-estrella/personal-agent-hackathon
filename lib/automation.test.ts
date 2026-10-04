import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWorkspace, completionCertificate } from "./fixtures";
import { nextAgentStep, queueAgent, reviewKind } from "./automation";
import { matchesApproval, replyPayload, updateDates } from "./domain";

const prepared = () => {
  const w = makeWorkspace();
  w.agent = { enabled: true, analyzedInput: "v1", preparedInputs: {} };
  return w;
};

test("new and changed inputs are analyzed before any claim is prepared", () => {
  assert.deepEqual(nextAgentStep(makeWorkspace(), "v1"), { kind: "analyze" });
  const w = prepared();
  assert.deepEqual(nextAgentStep(w, "v1"), {
    kind: "prepare",
    taskId: "learning",
  });
  assert.deepEqual(nextAgentStep(w, "v2"), { kind: "analyze" });
});

test("blocked claims are checked once per input; other tasks continue", () => {
  const w = prepared();
  w.tasks[0].missing = ["HR confirmation needed"];
  w.agent!.preparedInputs = { learning: "v1" };
  assert.deepEqual(nextAgentStep(w, "v1"), {
    kind: "prepare",
    taskId: "equipment",
  });
  w.agent!.preparedInputs.equipment = "v1";
  assert.equal(nextAgentStep(w, "v1"), null);
  assert.deepEqual(nextAgentStep(w, "v2"), { kind: "analyze" });
});

test("no automation without documents, or while paused, failed, or submitting", () => {
  const empty = makeWorkspace();
  empty.documents = [];
  assert.equal(nextAgentStep(empty, "v1"), null);
  const w = prepared();
  w.agent!.enabled = false;
  assert.equal(nextAgentStep(w, "v1"), null);
  queueAgent(w);
  assert.equal(
    w.agent!.enabled,
    false,
    "uploads must not resume a paused agent",
  );
  w.agent!.enabled = true;
  w.agent!.error = "Retry required";
  assert.equal(nextAgentStep(w, "v1"), null);
  queueAgent(w);
  w.tasks[0].status = "submitting";
  assert.equal(nextAgentStep(w, "v2"), null);
});

test("ready claims, replies, approvals and completions never cause automatic sends", () => {
  for (const status of [
    "ready",
    "waiting",
    "needs_info",
    "approved",
    "done",
  ] as const) {
    const w = prepared();
    w.tasks = [w.tasks[0]];
    w.tasks[0].status = status;
    assert.equal(nextAgentStep(w, "v1"), null);
  }
});

test("HR polling is throttled and stops after approval", () => {
  const w = prepared();
  w.tasks = [w.tasks[0]];
  w.tasks[0].status = "waiting";
  w.inbox = "demo@example.test";
  w.hrInbox = "hr@example.test";
  const now = Date.parse("2026-10-04T20:00:00Z");
  assert.deepEqual(nextAgentStep(w, "v1", now), { kind: "sync" });
  w.agent!.lastSyncedAt = new Date(now - 19000).toISOString();
  assert.equal(nextAgentStep(w, "v1", now), null);
  assert.deepEqual(nextAgentStep(w, "v1", now + 1000), { kind: "sync" });
  w.tasks[0].status = "approved";
  assert.equal(nextAgentStep(w, "v1", now + 20000), null);
});

test("review queue distinguishes unknowns, exact claim reviews, and drafted replies", () => {
  const w = prepared();
  const t = w.tasks[0];
  assert.equal(reviewKind(t, w), null);
  assert.equal(reviewKind(w.tasks[1], w), "input");
  t.status = "ready";
  t.claim = {
    employee: "Alex Morgan",
    course: "Product Strategy Fundamentals",
    amount: 850,
    receiptId: "course-receipt",
    certificateId: null,
    policyDocumentId: "northstar-policy",
    policyPage: 2,
    note: "Review",
  };
  assert.equal(reviewKind(t, w), "claim");
  const approvedClaim = JSON.stringify(t.claim);
  t.claim.amount = 900;
  assert.equal(matchesApproval(approvedClaim, t.claim), false);
  t.status = "needs_info";
  assert.equal(reviewKind(t, w), "input");
  w.documents.push(completionCertificate());
  assert.equal(reviewKind(t, w), "input", "no recipient or HR message yet");
  t.mailMessageId = "request-1";
  w.hrInbox = "hr@example.test";
  assert.equal(reviewKind(t, w), "reply");
  const approvedReply = JSON.stringify(
    replyPayload(w, t, completionCertificate()),
  );
  t.mailMessageId = "request-2";
  assert.equal(
    matchesApproval(approvedReply, replyPayload(w, t, completionCertificate())),
    false,
  );
  t.status = "approved";
  assert.equal(reviewKind(t, w), null);
});

test("new transition dates invalidate a ready claim before it can be reviewed again", () => {
  const w = prepared();
  w.tasks[0].status = "ready";
  updateDates(w, "2026-10-20", "2026-10-25");
  queueAgent(w);
  assert.equal(reviewKind(w.tasks[0], w), null);
  assert.equal(w.agent!.pending, true);
  assert.deepEqual(nextAgentStep(w, "changed-dates"), { kind: "analyze" });
});
