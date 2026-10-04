import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWorkspace } from "./fixtures";
import { orientation } from "./orientation";
const empty = () => ({
  ...makeWorkspace(),
  documents: [],
  tasks: [],
  agent: { enabled: true },
});
const prepared = () => {
  const w = makeWorkspace();
  w.agent = { enabled: true };
  const t = w.tasks[0];
  t.status = "ready";
  t.claim = {
    employee: "Alex",
    course: "Course",
    amount: 850,
    receiptId: "receipt",
    certificateId: null,
    policyDocumentId: "northstar-policy",
    policyPage: 2,
    note: "Review",
  };
  return w;
};
test("empty arrival gives a real first action, not irrelevant prompts", () => {
  const o = orientation(empty());
  assert.equal(o.primary.action?.kind, "upload");
  assert.match(o.primary.body, /sign-in/);
  assert.ok(!JSON.stringify(o.prompts).includes("401(k)"));
});
test("prepared claim leads before personal decisions and missing information", () => {
  const w = prepared();
  const o = orientation(w);
  assert.equal(o.primary.action?.kind, "task");
  assert.match(o.primary.title, /\$850/);
  assert.equal(o.primary.action?.label, "Review claim");
  assert.ok(o.later.length <= 2);
  assert.match(o.primary.body, /before you decide/);
});
test("pauses and errors offer recovery without hiding prepared work or leaking raw errors", () => {
  const w = prepared();
  w.agent!.enabled = false;
  assert.equal(orientation(w).primary.action?.label, "Resume agent");
  assert.equal(orientation(w).later[0].action?.label, "Review claim");
  w.agent!.error = "secret provider URL";
  const o = orientation(w);
  assert.equal(o.primary.action?.label, "Retry preparation");
  assert.ok(!JSON.stringify(o).includes("secret provider URL"));
});
test("analysis shows waiting guidance but a prepared claim remains actionable", () => {
  const w = prepared();
  w.agent!.phase = "analyze";
  assert.equal(
    orientation(w, { busy: "advance" }).primary.action?.label,
    "Review claim",
  );
  w.tasks = [];
  assert.equal(orientation(w, { busy: "advance" }).primary.action, undefined);
  assert.match(
    orientation(w, { busy: "advance" }).primary.reason,
    /No action needed/,
  );
});
test("undated decisions have neither manufactured urgency nor recommended choices", () => {
  const w = makeWorkspace();
  w.agent = { enabled: true };
  w.tasks = w.tasks.filter((t) => t.decision);
  w.tasks[0].deadline = null;
  const o = orientation(w);
  assert.equal(o.primary.action?.label, "See the options");
  assert.match(o.primary.body, /No deadline/);
  assert.match(o.primary.body, /does not choose/);
});
test("waiting, submitting, approved and done remain distinct", () => {
  for (const state of ["waiting", "submitting", "approved", "done"] as const) {
    const w = prepared();
    w.tasks = [w.tasks[0]];
    w.tasks[0].status = state;
    const o = orientation(w);
    if (state === "waiting")
      assert.match(o.primary.reason, /Waiting for a reply/);
    if (state === "submitting") assert.match(o.primary.reason, /in progress/);
    if (state === "approved")
      assert.match(o.primary.body, /Payment has not been confirmed/);
    if (state === "done") assert.equal(o.primary.action?.kind, "plan");
  }
});
test("evidence only appears if the exact quote exists on the cited page", () => {
  const w = prepared();
  w.tasks[0].evidence = [
    { documentId: w.documents[0].id, page: 999, quote: "invented" },
  ];
  assert.equal(orientation(w).primary.evidence, undefined);
  w.tasks[0].evidence = [
    {
      documentId: w.documents[0].id,
      page: 1,
      quote: w.documents[0].pages[0].slice(0, 50),
    },
  ];
  assert.equal(orientation(w).primary.evidence?.page, 1);
});
