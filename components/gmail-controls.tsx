"use client";
import { useEffect, useState } from "react";
import type { Workspace } from "@/lib/types";
type ConnectionStatus = {
  configured: boolean;
  connected: boolean;
  status?: string;
  email?: string;
};
type Thread = { id: string; subject: string; at: string };
export default function GmailControls({
  w,
  onUpdate,
}: {
  w: Workspace;
  onUpdate: (w: Workspace) => void;
}) {
  const [connection, setConnection] = useState<ConnectionStatus>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [sender, setSender] = useState("");
  const [searchedSender, setSearchedSender] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [taskId, setTaskId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  async function refresh() {
    const r = await fetch("/api/gmail/status");
    if (!r.ok)
      throw new Error("Connection status unavailable. Please try again.");
    setConnection(await r.json());
  }
  useEffect(() => {
    refresh().catch(() =>
      setNotice(
        "Connection status unavailable. Please reopen settings to retry.",
      ),
    );
    const result = new URLSearchParams(window.location.search).get("gmail");
    if (result) {
      setNotice(
        result === "connected"
          ? "Gmail connected. Choose an HR thread below."
          : result === "denied"
            ? "Gmail access was not granted."
            : "Gmail connection failed or expired. Please try again.",
      );
      const url = new URL(window.location.href);
      url.searchParams.delete("gmail");
      window.history.replaceState(null, "", url);
    }
  }, []);
  async function post(path: string, body?: object) {
    const r = await fetch(`/api/gmail/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Please try again.");
    return data;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const availableTasks = w.tasks.filter(
    (t) => !t.gmail && !["approved", "done", "submitting"].includes(t.status),
  );
  return (
    <section className="settings-card" aria-label="Gmail connection">
      <h2>Your Gmail inbox</h2>
      <p className="muted">
        Optionally follow an HR request you have already sent. Google grants
        read-only inbox access; JobSwitch processes only the sender and thread
        you select. Selected reply text is stored as evidence and sent to our AI
        provider for analysis. This connection cannot send email.
      </p>
      {notice && <p role="status">{notice}</p>}
      {!connection ? (
        <p>Loading connection…</p>
      ) : !connection.configured ? (
        <p>
          Gmail connection is not configured for this deployment. The demo uses
          its own AgentMail inbox.
        </p>
      ) : (
        <>
          {connection.connected ? (
            <p>Connected: {connection.email}</p>
          ) : (
            <p>
              {connection.status === "reconnect"
                ? "Gmail access expired. Disconnect, then connect again."
                : "Gmail is not connected."}
            </p>
          )}
          {!w.demo &&
            !connection.connected &&
            connection.status !== "reconnect" && (
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const data = await post("connect");
                    const url = new URL(data.url);
                    if (url.origin !== "https://accounts.google.com")
                      throw new Error("Invalid sign-in destination.");
                    window.location.assign(url.href);
                  })
                }
              >
                Connect Gmail
              </button>
            )}
          {connection.status && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const result = await post("disconnect");
                  await refresh();
                  setThreads([]);
                  const r = await fetch("/api/state");
                  if (r.ok) onUpdate(await r.json());
                  setNotice(
                    result.revoked
                      ? "Gmail disconnected. Previously imported evidence is retained."
                      : "Disconnected locally. Remove JobSwitch access in your Google Account permissions too. Imported evidence is retained.",
                  );
                })
              }
            >
              Disconnect Gmail
            </button>
          )}
          {w.demo && (
            <p>
              The demo uses a separate AgentMail inbox. Choose “Start with my
              own documents” below before connecting your Gmail.
            </p>
          )}
          {connection.connected && !w.demo && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const data = await post("threads", { sender });
                    setThreads(data.threads);
                    setSearchedSender(sender);
                    setConfirmed(false);
                    if (!data.threads.length)
                      setNotice("No matching threads in the last 90 days.");
                  });
                }}
              >
                <label>
                  HR email address
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={sender}
                    onChange={(e) => {
                      setSender(e.target.value);
                      setThreads([]);
                      setConfirmed(false);
                    }}
                    placeholder="hr@example.com"
                  />
                </label>
                <button className="secondary" disabled={busy}>
                  Find HR threads
                </button>
              </form>
              {threads.length > 0 && (
                <div>
                  <label>
                    Task to follow
                    <select
                      value={taskId}
                      onChange={(e) => setTaskId(e.target.value)}
                    >
                      <option value="">Choose a task</option>
                      {availableTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{" "}
                    I already sent this request to HR. Follow replies using AI.
                  </label>
                  <ul>
                    {threads.map((t) => (
                      <li key={t.id}>
                        <p>
                          {t.subject || "(No subject)"} ·{" "}
                          {new Date(t.at).toLocaleDateString()}
                        </p>
                        <button
                          className="secondary"
                          disabled={busy || !confirmed || !taskId}
                          onClick={() =>
                            run(async () => {
                              onUpdate(
                                await post("track", {
                                  action: "track",
                                  taskId,
                                  threadId: t.id,
                                  sender: searchedSender,
                                  alreadySubmitted: true,
                                }),
                              );
                              setThreads([]);
                              setConfirmed(false);
                              setTaskId("");
                              setNotice(
                                "Thread linked. Check replies now, or enable background checks.",
                              );
                            })
                          }
                        >
                          Follow this thread
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {w.tasks
                .filter((t) => t.gmail)
                .map((t) => (
                  <div key={t.id} className="service-row">
                    <div>
                      <strong>{t.title}</strong>
                      <small>{t.gmail!.sender}</small>
                    </div>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          onUpdate(
                            await post("track", {
                              action: "untrack",
                              taskId: t.id,
                            }),
                          );
                          setNotice(
                            "Thread tracking stopped. Imported evidence is retained.",
                          );
                        })
                      }
                    >
                      Stop tracking
                    </button>
                  </div>
                ))}
              <button
                className="primary"
                disabled={busy || !w.tasks.some((t) => t.gmail)}
                onClick={() =>
                  run(async () => {
                    onUpdate(await post("sync"));
                    setNotice("Selected HR threads checked.");
                  })
                }
              >
                {busy ? "Working…" : "Check replies now"}
              </button>
              <p className="muted">
                Enable background checks below to keep checking after you close
                this page. Approvals reported by HR are not proof of payment.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
