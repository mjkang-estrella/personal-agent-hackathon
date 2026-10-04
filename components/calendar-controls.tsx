"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Link2 } from "lucide-react";
import type { Workspace } from "@/lib/types";
import type { CalendarService } from "@/lib/connections/config";
import type { ReminderPreview } from "@/lib/calendar-state";
type Receipt = {
  taskId: string;
  title: string;
  date: string;
  email: string;
  status: string;
};
type State = {
  configured: boolean;
  connected: boolean;
  status?: string;
  email?: string;
  receipts: Receipt[];
};
const labels = {
  "google-calendar": "Google Calendar",
  "microsoft-calendar": "Outlook Calendar",
};
export default function CalendarControls({
  w,
  onUpdate,
}: {
  w: Workspace;
  onUpdate: (w: Workspace) => void;
}) {
  const [outcome, setOutcome] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("connection");
    if (!result) return;
    setOutcome(
      result === "connected"
        ? "Connection saved. Open My documents to import files, or choose a task below to review a calendar reminder."
        : result === "denied"
          ? "Access was not granted. You can connect again when ready."
          : "Connection expired or failed. Please try again.",
    );
    url.searchParams.delete("connection");
    window.history.replaceState(null, "", url);
  }, []);
  return (
    <>
      {outcome && <p role="status">{outcome}</p>}
      {Object.entries(labels).map(([service, label]) => (
        <CalendarConnection
          key={service}
          service={service as CalendarService}
          label={label}
          w={w}
          onUpdate={onUpdate}
        />
      ))}
    </>
  );
}
function CalendarConnection({
  service,
  label,
  w,
  onUpdate,
}: {
  service: CalendarService;
  label: string;
  w: Workspace;
  onUpdate: (w: Workspace) => void;
}) {
  const [state, setState] = useState<State>();
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [taskId, setTaskId] = useState(""),
    [title, setTitle] = useState(""),
    [date, setDate] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  const [proposal, setProposal] = useState<{
    preview: ReminderPreview;
    signature: string;
  }>();
  async function refresh() {
    const r = await fetch(`/api/connections/${service}`);
    if (r.status === 401) {
      setNeedsSignIn(true);
      return;
    }
    setNeedsSignIn(false);
    if (!r.ok)
      throw new Error(
        "Connection status unavailable. Reopen Settings to retry.",
      );
    setState(await r.json());
  }
  useEffect(() => {
    refresh().catch((e) => setNotice(e.message));
  }, [service]); // Each service has its own status and account.
  async function post(action: string, data?: unknown) {
    const r = await fetch(`/api/connections/${service}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    const value = await r.json();
    if (!r.ok) throw new Error(value.error || "Please try again.");
    return value;
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`settings-card calendar-connection ${state?.connected ? "connected" : ""}`}
      aria-label={`${label} connection`}
    >
      <h2>
        <CalendarDays size={20} aria-hidden="true" /> {label}
      </h2>
      <p className="muted">
        Add a reviewed task reminder to your main calendar. Calendar access is
        optional and separate from email. JobSwitch adds no guests or
        invitations.
      </p>
      {notice && <p role="status">{notice}</p>}
      {needsSignIn ? (
        <p>
          <a href="/sign-in">Sign in with Google</a> to connect your calendar.
        </p>
      ) : !state ? (
        <p>Loading connection…</p>
      ) : !state.configured ? (
        <p>This calendar connection is awaiting setup.</p>
      ) : (
        <>
          <p>
            {state.connected
              ? `Connected: ${state.email}`
              : state.status === "reconnect"
                ? "Access expired. Disconnect, then connect again."
                : "Calendar is not connected."}
          </p>
          {w.demo ? (
            <p>
              Start with your own documents before connecting your calendar.
            </p>
          ) : !state.connected && state.status !== "reconnect" ? (
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const { url } = await post("connect");
                  if (
                    ![
                      "https://accounts.google.com",
                      "https://login.microsoftonline.com",
                    ].includes(new URL(url).origin)
                  )
                    throw new Error("Invalid sign-in destination.");
                  window.location.assign(url);
                })
              }
            >
              <Link2 size={16} aria-hidden="true" /> Connect {label}
            </button>
          ) : null}
          {state.status && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await post("disconnect");
                  setProposal(undefined);
                  await refresh();
                  setNotice(
                    "Disconnected. Existing calendar entries remain. Removing the app in your provider account also revokes other JobSwitch connections.",
                  );
                })
              }
            >
              Disconnect {label}
            </button>
          )}
          {state.connected &&
            !w.demo &&
            (w.tasks.length ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () =>
                    setProposal(
                      await post("preview", { taskId, title, date, timeZone }),
                    ),
                  );
                }}
              >
                <label>
                  Task
                  <select
                    required
                    value={taskId}
                    disabled={busy}
                    onChange={(e) => {
                      const t = w.tasks.find((t) => t.id === e.target.value);
                      setTaskId(e.target.value);
                      setTitle(t?.title || "");
                      setDate(t?.deadline || "");
                      setProposal(undefined);
                    }}
                  >
                    <option value="">Choose a task</option>
                    {w.tasks
                      .filter(
                        (t) => !state.receipts.some((r) => r.taskId === t.id),
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Reminder title
                  <input
                    required
                    maxLength={160}
                    disabled={busy}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setProposal(undefined);
                    }}
                  />
                </label>
                <label>
                  Reminder date
                  <input
                    type="date"
                    required
                    disabled={busy}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setProposal(undefined);
                    }}
                  />
                </label>
                <p className="muted">
                  Timezone: {timeZone}. Confirm this date from your task’s
                  evidence. Choosing a reminder date does not confirm
                  eligibility or a policy deadline.
                </p>
                <button className="secondary" disabled={busy || !taskId}>
                  Preview reminder
                </button>
              </form>
            ) : (
              <p>
                Add your documents to build a task list before creating
                reminders.
              </p>
            ))}
          {proposal && (
            <div className="calendar-preview" aria-label="Reminder approval">
              <h3>Review this calendar entry</h3>
              <p>
                <strong>{proposal.preview.title}</strong>
              </p>
              <p>
                {proposal.preview.date} · all day · {proposal.preview.timeZone}
              </p>
              <p>
                {label} · {proposal.preview.email} · main calendar
              </p>
              <p className="muted">
                Private, marked as free, with no guests, alerts or attachments.
                Description: “JobSwitch task reminder. Check the task for
                current source evidence.” Calendar entries do not update
                automatically when task dates change.
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const result = await post("create", {
                      ...proposal,
                      approved: true,
                    });
                    setProposal(undefined);
                    await refresh();
                    const r = await fetch("/api/state");
                    if (r.ok) onUpdate(await r.json());
                    setNotice(
                      result.status === "created"
                        ? "Calendar entry confirmed."
                        : result.status === "failed"
                          ? "The calendar rejected this entry. You can add it manually after checking the details."
                          : "Check your calendar: the outcome is uncertain. JobSwitch will not repeat this request.",
                    );
                  })
                }
              >
                Approve & add to calendar
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setProposal(undefined)}
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
      {!!state?.receipts.length && (
        <>
          <h3>Calendar requests</h3>
          <ul>
            {state.receipts.map((r) => (
              <li key={r.taskId}>
                <strong>{r.title}</strong>
                <p>
                  {r.date} · {r.email} ·{" "}
                  {r.status === "created"
                    ? "Added"
                    : r.status === "failed"
                      ? "Not added — add manually"
                      : "Check calendar — confirmation unavailable"}
                </p>
              </li>
            ))}
          </ul>
          <p className="muted">
            One request per task and calendar provider. Existing entries remain
            if you disconnect or change your task dates.
          </p>
        </>
      )}
    </section>
  );
}
