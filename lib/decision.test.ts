import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWorkspace } from "./fixtures";
import { reviewKind } from "./automation";
import { chooseOption, validEvidence } from "./domain";
import { resolveFocus } from "./focus";

const rollover = (w = makeWorkspace()) =>
  w.tasks.find((t) => t.id === "rollover")!;

test("the 401(k) choice is grounded in the documents and waits for the person", () => {
  const w = makeWorkspace();
  const task = rollover(w);
  const evidence = [
    ...task.evidence,
    ...task.decision!.options.flatMap((o) => o.evidence || []),
  ];
  assert.ok(evidence.every((e) => validEvidence(e, w)));
  assert.equal(reviewKind(task, w), "decision");
});

test("choosing records the person's option without sending or completing anything", () => {
  const w = makeWorkspace();
  const { task } = chooseOption(w, "rollover", "ira", "2026-10-05T12:00:00Z");
  assert.equal(task.decision!.chosenId, "ira");
  assert.equal(task.status, "todo");
  assert.match(task.nextAction, /bank or brokerage/);
  // Still-missing administrator facts keep it on the person's list.
  assert.equal(reviewKind(task, w), "input");
  assert.equal(w.drafts, undefined);
});

test("unknown tasks and options are rejected", () => {
  const w = makeWorkspace();
  assert.throws(() => chooseOption(w, "rollover", "best"));
  assert.throws(() => chooseOption(w, "learning", "ira"));
  assert.equal(rollover(w).decision!.chosenId, undefined);
});

test("assistant focus only resolves targets inside this workspace", () => {
  const w = makeWorkspace();
  assert.deepEqual(resolveFocus(w, { view: "task", taskId: "rollover" }), {
    focus: { view: "task", id: "rollover", label: rollover(w).title },
  });
  assert.deepEqual(
    resolveFocus(w, { view: "document", documentId: "orbit-policy", page: 9 }),
    {
      focus: {
        view: "document",
        id: "orbit-policy",
        page: 3,
        label: "Orbit · Your benefits guide",
      },
    },
  );
  assert.ok("error" in resolveFocus(w, { view: "task", taskId: "other" }));
  assert.ok(
    "error" in resolveFocus(w, { view: "message", messageId: "m-elsewhere" }),
  );
  const messages = [
    { id: "m1", from: "HR", subject: "Your claim", preview: "", at: "" },
  ];
  assert.deepEqual(
    resolveFocus(w, { view: "message", messageId: "m1" }, messages),
    { focus: { view: "message", id: "m1", label: "Your claim" } },
  );
});
