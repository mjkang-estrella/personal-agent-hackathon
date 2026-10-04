"use client";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  FlaskConical,
  History,
  LoaderCircle,
  Mail,
  Paperclip,
  PenLine,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import manifest from "@/demo-data/manifest.json";
import { draftPayload } from "@/lib/drafts";
import type {
  Contact,
  Draft,
  Evidence,
  Status,
  Task,
  Workspace,
} from "@/lib/types";

type Act = (
  action: string,
  extra?: Record<string, unknown>,
  message?: string,
) => Promise<Workspace | undefined>;

export const practiceCases = manifest.scenarios.map(
  ({ id, title, summary }) => ({ id, title, summary }),
);

// Case contacts are stored as "Person | Team".
export const contactName = (c: Contact) => c.name.replace(" | ", " · ");
const firstName = (c: Contact) => c.name.split(" | ")[0];

// Practice cases are set in Pacific time. Show their dates as the people in the
// case see them, wherever the viewer is.
export const caseTime = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    ...(withTime && { hour: "numeric", minute: "2-digit" }),
  });
const planDay = (day: string) =>
  new Date(day + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function Busy({ busy }: { busy: boolean }) {
  return busy ? <LoaderCircle size={15} className="spin" /> : null;
}

function agentReadingMail(w: Workspace) {
  return (
    !!w.mail?.some((m) => m.direction === "inbound" && !m.triaged) &&
    w.agent?.enabled !== false &&
    !w.agent?.error
  );
}

export function PracticeStrip({
  w,
  busy,
  act,
  openTask,
  chooseCase,
}: {
  w: Workspace;
  busy: string;
  act: Act;
  openTask: (id: string) => void;
  chooseCase: () => void;
}) {
  const s = w.scenario!;
  const done = s.released >= s.total;
  const waiting = s.waitingFor;
  const reading = agentReadingMail(w);
  const draft =
    waiting &&
    w.drafts?.find(
      (d) =>
        d.status === "draft" &&
        d.to.some(
          (c) => c.address.toLowerCase() === waiting.address.toLowerCase(),
        ),
    );
  const isOpen = (t?: Task) => !!t && !["done", "approved"].includes(t.status);
  // Offer a draft for the task the awaited person last wrote about.
  const draftTask =
    waiting && !draft
      ? [...(w.mail || [])]
          .reverse()
          .filter(
            (m) =>
              m.direction === "inbound" &&
              m.from.address.toLowerCase() === waiting.address.toLowerCase(),
          )
          .flatMap((m) => m.taskIds)
          .map((id) => w.tasks.find((t) => t.id === id))
          .find(isOpen) || w.tasks.find(isOpen)
      : undefined;
  return (
    <section className="practice-strip" aria-label="Practice case">
      <div className="practice-copy">
        <span className="practice-eyebrow">
          <FlaskConical size={14} aria-hidden="true" /> PRACTICE CASE · STEP{" "}
          {Math.min(s.released, s.total)} OF {s.total}
        </span>
        <h2>{s.title}</h2>
        <p>{s.summary}</p>
        <ol
          className="practice-progress"
          aria-label={`${s.released} of ${s.total} steps reached`}
        >
          {Array.from({ length: s.total }, (_, i) => (
            <li key={i} className={i < s.released ? "reached" : ""} />
          ))}
        </ol>
        {s.checkpoint && (
          <details className="practice-checkpoint">
            <summary>What a careful agent does at this step</summary>
            <p>
              <strong>Expected</strong> {s.checkpoint.expected}
            </p>
            <p>
              <strong>Never</strong> {s.checkpoint.mustNot}
            </p>
          </details>
        )}
      </div>
      <div className="practice-next">
        <small>DATE IN THIS CASE</small>
        <strong className="practice-clock">
          <CalendarClock size={17} aria-hidden="true" />
          {caseTime(s.clock)}
        </strong>
        {done ? (
          <>
            <p>
              <CheckCircle2 size={16} aria-hidden="true" /> Every email in this
              case has arrived. Check how your plan ended up.
            </p>
            <button className="secondary" onClick={chooseCase}>
              Try another case <ArrowRight size={15} />
            </button>
          </>
        ) : waiting ? (
          <>
            <p>
              <span>
                The case continues after you approve an email to{" "}
                <strong>{contactName(waiting)}</strong>
                {s.waitingAttachments
                  ? ` with ${s.waitingAttachments.join(", ")} attached`
                  : ""}
                .
              </span>
            </p>
            {draft ? (
              <button
                className="primary"
                onClick={() => openTask(draft.taskId)}
              >
                <PenLine size={16} /> Review the draft
              </button>
            ) : !reading && draftTask ? (
              <button
                className="primary"
                disabled={!!busy}
                onClick={async () => {
                  const next = await act(
                    "draft_request",
                    { taskId: draftTask.id, to: waiting.address },
                    "Your agent drafted an email. Review it before sending.",
                  );
                  if (next) openTask(draftTask.id);
                }}
              >
                <Busy busy={busy === "draft_request"} />
                <PenLine size={16} /> Draft an email to {firstName(waiting)}
              </button>
            ) : (
              <p className="practice-hint">
                {reading
                  ? "Your agent is reading the latest email first."
                  : `Open the task this belongs to and choose “Draft an email” for ${firstName(waiting)}.`}
              </p>
            )}
          </>
        ) : (
          <>
            <p aria-live="polite">
              {reading
                ? "Your agent is reading the latest email."
                : "Ready for the next email when you are."}
            </p>
            <button
              className="primary"
              disabled={!!busy || reading}
              onClick={() =>
                act(
                  "scenario_next",
                  {},
                  "A new email arrived. Your agent is reading it.",
                )
              }
            >
              <Busy busy={busy === "scenario_next"} />
              <Mail size={16} /> Deliver the next email
            </button>
          </>
        )}
        <span className="practice-note">
          <ShieldCheck size={14} aria-hidden="true" /> Fictional people. Email
          stays inside JobSwitch.
        </span>
      </div>
    </section>
  );
}

export function DateProposalNotice({
  w,
  busy,
  act,
  viewEvidence,
}: {
  w: Workspace;
  busy: string;
  act: Act;
  viewEvidence: (e: Evidence) => void;
}) {
  const p = w.dateProposal!;
  const changes = [
    p.lastDay !== w.profile.lastDay &&
      `Last day ${planDay(w.profile.lastDay)} → ${planDay(p.lastDay)}`,
    p.startDay !== w.profile.startDay &&
      `First day ${planDay(w.profile.startDay)} → ${planDay(p.startDay)}`,
  ].filter(Boolean);
  const doc = w.documents.find((d) => d.id === p.evidence.documentId);
  return (
    <section className="date-proposal" aria-label="Suggested date change">
      <span className="date-proposal-icon" aria-hidden="true">
        <CalendarClock size={20} />
      </span>
      <div className="date-proposal-copy">
        <small>YOUR AGENT NOTICED A DATE CHANGE</small>
        <strong>{changes.join(" · ")}</strong>
        <p>{p.reason}</p>
        <button className="quote-link" onClick={() => viewEvidence(p.evidence)}>
          “{p.evidence.quote}”
          <span>
            <FileText size={13} aria-hidden="true" /> {doc?.name || "Source"}
          </span>
        </button>
      </div>
      <div className="date-proposal-actions">
        <button
          className="primary"
          disabled={!!busy}
          onClick={() =>
            act(
              "date_proposal",
              { apply: true },
              "Dates updated. Date-based deadlines are flagged for review.",
            )
          }
        >
          <Busy busy={busy === "date_proposal"} /> Update my dates
        </button>
        <button
          className="secondary"
          disabled={!!busy}
          onClick={() =>
            act("date_proposal", { apply: false }, "Kept your current dates.")
          }
        >
          Keep current dates
        </button>
      </div>
    </section>
  );
}

export function DraftReview({
  w,
  draft,
  busy,
  act,
  viewEvidence,
}: {
  w: Workspace;
  draft: Draft;
  busy: string;
  act: Act;
  viewEvidence: (e: Evidence) => void;
}) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const edited = subject.trim() !== draft.subject || body.trim() !== draft.body;
  const empty = !subject.trim() || !body.trim();
  const parent = w.mail?.find((m) => m.id === draft.inReplyTo);
  const send = () =>
    act(
      "draft_send",
      {
        draftId: draft.id,
        subject,
        body,
        // The approval covers the email exactly as shown, including unsaved edits.
        approval: JSON.stringify(
          draftPayload(w, {
            ...draft,
            subject: subject.trim(),
            body: body.trim(),
          }),
        ),
      },
      w.scenario?.waitingFor
        ? "Sent inside the practice case. Deliver the next email to see the reply."
        : "Sent inside the practice case. Your agent will watch for a reply.",
    );
  return (
    <section className="detail-section draft-review" aria-label="Email draft">
      <h3>
        <PenLine size={17} />
        {parent ? "Your agent drafted a reply" : "Your agent drafted an email"}
        {draft.editedAt && <span className="draft-tag">Edited by you</span>}
      </h3>
      <p className="draft-reason">
        <Sparkles size={15} aria-hidden="true" />
        {draft.reason}
      </p>
      <div className="draft-paper">
        <div className="draft-line">
          <small>TO</small>
          <span>
            {draft.to.map(contactName).join(", ")}
            <em>{draft.to.map((c) => c.address).join(", ")}</em>
          </span>
        </div>
        {parent && (
          <div className="draft-line">
            <small>REPLY TO</small>
            <span>{parent.subject}</span>
          </div>
        )}
        <label className="draft-line">
          <small>SUBJECT</small>
          <input
            value={subject}
            maxLength={200}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <textarea
          aria-label="Email message"
          value={body}
          maxLength={4000}
          rows={9}
          onChange={(e) => setBody(e.target.value)}
        />
        {draft.attachmentIds.length > 0 && (
          <div className="draft-attachments">
            <small>ATTACHED</small>
            {draft.attachmentIds.map((id) => (
              <button
                key={id}
                type="button"
                className="text-button"
                onClick={() =>
                  viewEvidence({ documentId: id, page: 1, quote: "" })
                }
              >
                <Paperclip size={14} aria-hidden="true" />
                {w.documents.find((d) => d.id === id)?.name || id}
              </button>
            ))}
          </div>
        )}
      </div>
      {draft.evidence.map((e, i) => (
        <button key={i} className="quote-link" onClick={() => viewEvidence(e)}>
          “{e.quote}”
          <span>
            <FileText size={13} aria-hidden="true" />
            {w.documents.find((d) => d.id === e.documentId)?.name || "Source"} ·
            p. {e.page}
          </span>
        </button>
      ))}
      <div className="draft-actions">
        <button className="primary" disabled={!!busy || empty} onClick={send}>
          <Busy busy={busy === "draft_send"} />
          <Send size={16} />{" "}
          {edited ? "Approve edited email & send" : "Approve & send"}
        </button>
        {edited && (
          <button
            className="secondary"
            disabled={!!busy || empty}
            onClick={() =>
              act(
                "draft_save",
                { draftId: draft.id, subject, body },
                "Edits saved. Your agent won’t overwrite your words.",
              )
            }
          >
            Save edits
          </button>
        )}
        <button
          className="text-button"
          disabled={!!busy}
          onClick={() =>
            act(
              "draft_dismiss",
              { draftId: draft.id },
              "Draft set aside. You can ask for a new one anytime.",
            )
          }
        >
          <X size={15} /> Not now
        </button>
      </div>
      <p className="draft-safety">
        <ShieldCheck size={14} aria-hidden="true" />
        Approving sends exactly this email to{" "}
        {draft.to.map(firstName).join(", ")}. In a practice case, delivery is
        simulated.
      </p>
    </section>
  );
}

export function RequestDraft({
  task,
  busy,
  act,
}: {
  task: Task;
  busy: string;
  act: Act;
}) {
  return (
    <section className="detail-section">
      <h3>
        <Mail size={17} /> Need to email someone about this?
      </h3>
      <p className="muted">
        Your agent drafts it from the case documents. You review every word
        before anything is sent.
      </p>
      <button
        className="secondary"
        disabled={!!busy}
        onClick={() =>
          act(
            "draft_request",
            { taskId: task.id },
            "Your agent drafted an email. Review it before sending.",
          )
        }
      >
        <Busy busy={busy === "draft_request"} />
        <PenLine size={15} /> Draft an email
      </button>
    </section>
  );
}

export function TaskTimeline({
  w,
  task,
  badge,
  viewEvidence,
}: {
  w: Workspace;
  task: Task;
  badge: (status: Status) => ReactNode;
  viewEvidence: (e: Evidence) => void;
}) {
  const history = task.history || [];
  if (!history.length) return null;
  return (
    <section className="detail-section">
      <h3>
        <History size={17} /> How this task has changed
      </h3>
      <ol className="task-timeline">
        {[...history].reverse().map((h, i) => (
          <li key={i}>
            <div className="timeline-meta">
              <time dateTime={h.at}>
                {w.scenario ? caseTime(h.at) : planDay(h.at.slice(0, 10))}
              </time>
              {badge(h.status)}
            </div>
            <p>{h.note}</p>
            {h.evidence && (
              <button
                className="quote-link"
                onClick={() => viewEvidence(h.evidence!)}
              >
                “{h.evidence.quote}”
                <span>
                  <FileText size={13} aria-hidden="true" />
                  {w.documents.find((d) => d.id === h.evidence!.documentId)
                    ?.name || "Source"}
                </span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PracticeCases({
  current,
  busy,
  choose,
}: {
  current?: string;
  busy: string;
  choose: (id: string, title: string) => void;
}) {
  return (
    <section
      className="settings-card practice-cases"
      aria-labelledby="practice-cases-title"
    >
      <h2 id="practice-cases-title">Practice cases</h2>
      <p className="muted">
        Eight fictional job switches, played one email at a time. Your agent
        updates the plan with quotes from each message and drafts the emails
        you’ll need. A case continues once you approve the email it’s waiting
        for.
      </p>
      <ol>
        {practiceCases.map((c, i) => (
          <li key={c.id}>
            <span className="practice-number" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>{c.title}</strong>
              <small>{c.summary}</small>
            </div>
            {current === c.id ? (
              <span className="practice-current">Open now</span>
            ) : (
              <button
                className="secondary small-button"
                disabled={!!busy}
                aria-label={`Open practice case: ${c.title}`}
                onClick={() => choose(c.id, c.title)}
              >
                Open
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
