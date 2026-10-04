import { z } from "zod";
import { matchesApproval, updateDates, validEvidence } from "./domain";
import { draftPayload } from "./drafts";
import { acknowledgeOutbound } from "./scenarios";
import type {
  Activity,
  Contact,
  Evidence,
  InboxMessage,
  InboxSnapshot,
  MailMessage,
  Status,
  Task,
  Workspace,
} from "./types";

const evidence = z.object({
  documentId: z.string(),
  page: z.number().int().positive(),
  quote: z.string().min(8),
});
export const triageSchema = z.object({
  summary: z.string(),
  tasks: z
    .array(
      z.object({
        ref: z.string(),
        title: z.string(),
        description: z.string(),
        stage: z.enum(["before", "between", "after"]),
        category: z.enum([
          "money",
          "health",
          "retirement",
          "onboarding",
          "offboarding",
        ]),
        status: z.enum(["todo", "waiting", "needs_info", "approved", "done"]),
        deadline: z.iso.date().nullable(),
        missing: z.array(z.string()),
        nextAction: z.string(),
        change: z.string(),
        evidence: z.array(evidence).min(1),
        statusEvidence: evidence.nullable(),
      }),
    )
    .max(10),
  drafts: z
    .array(
      z.object({
        taskRef: z.string(),
        toAddress: z.string(),
        replyToMessageId: z.string().nullable(),
        subject: z.string(),
        body: z.string(),
        reason: z.string(),
        evidence: z.array(evidence).min(1),
        attachmentIds: z.array(z.string()),
      }),
    )
    .max(3),
  dateProposal: z
    .object({
      lastDay: z.iso.date(),
      startDay: z.iso.date(),
      reason: z.string(),
      evidence,
    })
    .nullable(),
});
export type TriageResult = z.infer<typeof triageSchema>;

const MAX_TASKS = 20;
const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
// Government-style identifiers and long account numbers never belong in a draft.
const SENSITIVE = /\b\d{3}-\d{2}-\d{4}\b|\d{9,}/;

function log(
  w: Workspace,
  title: string,
  detail: string,
  type: Activity["type"] = "agent",
) {
  w.activity.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    title,
    detail,
    type,
  });
  w.activity = w.activity.slice(0, 100);
}

export function allowedRecipients(w: Workspace): Contact[] {
  const found = new Map<string, Contact>();
  for (const c of w.scenario?.contacts || [])
    found.set(c.address.toLowerCase(), c);
  for (const m of w.mail || [])
    if (m.direction === "inbound")
      found.set(m.from.address.toLowerCase(), m.from);
  const self = w.scenario?.self.address;
  if (self) found.delete(self.toLowerCase());
  return [...found.values()];
}

function pushHistory(task: Task, at: string, note: string, ev?: Evidence) {
  task.history = [
    ...(task.history || []),
    { at, status: task.status, note, evidence: ev },
  ].slice(-20);
}

/**
 * Applies a model triage only where it is grounded. Tasks need verified quotes;
 * closing or approving needs a quote from the new mail itself; drafts may only
 * address known contacts and attach existing, non-email documents.
 */
export function applyTriage(
  w: Workspace,
  result: TriageResult,
  messageIds: string[],
) {
  const at = w.scenario?.clock || new Date().toISOString();
  const triaged = (w.mail || []).filter((m) => messageIds.includes(m.id));
  const fresh = new Set(
    triaged.flatMap((m) => [m.documentId, ...m.attachmentIds]),
  );
  const verified = (e: Evidence) => validEvidence(e, w);
  const isFresh = (e: Evidence | null): e is Evidence =>
    !!e && verified(e) && fresh.has(e.documentId);
  const refs = new Map<string, string>(w.tasks.map((t) => [t.id, t.id]));
  const touched = new Set<string>();
  let rejected = 0;

  for (const update of result.tasks) {
    const evidence = update.evidence.filter(verified);
    if (!evidence.length) {
      rejected++;
      continue;
    }
    const existing =
      w.tasks.find((t) => t.id === update.ref) ||
      w.tasks.find((t) => normalize(t.title) === normalize(update.title));
    if (existing && (existing.claim || existing.status === "submitting")) {
      rejected++;
      continue;
    }
    let status: Status = update.status;
    // Closing or approving needs proof in the new mail; otherwise nothing moves.
    if (
      (status === "done" || status === "approved") &&
      !isFresh(update.statusEvidence)
    )
      status = existing?.status ?? "todo";
    if (
      status === "approved" &&
      (existing?.category ?? update.category) !== "money"
    )
      status = existing?.status ?? "waiting";
    const statusEvidence = isFresh(update.statusEvidence)
      ? update.statusEvidence
      : evidence.find((e) => fresh.has(e.documentId)) || evidence[0];
    if (existing) {
      const before = existing.status;
      existing.status = status;
      existing.description = update.description || existing.description;
      existing.missing = update.missing;
      existing.nextAction = update.nextAction || existing.nextAction;
      if (update.deadline) {
        existing.deadline = update.deadline;
        existing.deadlineRule = "fixed";
      }
      const merged = [...existing.evidence];
      for (const e of evidence)
        if (
          !merged.some(
            (m) => m.documentId === e.documentId && m.quote === e.quote,
          )
        )
          merged.push(e);
      existing.evidence = merged.slice(-6);
      pushHistory(
        existing,
        at,
        update.change || (before === status ? "Updated" : "Status changed"),
        statusEvidence,
      );
      refs.set(update.ref, existing.id);
      touched.add(existing.id);
    } else {
      if (w.tasks.length >= MAX_TASKS) {
        rejected++;
        continue;
      }
      const task: Task = {
        id: crypto.randomUUID(),
        title: update.title.slice(0, 120),
        description: update.description,
        stage: update.stage,
        category: update.category,
        status,
        deadline: update.deadline,
        deadlineRule: update.deadline ? "fixed" : "unknown",
        amount: null,
        evidence: evidence.slice(0, 6),
        missing: update.missing,
        nextAction: update.nextAction,
      };
      pushHistory(
        task,
        at,
        update.change || "Added to your plan",
        statusEvidence,
      );
      w.tasks.push(task);
      refs.set(update.ref, task.id);
      touched.add(task.id);
    }
  }

  const recipients = allowedRecipients(w);
  const mailDocs = new Set((w.mail || []).map((m) => m.documentId));
  const received = new Set(
    (w.mail || [])
      .filter((m) => m.direction === "inbound")
      .flatMap((m) => m.attachmentIds),
  );
  let drafted = 0;
  for (const proposal of result.drafts) {
    const taskId = refs.get(proposal.taskRef);
    const task = w.tasks.find((t) => t.id === taskId);
    const to = recipients.find((c) => same(c.address, proposal.toAddress));
    const ev = proposal.evidence.filter(verified);
    const subject = proposal.subject.trim().slice(0, 200);
    const body = proposal.body.trim().slice(0, 4000);
    if (
      !task ||
      !to ||
      !ev.length ||
      !subject ||
      !body ||
      SENSITIVE.test(body) ||
      ["done", "approved"].includes(task.status)
    ) {
      rejected++;
      continue;
    }
    w.drafts ??= [];
    const current = w.drafts.find(
      (d) => d.taskId === task.id && d.status === "draft",
    );
    // Never overwrite words the user has already edited.
    if (current?.editedAt) continue;
    if (current) current.status = "superseded";
    const replyTo = (w.mail || []).find(
      (m) => m.id === proposal.replyToMessageId,
    );
    w.drafts.push({
      id: crypto.randomUUID(),
      taskId: task.id,
      to: [to],
      subject,
      body,
      inReplyTo: replyTo?.id || null,
      attachmentIds: [...new Set(proposal.attachmentIds)].filter(
        (id) =>
          !mailDocs.has(id) &&
          w.documents.some(
            (d) =>
              d.id === id && (d.employer === "personal" || received.has(id)),
          ),
      ),
      reason: proposal.reason.slice(0, 400),
      evidence: ev.slice(0, 3),
      status: "draft",
      createdAt: new Date().toISOString(),
    });
    drafted++;
  }

  const p = result.dateProposal;
  if (
    p &&
    isFresh(p.evidence) &&
    p.startDay > p.lastDay &&
    (p.startDay !== w.profile.startDay || p.lastDay !== w.profile.lastDay)
  )
    w.dateProposal = {
      lastDay: p.lastDay,
      startDay: p.startDay,
      reason: p.reason.slice(0, 300),
      evidence: p.evidence,
    };

  for (const m of triaged) {
    m.triaged = true;
    const docs = [m.documentId, ...m.attachmentIds];
    for (const t of w.tasks)
      if (
        touched.has(t.id) &&
        t.evidence.some((e) => docs.includes(e.documentId)) &&
        !m.taskIds.includes(t.id)
      )
        m.taskIds.push(t.id);
  }
  if (result.summary) w.analysisSummary = result.summary.slice(0, 400);
  w.analyzedAt = new Date().toISOString();
  return { tasks: touched.size, drafts: drafted, rejected };
}

function findDraft(w: Workspace, draftId: string) {
  const d = w.drafts?.find((x) => x.id === draftId);
  if (!d) throw new Error("This draft is no longer available.");
  return d;
}

export function saveDraft(
  w: Workspace,
  draftId: string,
  subject: string,
  body: string,
) {
  const d = findDraft(w, draftId);
  if (d.status !== "draft")
    throw new Error("This draft was already sent or dismissed.");
  if (!subject.trim() || !body.trim())
    throw new Error("Please add a subject and message before saving.");
  if (SENSITIVE.test(body))
    throw new Error(
      "Please remove account or identification numbers. Use the secure portal for those.",
    );
  d.subject = subject.trim().slice(0, 200);
  d.body = body.trim().slice(0, 4000);
  d.editedAt = new Date().toISOString();
  return d;
}

export function dismissDraft(w: Workspace, draftId: string) {
  const d = findDraft(w, draftId);
  if (d.status !== "draft")
    throw new Error("This draft was already sent or dismissed.");
  d.status = "dismissed";
  log(w, "You set a draft aside", d.subject, "user");
}

/** Records an approved draft as sent. Retrying a sent draft never duplicates it. */
export function sendDraft(w: Workspace, draftId: string, approval: string) {
  const d = findDraft(w, draftId);
  if (d.status === "sent") return { duplicate: true, advanced: false };
  if (d.status !== "draft")
    throw new Error("This draft was dismissed. Ask your agent for a new one.");
  if (!w.scenario)
    throw new Error(
      "This draft can’t be sent from JobSwitch yet. Copy it into your email app.",
    );
  if (!matchesApproval(approval, draftPayload(w, d)))
    throw new Error("Your draft changed. Review it again before approving.");
  const task = w.tasks.find((t) => t.id === d.taskId);
  if (!task) throw new Error("Task not found.");
  const parent = (w.mail || []).find((m) => m.id === d.inReplyTo);
  const at = new Date(Date.parse(w.scenario.clock) + 5 * 60_000).toISOString();
  const id = `sent-${d.id}`;
  const text = [
    `From: ${w.scenario.self.name} <${w.scenario.self.address}>`,
    `To: ${d.to.map((c) => `${c.name} <${c.address}>`).join(", ")}`,
    `Date: ${at}`,
    `Subject: ${d.subject}`,
    `Attachments: ${d.attachmentIds.join(", ") || "(none)"}`,
    "",
    d.body,
  ].join("\n");
  w.documents.push({
    id,
    name: `Sent · ${d.subject}`,
    employer: "personal",
    kind: "other",
    pages: [text],
    addedAt: at,
  });
  const sent: MailMessage = {
    id,
    threadId: parent?.threadId || id,
    direction: "outbound",
    from: w.scenario.self,
    to: d.to,
    subject: d.subject,
    body: d.body,
    at,
    inReplyTo: parent?.id || null,
    attachmentIds: d.attachmentIds,
    documentId: id,
    taskIds: [task.id],
    triaged: true,
    draftId: d.id,
  };
  (w.mail ??= []).push(sent);
  w.scenario.clock = at;
  d.status = "sent";
  d.sentAt = at;
  d.sentMessageId = id;
  if (["todo", "needs_info"].includes(task.status)) task.status = "waiting";
  task.nextAction = `Waiting for ${d.to[0].name} to reply.`;
  pushHistory(task, at, `You approved and sent “${d.subject}”`);
  const advanced = acknowledgeOutbound(w, sent);
  log(
    w,
    "You approved and sent an email",
    `To ${d.to.map((c) => c.name).join(", ")} · ${d.subject}. Simulated delivery inside this practice case.`,
    "user",
  );
  return { duplicate: false, advanced };
}

export function resolveDateProposal(w: Workspace, apply: boolean) {
  const p = w.dateProposal;
  if (!p) throw new Error("This date suggestion is no longer available.");
  if (apply) {
    if (w.tasks.some((t) => t.status === "submitting"))
      throw new Error("Please wait for the current submission to finish.");
    updateDates(w, p.lastDay, p.startDay);
    log(
      w,
      "You updated your transition dates",
      `Last day ${p.lastDay}, first day ${p.startDay}. Date-based deadlines need review.`,
      "user",
    );
  } else log(w, "You kept your current dates", p.reason, "user");
  delete w.dateProposal;
}

const label = (c: Contact) => c.name;
export function scenarioInbox(w: Workspace, messageId?: string): InboxSnapshot {
  const messages: InboxMessage[] = [...(w.mail || [])]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map((m) => {
      const task = w.tasks.find((t) => m.taskIds.includes(t.id));
      return {
        id: m.id,
        from: label(m.from),
        to: m.to.map(label).join(", "),
        subject: m.subject,
        preview: m.body.split("\n---\n")[0].replace(/\s+/g, " ").slice(0, 160),
        at: m.at,
        direction: m.direction,
        taskId: task?.id,
        taskTitle: task?.title,
        attachments: m.attachmentIds.map((id) => ({
          id,
          name: w.documents.find((d) => d.id === id)?.name || id,
        })),
        body: m.body,
      };
    });
  return {
    provider: "scenario",
    connected: true,
    limited: false,
    messages: messageId ? [] : messages.map(({ body: _, ...m }) => m),
    message: messageId ? messages.find((m) => m.id === messageId) : undefined,
  };
}
