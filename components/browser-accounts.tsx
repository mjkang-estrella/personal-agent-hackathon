"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { PublicBrowserAccount } from "@/lib/browser/types";
import styles from "./browser-accounts.module.css";
import RunPanel from "./browser-run";

export default function BrowserAccounts() {
  const [accounts, setAccounts] = useState<PublicBrowserAccount[]>([]);
  const [configured, setConfigured] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [remove, setRemove] = useState<string>();
  const [passwordMode, setPasswordMode] = useState(false);
  async function load() {
    const r = await fetch("/api/browser", { cache: "no-store" });
    const data = await r.json();
    setSignedOut(r.status === 401);
    if (r.status === 401) return;
    if (!r.ok) throw new Error(data.error);
    setAccounts(data.accounts);
    setConfigured(data.configured);
  }
  useEffect(() => {
    load()
      .catch((e) => setNotice(e.message))
      .finally(() => setLoading(false));
  }, []);
  // Confirmed runs advance automatically while this page is open. Pause and
  // close stay available because advancing does not mark the page busy.
  const running = accounts.find((a) => a.run?.status === "running")?.id;
  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    const tick = async () => {
      const r = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance", id: running }),
      }).catch(() => null);
      if (cancelled) return;
      const data = r && (await r.json().catch(() => null));
      if (r?.ok && data) setAccounts(data.accounts);
      else if (r?.status !== 409) await load().catch(() => {});
    };
    const t = setTimeout(() => void tick(), 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [running, accounts]);
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
          Connect a portal once, then tell your agent what you need. It shows
          you its plan first; once you confirm, it does the work and only stops
          for sign-in or anything outside the plan.
        </p>
      </div>
      {notice && (
        <p className={styles.notice} role="alert">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Loading connected accounts…</p>
      ) : signedOut ? (
        <p className={styles.notice}>
          Connected accounts hold access to your personal portals, so they need
          a signed-in account. <a href="/sign-in">Sign in with Google</a> to
          connect one.
        </p>
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
                <RunPanel account={a} busy={busy} run={run} />
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
