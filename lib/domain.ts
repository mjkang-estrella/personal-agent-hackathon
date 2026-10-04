import type { Workspace, Task, Evidence, Document } from "./types";
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
// PDF extraction wraps lines mid-sentence, so compare with whitespace collapsed.
// Every word and character must still appear verbatim and in order.
const squash = (s: string) => s.replace(/\s+/g, " ").trim();
export function validEvidence(e: Evidence, w: Workspace) {
  const page = w.documents.find((d) => d.id === e.documentId)?.pages[
    e.page - 1
  ];
  const quote = squash(e.quote);
  return !!page && quote.length >= 8 && squash(page).includes(quote);
}
export function updateDates(w: Workspace, lastDay: string, startDay: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(lastDay) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDay) ||
    !Number.isFinite(Date.parse(lastDay)) ||
    !Number.isFinite(Date.parse(startDay)) ||
    new Date(lastDay).toISOString().slice(0, 10) !== lastDay ||
    new Date(startDay).toISOString().slice(0, 10) !== startDay
  )
    throw new Error("Enter valid dates.");
  if (startDay <= lastDay)
    throw new Error("The new start date must follow your last day.");
  w.profile.lastDay = lastDay;
  w.profile.startDay = startDay;
  for (const t of w.tasks) {
    if (t.deadlineRule !== "fixed" || t.category === "health")
      t.dateReview = true;
    if (t.deadlineRule === "departure") t.deadline = lastDay;
    if (t.deadlineRule === "start") t.deadline = startDay;
    if (t.deadlineRule === "enrollment") t.deadline = addDays(startDay, 29);
    if (t.status === "ready") {
      t.status = "todo";
      delete t.claim;
      t.nextAction = "Review again after your date change.";
    }
  }
  w.analysisSummary =
    "Your dates changed. Linked deadlines are updated; reanalyze your documents to refresh coverage details and confirm affected tasks.";
  w.analyzedAt = new Date().toISOString();
  return w;
}
export function assertCanSubmit(task: Task) {
  if (task.status !== "ready" || !task.claim)
    throw new Error("Prepare and review this claim before approving it.");
  if (task.missing.length)
    throw new Error("Resolve the missing information before submission.");
}
export function progress(w: Workspace) {
  return w.tasks.filter((t) => ["approved", "done"].includes(t.status)).length;
}
export function matchesApproval(serialized: string, payload: unknown): boolean {
  const canonical = (value: unknown): string =>
    JSON.stringify(value, (_key, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(
            Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
          )
        : v,
    );
  try {
    return canonical(JSON.parse(serialized)) === canonical(payload);
  } catch {
    return false;
  }
}

export function followupText(task: Task, employee: string) {
  return `Hello Northstar People Team,\n\nPlease find my completion certificate for ${task.claim?.course} attached, as requested for my $${task.claim?.amount} reimbursement claim.\n\nThank you,\n${employee}`;
}
export function replyPayload(w: Workspace, task: Task, certificate: Document) {
  return {
    to: w.hrInbox,
    inReplyTo: task.mailMessageId,
    text: followupText(task, w.profile.name),
    attachment: {
      id: certificate.id,
      filename: "completion-certificate.txt",
      text: certificate.pages.join("\n"),
    },
  };
}
