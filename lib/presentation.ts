import type { Task } from "./types";

/** Surface actionable work first; waiting/submitting/resolved tasks need no new action. */
export function nextTask(tasks: Task[]): Task | undefined {
  const priority: Record<string, number> = { needs_info: 0, ready: 1, todo: 2 };
  return tasks
    .filter((task) => task.status in priority)
    .slice()
    .sort(
      (a, b) =>
        priority[a.status] - priority[b.status] ||
        (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31"),
    )[0];
}
