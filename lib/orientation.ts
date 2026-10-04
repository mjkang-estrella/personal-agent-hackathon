import { reviewKind } from "./automation";
import { openDraft } from "./drafts";
import type { Evidence, Task, Workspace } from "./types";

export type OrientationAction =
  | { kind: "task"; id: string; label: string }
  | { kind: "upload" | "settings" | "resume" | "plan"; label: string };
export interface OrientationStep {
  title: string;
  body: string;
  reason: string;
  action?: OrientationAction;
  ask?: string;
  evidence?: Evidence & { name: string };
}
export interface Orientation {
  primary: OrientationStep;
  later: OrientationStep[];
  status: string;
  prompts: { label: string; prompt: string }[];
  placeholder: string;
}
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
function source(w: Workspace, t: Task): OrientationStep["evidence"] {
  for (const e of t.evidence) {
    const d = w.documents.find((d) => d.id === e.documentId);
    const page = d?.pages[e.page - 1];
    if (page && e.quote.trim() && normalize(page).includes(normalize(e.quote)))
      return { ...e, name: d!.name };
  }
}
function taskStep(w: Workspace, t: Task): OrientationStep {
  const kind = reviewKind(t, w);
  const evidence = source(w, t);
  const base = {
    title: t.title,
    body: t.nextAction,
    reason: "On your plan",
    action: { kind: "task" as const, id: t.id, label: "Open task" },
    ask: `Explain “${t.title}” using my documents. What is confirmed, what is still unknown, and what does this step need? Do not make a personal choice or send anything.`,
    evidence,
  };
  if (kind === "claim" && t.claim)
    return {
      ...base,
      title: `Your ${money(t.claim.amount)} claim is ready to review.`,
      reason: "Prepared for your approval",
      body: `${t.claim.course}. Review the exact claim and its evidence before you decide whether to submit it. Nothing has been sent by preparing this claim.`,
      action: { ...base.action, label: "Review claim" },
    };
  if (kind === "draft") {
    const d = openDraft(w, t.id)!;
    return {
      ...base,
      title: "Your email draft is ready to review.",
      reason: "Prepared for your approval",
      body: `“${d.subject}” to ${d.to.map((c) => c.name || c.address).join(", ")}. Review the exact message and attachments before anything is sent.`,
      action: { ...base.action, label: "Review email" },
    };
  }
  if (kind === "reply")
    return {
      ...base,
      title: "Your reply to HR is ready to review.",
      reason: "HR requested more information",
      body: "Check the prepared reply and its attachment. Sending still needs your approval.",
      action: { ...base.action, label: "Review reply" },
    };
  if (kind === "decision" && t.decision)
    return {
      ...base,
      title: t.decision.question,
      reason: "A choice only you can make",
      body: `See ${t.decision.options.length} options and the supporting documents. JobSwitch does not choose an option for you.${!t.deadline ? " No deadline is recorded for this choice." : ""}`,
      action: { ...base.action, label: "See the options" },
    };
  if (kind === "input")
    return {
      ...base,
      reason:
        t.status === "needs_info" && t.mailMessageId
          ? "HR replied · information needed"
          : "Information still needed",
      body: `${t.missing.length ? `Still unconfirmed: ${t.missing[0]}. ` : ""}${t.nextAction}`,
      action: {
        ...base.action,
        label: t.mailMessageId ? "Read HR’s request" : "See what’s missing",
      },
    };
  if (t.status === "submitting")
    return {
      ...base,
      reason: "Submission in progress",
      body: "The approved submission is in progress. Wait for confirmation before taking another action.",
      action: { ...base.action, label: "View progress" },
    };
  if (t.status === "waiting")
    return {
      ...base,
      reason: "Waiting for a reply",
      body: `This step is waiting for a reply. ${t.nextAction}`,
      action: { ...base.action, label: "View status" },
    };
  if (t.status === "approved")
    return {
      ...base,
      reason: "Approved · not paid",
      body: "Approval is recorded. Payment has not been confirmed.",
      action: { ...base.action, label: "View approval" },
    };
  return base;
}
function priority(w: Workspace, t: Task) {
  const kind = reviewKind(t, w);
  if (["claim", "reply", "draft"].includes(kind || "")) return 0;
  if (t.status === "submitting") return 1;
  if (kind === "input" && t.status === "needs_info" && t.mailMessageId)
    return 2;
  if (kind === "input") return 3;
  if (kind === "decision") return 4;
  if (t.status === "todo") return 5;
  return 6;
}
/** A truthful arrival briefing from saved state; no new eligibility or advice. */
export function orientation(
  w: Workspace,
  {
    busy = "",
    transportError = false,
  }: { busy?: string; transportError?: boolean } = {},
): Orientation {
  const error = !!w.agent?.error || transportError;
  const paused = w.agent?.enabled === false;
  const working = busy === "advance" || w.agent?.pending;
  const status = error
    ? "Preparation stopped. Your saved progress is safe."
    : paused
      ? "Automatic preparation is paused. You can still review prepared work."
      : working
        ? w.agent?.phase === "prepare"
          ? "I’m checking the documents and preparing work for your review."
          : w.agent?.phase === "triage"
            ? "I’m reading new mail and preparing next steps."
            : w.agent?.phase === "sync"
              ? "I’m checking for HR replies."
              : "I’m reading your documents and updating your plan."
        : "Prepared work stays here until you review it. Nothing is sent without approval.";
  const tasks = w.tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      const rank = priority(w, a) - priority(w, b);
      if (rank) return rank;
      // Only use an existing dated, sourced task to break ties. Never infer urgency.
      const ad = a.deadline && source(w, a) ? a.deadline : "9999";
      const bd = b.deadline && source(w, b) ? b.deadline : "9999";
      return ad.localeCompare(bd);
    });
  const steps = tasks.map((t) => taskStep(w, t));
  let primary = steps[0];
  let later = steps.slice(1, 3);
  const override = (step: OrientationStep) => {
    primary = step;
    later = steps.slice(0, 2);
  };
  if (error)
    override({
      title: "Let’s get your agent going again.",
      reason: "Preparation stopped",
      body: "Your saved progress is safe. Retry to continue preparing your plan. You can still review work that is already ready.",
      action: { kind: "resume", label: "Retry preparation" },
    });
  else if (paused)
    override({
      title: "Your agent is paused.",
      reason: "You control when preparation runs",
      body: "Resume to continue reading documents and preparing next steps. Work already prepared is still available below.",
      action: { kind: "resume", label: "Resume agent" },
    });
  else if (!w.documents.length && !w.tasks.length)
    override({
      title: "Start with your benefits handbook.",
      reason: "Your first step",
      body: "Add an employer handbook so I can build your transition plan from its policies. Personal documents require sign-in; you can also explore a fictional demo in workspace settings.",
      action: { kind: "upload", label: "Add a handbook" },
      ask: "What documents do I need to start planning my job transition?",
    });
  else if (working && (!primary || priority(w, tasks[0]) >= 3))
    override({
      title: "I’m preparing your next steps.",
      reason: "No action needed while I work",
      body: "I’m using your documents and dates to update your plan. Anything that needs you will appear here when it’s ready.",
    });
  else if (!primary && !w.tasks.length && w.documents.length && !w.analyzedAt)
    override({
      title: "Let’s prepare your plan.",
      reason: "Documents added",
      body: "Your documents are here, but a plan has not been prepared yet. Start preparation to find the next steps.",
      action: { kind: "resume", label: "Prepare my plan" },
    });
  else if (!primary)
    override({
      title: "Nothing is waiting for your review.",
      reason: "Your current plan is clear",
      body: "You can check your plan or add new documents when your transition changes.",
      action: { kind: "plan", label: "See your plan" },
    });
  const prompts = primary.ask
    ? [{ label: "Ask about this step", prompt: primary.ask }]
    : [];
  if (w.documents.length)
    prompts.push({
      label: "Explain my source documents",
      prompt:
        "Summarize the employer documents in my workspace. Cite exact pages and distinguish unknowns from confirmed facts.",
    });
  else
    prompts.push({
      label: "Which documents do I need?",
      prompt: "What documents do I need to start planning my job transition?",
    });
  return {
    primary,
    later,
    status,
    prompts: prompts.slice(0, 2),
    placeholder:
      primary.action?.kind === "task"
        ? "Ask about this step, or anything else…"
        : "Ask about your next step…",
  };
}
