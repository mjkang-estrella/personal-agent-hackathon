import { openDraft } from "./drafts";
import type { Task, Workspace } from "./types";

export type AgentStep =
  | { kind: "analyze" }
  | { kind: "prepare"; taskId: string }
  | { kind: "sync" }
  | { kind: "triage" };

// This allowlist deliberately contains no submission, email, or completion action.
// Triage may write drafts, but only an approved draft is ever sent.
export function nextAgentStep(
  w: Workspace,
  input: string,
  now = Date.now(),
): AgentStep | null {
  if (w.agent?.enabled === false || w.agent?.error) return null;
  if (w.tasks.some((t) => t.status === "submitting")) return null;
  // Practice cases are driven by their mail. Policy re-analysis would replace
  // mail-grounded tasks, and the portal claim flow belongs to the main demo.
  if (w.scenario)
    return w.mail?.some((m) => m.direction === "inbound" && !m.triaged)
      ? { kind: "triage" }
      : null;
  if (
    w.documents.some((d) => d.kind === "policy") &&
    w.agent?.analyzedInput !== input
  )
    return { kind: "analyze" };
  const task = w.tasks.find(
    (t) =>
      t.category === "money" &&
      t.status === "todo" &&
      w.agent?.preparedInputs?.[t.id] !== input,
  );
  if (
    task &&
    w.documents.some((d) => d.kind === "receipt") &&
    w.documents.some((d) => d.kind === "policy")
  )
    return { kind: "prepare", taskId: task.id };
  if (
    !w.background?.enabled &&
    w.inbox &&
    w.hrInbox &&
    w.tasks.some((t) => ["waiting", "needs_info"].includes(t.status)) &&
    now - Date.parse(w.agent?.lastSyncedAt || "1970-01-01") >= 20000
  )
    return { kind: "sync" };
  return null;
}

export function reviewKind(
  task: Task,
  w: Workspace,
): "claim" | "reply" | "draft" | "input" | null {
  if (task.status === "ready" && task.claim) return "claim";
  if (openDraft(w, task.id)) return "draft";
  if (
    task.status === "needs_info" &&
    task.claim &&
    task.mailMessageId &&
    w.demo &&
    w.hrInbox &&
    w.documents.some((d) => d.kind === "certificate")
  )
    return "reply";
  if (
    task.status === "needs_info" ||
    (task.status === "todo" && task.missing.length > 0)
  )
    return "input";
  return null;
}

export function queueAgent(w: Workspace) {
  w.agent = {
    ...w.agent,
    enabled: w.agent?.enabled ?? true,
    pending: true,
    error: undefined,
  };
}
