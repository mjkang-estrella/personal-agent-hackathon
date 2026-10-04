import type { Task, Workspace } from "./types";

export const POLL_MS = 5 * 60_000;
// Longer than the 300s request lifetime and the 120s Kernel browser lifetime.
export const SUBMISSION_STALE_MS = 10 * 60_000;
export function isCurrentRun(w: Workspace, generation: string) {
  return !!w.background?.enabled && w.background.generation === generation;
}
export function staleSubmission(task: Task, now = Date.now()) {
  return (
    task.status === "submitting" &&
    (!task.submittingAt ||
      now - Date.parse(task.submittingAt) > SUBMISSION_STALE_MS)
  );
}
export function recoverSubmission(task: Task, submitted: boolean) {
  task.status = submitted ? "waiting" : "ready";
  task.browserUrl = undefined;
  task.browserSessionId = undefined;
  task.submittingAt = undefined;
  task.nextAction = submitted
    ? "Submission recovered. Waiting for HR review."
    : "Submission interrupted. Review the claim and approve a safe retry.";
  task.error = submitted
    ? undefined
    : "The previous attempt stopped. Your claim was not confirmed.";
}
export interface HRReply {
  id: string;
  threadId: string;
  at: string;
  text: string;
  status: "request" | "approved" | "other";
  quote: string;
  nextAction: string;
  missing: string[];
}
export function applyHRReply(t: Task, reply: HRReply): boolean {
  if (
    t.processedMessageIds?.includes(reply.id) ||
    !["waiting", "needs_info"].includes(t.status)
  )
    return false;
  if (
    !Number.isFinite(Date.parse(reply.at)) ||
    !reply.text.includes(reply.quote) ||
    reply.quote.length < 8
  )
    return false;
  t.processedMessageIds = [...(t.processedMessageIds || []), reply.id];
  // An older in-flight classification cannot replace newer evidence.
  if (t.lastReplyAt && Date.parse(reply.at) <= Date.parse(t.lastReplyAt))
    return false;
  t.lastReplyAt = reply.at;
  t.lastReply = reply.text;
  t.mailMessageId = reply.id;
  t.mailThreadId = reply.threadId;
  t.nextAction = reply.nextAction;
  if (reply.status === "request") {
    t.status = "needs_info";
    t.missing = reply.missing.length
      ? reply.missing
      : ["HR requested more information."];
  } else if (reply.status === "approved") {
    t.status = "approved";
    t.missing = [];
    t.nextAction = "Approved by HR. Payment is still pending.";
  }
  return true;
}
