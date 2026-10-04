import test from "node:test";
import assert from "node:assert/strict";
import { nextTask } from "./presentation";
import { makeWorkspace } from "./fixtures";
import type { Task } from "./types";
const base = makeWorkspace().tasks[0];
const task = (
  id: string,
  status: Task["status"],
  deadline: string | null,
): Task => ({ ...base, id, status, deadline });
test("next step prioritizes required input and approvals over ordinary deadlines", () => {
  assert.equal(
    nextTask([
      task("todo", "todo", "2026-01-01"),
      task("ready", "ready", "2026-02-01"),
      task("input", "needs_info", null),
    ])?.id,
    "input",
  );
});
test("next step chooses earliest dated task without mutating the board", () => {
  const tasks = [
    task("undated", "todo", null),
    task("later", "todo", "2026-11-01"),
    task("earlier", "todo", "2026-10-01"),
  ];
  assert.equal(nextTask(tasks)?.id, "earlier");
  assert.equal(tasks[0].id, "undated");
});
test("waiting, submitting, approved and completed tasks are never suggested for a new action", () => {
  assert.equal(
    nextTask(
      ["waiting", "submitting", "approved", "done"].map((s, i) =>
        task(String(i), s as Task["status"], "2026-01-01"),
      ),
    ),
    undefined,
  );
  assert.equal(nextTask([]), undefined);
});
