import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWorkspace } from "./fixtures";
import { isReviewExample, loadReviewExamples } from "./review-examples";
import { chooseOption, validEvidence } from "./domain";
import { reviewKind } from "./automation";

test("four ready-to-use examples have exact policy evidence and actionable choices", () => {
  const w = makeWorkspace();
  const examples = w.tasks.filter(isReviewExample);
  assert.equal(examples.length, 4);
  for (const task of examples) {
    assert.equal(reviewKind(task, w), "decision");
    assert.ok(task.evidence.every((e) => validEvidence(e, w)));
    assert.ok(task.decision!.options.length >= 2);
    for (const option of task.decision!.options) {
      chooseOption(w, task.id, option.id);
      assert.equal(task.nextAction, option.nextStep);
      assert.equal(task.status, "todo");
      assert.equal(reviewKind(task, w), "input");
    }
  }
  assert.equal(w.drafts, undefined);
  assert.ok(w.tasks.every((t) => !t.claim));
});

test("existing demos can load and replay examples without duplicating or changing other work", () => {
  const w = makeWorkspace();
  w.tasks = w.tasks.filter((t) => !isReviewExample(t));
  chooseOption(w, "rollover", "stay");
  const others = structuredClone(w.tasks);
  const documents = structuredClone(w.documents);
  loadReviewExamples(w);
  const t = w.tasks.find(isReviewExample)!;
  chooseOption(w, t.id, t.decision!.options[0].id);
  loadReviewExamples(w);
  loadReviewExamples(w);
  assert.deepEqual(
    w.tasks.filter((t) => !isReviewExample(t)),
    others,
  );
  assert.deepEqual(w.documents, documents);
  assert.equal(w.tasks.filter(isReviewExample).length, 4);
  assert.ok(
    w.tasks
      .filter(isReviewExample)
      .every((t) => reviewKind(t, w) === "decision"),
  );
});

test("personal, staged, and missing-evidence workspaces cannot load examples", () => {
  for (const kind of ["personal", "scenario", "evidence"]) {
    const w = makeWorkspace();
    if (kind === "personal") w.demo = false;
    if (kind === "scenario") w.scenario = { id: "test" } as typeof w.scenario;
    if (kind === "evidence") w.documents = [];
    const before = structuredClone(w);
    assert.throws(() => loadReviewExamples(w));
    assert.deepEqual(w, before);
  }
});
