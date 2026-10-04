"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Hand,
  ArrowRight,
} from "lucide-react";
import type { PublicBrowserAccount } from "@/lib/browser/types";
import styles from "./browser-accounts.module.css";

export default function BrowserAccounts() {
  const [accounts, setAccounts] = useState<PublicBrowserAccount[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [remove, setRemove] = useState<string>();
  const [goals, setGoals] = useState<Record<string, string>>({});
  const [passwordMode, setPasswordMode] = useState(false);
  async function load() {
    const r = await fetch("/api/browser", { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setAccounts(data.accounts);
    setConfigured(data.configured);
  }
  useEffect(() => {
    load()
      .catch((e) => setNotice(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function run(data: Record<string, unknown>) {
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setAccounts(result.accounts);
      setRemove(undefined);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.root}>
      <div className={styles.intro}>
        <ShieldCheck size={22} />
        <p>
          Connect a portal once, then ask your agent to help. You review browser
          steps before they run. Sign-in checks stay with you.
        </p>
      </div>
      {notice && (
        <p className={styles.notice} role="alert">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Loading connected accounts…</p>
      ) : !configured ? (
        <p className={styles.notice}>
          Browser connections are not configured yet. Your existing workspace is
          still available.
        </p>
      ) : (
        <>
          <section
            className={styles.connect}
            aria-labelledby="connect-account-title"
          >
            <h2 id="connect-account-title">
              <KeyRound size={19} /> Connect an account
            </h2>
            <p>
              Use a public HTTPS portal. Passwords are stored by Kernel, our
              browser provider, and are never sent to JobSwitch’s planning
              model.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const d = new FormData(form);
                const data = {
                  action: "connect",
                  label: d.get("label"),
                  url: d.get("url"),
                  consent: true,
                  ...(passwordMode
                    ? {
                        username: d.get("username"),
                        password: d.get("password"),
                      }
                    : {}),
                };
                // Clear the password immediately; never put it in React state or local storage.
                const password = form.elements.namedItem(
                  "password",
                ) as HTMLInputElement | null;
                if (password) password.value = "";
                void run(data);
              }}
            >
              <fieldset disabled={busy} className={styles.fields}>
                <label>
                  Account name
                  <input
                    name="label"
                    required
                    maxLength={80}
                    placeholder="My company portal"
                  />
                </label>
                <label>
                  Sign-in URL
                  <input
                    name="url"
                    type="url"
                    required
                    maxLength={2000}
                    placeholder="https://portal.company.com/login"
                  />
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={passwordMode}
                    onChange={(e) => setPasswordMode(e.target.checked)}
                  />{" "}
                  Save a username and password
                </label>
                {passwordMode && (
                  <>
                    <label>
                      Username or email
                      <input
                        name="username"
                        autoComplete="username"
                        required
                        maxLength={320}
                      />
                    </label>
                    <label>
                      Password
                      <input
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        maxLength={2000}
                      />
                    </label>
                  </>
                )}
                <p className={styles.small}>
                  {passwordMode
                    ? "Kernel saves these details for future sign-ins. MFA and CAPTCHA may still need your help."
                    : "You’ll sign in through Kernel’s secure window. This saves the signed-in session, without storing a password."}
                </p>
                <label className={styles.check}>
                  <input type="checkbox" required /> I authorize JobSwitch and
                  Kernel to sign in to this account and retain its session for
                  my tasks.
                </label>
                <button type="submit" className={styles.primary}>
                  <KeyRound size={16} /> {busy ? "Working…" : "Connect account"}
                </button>
              </fieldset>
            </form>
          </section>
          <section className={styles.accounts} aria-label="Saved accounts">
            <div className={styles.heading}>
              <h2>Your accounts</h2>
              <button
                disabled={busy}
                onClick={() => {
                  setNotice("");
                  void load().catch((e) => setNotice(e.message));
                }}
              >
                <RefreshCw size={15} /> Refresh list
              </button>
            </div>
            {!accounts.length && (
              <div className={styles.empty}>
                <Globe size={28} />
                <h3>Your portals, in one place</h3>
                <p>
                  Connect your first account to start a browser task. Some
                  portals require SSO or manual verification.
                </p>
              </div>
            )}
            {accounts.map((a) => (
              <article key={a.id} className={styles.account}>
                <div className={styles.heading}>
                  <div>
                    <h3>
                      <Globe size={19} /> {a.label}
                    </h3>
                    <p className={styles.domain}>{new URL(a.url).hostname}</p>
                  </div>
                  <span className={styles.badge}>
                    {
                      {
                        creating: "Setting up",
                        needs_login: "Sign-in needed",
                        connected: "Connected",
                        error: "Setup incomplete",
                        deleting: "Deletion pending",
                      }[a.status]
                    }
                  </span>
                </div>
                <p className={styles.small}>
                  {a.hasPassword
                    ? "Password saved with Kernel"
                    : "Session connection · no saved password"}
                </p>
                <div className={styles.actions}>
                  {a.status !== "deleting" && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => void run({ action: "login", id: a.id })}
                      >
                        Sign in / reconnect
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run({ action: "refresh", id: a.id })
                        }
                      >
                        <RefreshCw size={15} /> Check sign-in
                      </button>
                    </>
                  )}
                  {a.status === "needs_login" && (
                    <a
                      href={`/api/browser/handoff?id=${a.id}&kind=login`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={15} /> Open secure sign-in
                    </a>
                  )}
                  <button disabled={busy} onClick={() => setRemove(a.id)}>
                    <Trash2 size={15} /> Disconnect & delete
                  </button>
                </div>
                {remove === a.id && (
                  <div className={styles.review}>
                    <p>
                      Close the browser and delete this account’s saved
                      credentials and browser profile? This does not undo
                      actions already completed on the portal.
                    </p>
                    <div className={styles.actions}>
                      <button
                        disabled={busy}
                        onClick={() => void run({ action: "delete", id: a.id })}
                      >
                        Delete saved access
                      </button>
                      <button onClick={() => setRemove(undefined)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {a.status === "connected" &&
                  (!a.run || a.run.status === "closed") && (
                    <form
                      className={styles.taskForm}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run({
                          action: "start",
                          id: a.id,
                          goal: goals[a.id],
                          consent: true,
                        });
                      }}
                    >
                      <label>
                        What should your agent do?
                        <textarea
                          required
                          minLength={5}
                          maxLength={2000}
                          value={goals[a.id] || ""}
                          onChange={(e) =>
                            setGoals({ ...goals, [a.id]: e.target.value })
                          }
                          placeholder="Find my education reimbursement status"
                        />
                      </label>
                      <p className={styles.small}>
                        The planning model reads visible page text for this
                        task. Keep passwords, one-time codes, and payment
                        details out of your instructions. Browser support varies
                        by portal.
                      </p>
                      <label className={styles.check}>
                        <input type="checkbox" required /> Allow the agent to
                        read this portal for this task.
                      </label>
                      <button disabled={busy} className={styles.primary}>
                        Start browser task <ArrowRight size={16} />
                      </button>
                    </form>
                  )}
                {a.run && a.run.status !== "closed" && (
                  <div className={styles.run}>
                    <h4>{a.run.goal}</h4>
                    <p role="status">
                      {a.run.status === "reported_done"
                        ? "Agent’s assessment — verify in the portal: "
                        : ""}
                      {a.run.message}
                    </p>
                    <div className={styles.actions}>
                      <a
                        href={`/api/browser/handoff?id=${a.id}&kind=browser`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={15} /> Open live browser
                      </a>
                      {["ready", "review", "reported_done"].includes(
                        a.run.status,
                      ) && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run({ action: "inspect", id: a.id })
                          }
                        >
                          <RefreshCw size={15} /> Inspect & prepare next step
                        </button>
                      )}
                      {["handoff", "executing"].includes(a.run.status) && (
                        <button
                          disabled={busy}
                          className={styles.primary}
                          onClick={() =>
                            void run({ action: "resume", id: a.id })
                          }
                        >
                          <Hand size={15} /> I checked the browser — continue
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => void run({ action: "close", id: a.id })}
                      >
                        Stop & close browser
                      </button>
                    </div>
                    {a.run.pending && (
                      <div className={styles.review}>
                        <h4>Review & decide</h4>
                        <p>{a.run.pending.action.explanation}</p>
                        <dl>
                          <dt>On this page</dt>
                          <dd>{a.run.pending.page.url}</dd>
                          <dt>Action</dt>
                          <dd>
                            {a.run.pending.action.kind} →{" "}
                            {
                              a.run.pending.page.controls.find(
                                (c) => c.id === a.run!.pending!.action.target,
                              )?.label
                            }
                          </dd>
                          {a.run.pending.action.kind !== "click" && (
                            <>
                              <dt>Exact value</dt>
                              <dd>
                                <pre>{a.run.pending.action.value}</pre>
                              </dd>
                            </>
                          )}
                        </dl>
                        <details>
                          <summary>Review current page and form values</summary>
                          <pre>{a.run.pending.page.text}</pre>
                          {a.run.pending.page.controls
                            .filter((c) =>
                              ["input", "textarea", "select"].includes(c.tag),
                            )
                            .map((c) => (
                              <p key={c.id}>
                                <strong>{c.label}:</strong>{" "}
                                {c.value || "(empty)"}
                              </p>
                            ))}
                        </details>
                        <p className={styles.small}>
                          Approval applies to this step only and expires after
                          five minutes. If the page changes, inspect it again.
                          Review the live browser before approving a submission.
                        </p>
                        <button
                          disabled={busy}
                          className={styles.primary}
                          onClick={() =>
                            void run({
                              action: "approve",
                              id: a.id,
                              approval: a.run!.pending!.id,
                            })
                          }
                        >
                          Approve & execute this step <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </section>
        </>
      )}
      <p className={styles.small}>
        Access belongs to this browser’s workspace. Delete connected accounts
        before abandoning or switching workspaces. Clearing your workspace
        cookie loses access to these controls.
      </p>
    </div>
  );
}
