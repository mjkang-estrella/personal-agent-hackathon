import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWorkspace } from "./fixtures";
import { updateDates, validEvidence, assertCanSubmit } from "./domain";
test("citations require exact source page evidence", () => {
  const w = makeWorkspace();
  assert.equal(validEvidence(w.tasks[0].evidence[0], w), true);
  assert.equal(validEvidence({ ...w.tasks[0].evidence[0], page: 1 }, w), false);
  assert.equal(
    validEvidence(
      { ...w.tasks[0].evidence[0], quote: "You are guaranteed $850." },
      w,
    ),
    false,
  );
});
test("date changes invalidate prepared claims and recalculate inclusive enrollment deadlines", () => {
  const w = makeWorkspace();
  w.tasks[0].status = "ready";
  w.tasks[0].claim = {
    employee: "Alex",
    course: "Product",
    amount: 850,
    receiptId: "course-receipt",
    certificateId: null,
    policyDocumentId: "northstar-policy",
    policyPage: 2,
    note: "",
  };
  updateDates(w, "2026-10-20", "2026-10-25");
  assert.equal(w.tasks[0].status, "todo");
  assert.equal(w.tasks[0].claim, undefined);
  assert.equal(w.tasks[0].deadline, "2026-10-20");
  assert.equal(
    w.tasks.find((t) => t.id === "enrollment")?.deadline,
    "2026-11-23",
  );
});
test("submission requires a reviewed claim with no unresolved requirements", () => {
  const w = makeWorkspace();
  assert.throws(() => assertCanSubmit(w.tasks[0]));
  const t = w.tasks[0];
  t.status = "ready";
  t.claim = {
    employee: "Alex",
    course: "Product",
    amount: 850,
    receiptId: "course-receipt",
    certificateId: null,
    policyDocumentId: "northstar-policy",
    policyPage: 2,
    note: "",
  };
  assert.doesNotThrow(() => assertCanSubmit(t));
  t.missing = ["Prior approval"];
  assert.throws(() => assertCanSubmit(t));
  t.status = "waiting";
  t.missing = [];
  assert.throws(() => assertCanSubmit(t));
});
test("cannot start before leaving", () =>
  assert.throws(() =>
    updateDates(makeWorkspace(), "2026-10-20", "2026-10-19"),
  ));
test("approval matches content across database key reordering, but rejects edited claims", async () => {
  const { matchesApproval } = await import("./domain");
  assert.equal(
    matchesApproval('{"amount":850,"course":"Product"}', {
      course: "Product",
      amount: 850,
    }),
    true,
  );
  assert.equal(matchesApproval('{"amount":850}', { amount: 851 }), false);
  assert.equal(matchesApproval("invalid", {}), false);
});

test("reply approval binds recipient, message, body, and certificate contents", async () => {
  const { replyPayload, matchesApproval } = await import("./domain");
  const { completionCertificate } = await import("./fixtures");
  const w = makeWorkspace();
  w.hrInbox = "demo-hr@example.test";
  const task = w.tasks[0];
  task.mailMessageId = "message-1";
  const cert = completionCertificate();
  const approved = JSON.stringify(replyPayload(w, task, cert));
  assert.equal(matchesApproval(approved, replyPayload(w, task, cert)), true);
  cert.pages[0] += " Changed content";
  assert.equal(matchesApproval(approved, replyPayload(w, task, cert)), false);
  assert.equal(
    matchesApproval(
      approved,
      replyPayload(
        { ...w, hrInbox: "other@example.test" },
        task,
        completionCertificate(),
      ),
    ),
    false,
  );
});
