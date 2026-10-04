"use client";

import { useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  Hand,
  Pause,
  Play,
  Square,
} from "lucide-react";
import type { BrowserIntent, PublicBrowserAccount } from "@/lib/browser/types";
import styles from "./browser-accounts.module.css";

type Run = (data: Record<string, unknown>) => Promise<void>;

const STATUS: Record<string, string> = {
  draft: "Plan ready for review",
  running: "Working",
  paused: "Needs you",
  handoff: "Sign-in needed",
  done: "Finished",
  failed: "Stopped",
};

export default function RunPanel({
  account: a,
  busy,
  run,
}: {
  account: PublicBrowserAccount;
  busy: boolean;
  run: Run;
}) {
  const [goal, setGoal] = useState("");
  const [edits, setEdits] = useState<BrowserIntent>();
  const r = a.run && a.run.status !== "closed" ? a.run : undefined;

  if (a.status !== "connected" && !r) return null;
  if (!r)
    return (
      <form
        className={styles.taskForm}
        onSubmit={(e) => {
          e.preventDefault();
          void run({ action: "draft", id: a.id, goal, consent: true });
        }}
      >
        <label>
          What should your agent do?
          <textarea
            required
            minLength={5}
            maxLength={2000}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Submit my education reimbursement claim"
          />
        </label>
        <p className={styles.small}>
          Your agent drafts a plan first: the values it will enter, any files,
          and the one outcome it will complete. Once you confirm, it works on
          its own and only stops for sign-in or anything outside the plan. Keep
          passwords and one-time codes out of your instructions.
        </p>
        <label className={styles.check}>
          <input type="checkbox" required /> Allow the agent to read this portal
          and my workspace to prepare the plan.
        </label>
        <button disabled={busy} className={styles.primary}>
          Draft plan <ArrowRight size={16} />
        </button>
      </form>
    );

  const intent = r.status === "draft" ? (edits ?? r.intent) : r.intent;
  const setValue = (name: string, value: string) =>
    setEdits({
      ...intent,
      fields: intent.fields.map((f) => (f.name === name ? { ...f, value } : f)),
    });

  return (
    <div className={styles.run}>
      <div className={styles.heading}>
        <h4>{intent.goal}</h4>
        <span className={styles.badge}>{STATUS[r.status] ?? r.status}</span>
      </div>
      <p role="status">
        {r.status === "done" ? "Agent’s report — verify in the portal: " : ""}
        {r.message}
      </p>
      {r.question && (
        <div className={styles.review}>
          <h4>Your decision</h4>
          <p>{r.question}</p>
        </div>
      )}

      <div className={styles.review}>
        <h4>{r.status === "draft" ? "Review the plan" : "Confirmed plan"}</h4>
        <dl>
          <dt>Outcome</dt>
          <dd>
            {intent.outcome ??
              "Read only — nothing will be submitted or changed."}
          </dd>
          {intent.fields.map((f) => (
            <div key={f.name}>
              <dt>{f.label}</dt>
              <dd>
                {r.status === "draft" ? (
                  <input
                    aria-label={f.label}
                    value={f.value}
                    maxLength={2000}
                    placeholder="Needed before confirming"
                    onChange={(e) => setValue(f.name, e.target.value)}
                  />
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
          {intent.files.length > 0 && (
            <>
              <dt>Files to attach</dt>
              <dd>{intent.files.map((f) => f.name).join(", ")}</dd>
            </>
          )}
        </dl>
        {r.status === "draft" && (
          <>
            <p className={styles.small}>
              Your agent enters only these values and completes only this
              outcome, then stops. Anything else, it asks you first. Changing
              the plan later needs a new confirmation.
            </p>
            <button
              disabled={busy || intent.fields.some((f) => !f.value.trim())}
              className={styles.primary}
              onClick={() =>
                void run({
                  action: "confirm",
                  id: a.id,
                  intent,
                  intentHash: r.intentHash,
                })
              }
            >
              Confirm & let the agent work <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>

      {r.outcome && (
        <p className={styles.small}>
          Outcome{" "}
          {
            {
              attempted: "attempted",
              observed: "shown as complete by the portal",
              unknown: "unconfirmed — check the live browser",
            }[r.outcome.status]
          }
          . Submission is not approval or payment.
          {r.outcome.evidence && ` Evidence: ${r.outcome.evidence}`}
        </p>
      )}

      <div className={styles.actions}>
        {r.status !== "draft" && (
          <a
            href={`/api/browser/handoff?id=${a.id}&kind=browser`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} /> Watch live browser
          </a>
        )}
        {r.status === "handoff" && (
          <a
            href={`/api/browser/handoff?id=${a.id}&kind=login`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} /> Open secure sign-in
          </a>
        )}
        {r.status === "running" && (
          <button onClick={() => void run({ action: "pause", id: a.id })}>
            <Pause size={15} /> Pause
          </button>
        )}
        {(r.status === "paused" || r.status === "handoff") &&
          r.outcome?.status !== "unknown" && (
            <button
              disabled={busy}
              className={styles.primary}
              onClick={() => void run({ action: "resume", id: a.id })}
            >
              {r.status === "handoff" ? <Hand size={15} /> : <Play size={15} />}{" "}
              {r.status === "handoff" ? "I’ve signed in — continue" : "Resume"}
            </button>
          )}
        <button onClick={() => void run({ action: "close", id: a.id })}>
          <Square size={15} />{" "}
          {r.status === "draft" ? "Discard plan" : "Stop & close"}
        </button>
      </div>

      {r.history.length > 0 && (
        <details>
          <summary>What your agent did ({r.steps} steps)</summary>
          <ol>
            {r.history.map((h, i) => (
              <li key={i}>
                {h.kind === "outcome" ? (
                  <strong>{h.description}</strong>
                ) : (
                  h.description
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
