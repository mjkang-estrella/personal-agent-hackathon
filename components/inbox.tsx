"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Inbox as InboxIcon,
  LoaderCircle,
  Mail,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  FileText,
} from "lucide-react";
import type { InboxMessage, InboxSnapshot } from "@/lib/types";
import { caseTime } from "./practice";
const localTime = (at: string) =>
  new Date(at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
export default function Inbox({
  openTask,
  openDocument,
  refreshKey,
  focus,
}: {
  openTask: (id: string) => void;
  openDocument: (id: string, page?: number) => void;
  refreshKey?: number;
  focus?: { id: string; label: string; n: number };
}) {
  const [data, setData] = useState<InboxSnapshot | null>(null);
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async (message?: InboxMessage) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setSelected(message || null);
    try {
      const response = await fetch(
        `/api/inbox${message ? `?messageId=${encodeURIComponent(message.id)}` : ""}`,
        { cache: "no-store", signal: controller.signal },
      );
      const snapshot: InboxSnapshot = await response.json();
      if (!response.ok)
        throw new Error("Your inbox could not be loaded. Please try again.");
      if (message) setSelected(snapshot.message || null);
      else {
        setData(snapshot);
        setUpdatedAt(new Date().toISOString());
      }
    } catch {
      if (!controller.signal.aborted)
        setError("Your inbox could not be loaded. Please try again.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => request.current?.abort();
  }, [load, refreshKey]);
  useEffect(() => {
    if (!focus) return;
    load({
      id: focus.id,
      from: "",
      subject: focus.label,
      preview: "",
      at: new Date().toISOString(),
    });
  }, [load, focus]);
  const practice = data?.provider === "scenario";
  const demo = data?.provider === "demo";
  const timestamp = (at: string) =>
    practice ? caseTime(at, true) : localTime(at);
  return (
    <section className="inbox-panel" aria-label="Workspace inbox">
      <header className="inbox-heading">
        <span className="icon-bubble sage">
          <Mail size={20} />
        </span>
        <div>
          <h2>
            {practice ? "Practice inbox" : demo ? "Demo inbox" : "HR replies"}
          </h2>
          <p>
            {data?.provider === "gmail"
              ? "Saved replies from your selected email threads."
              : practice
                ? "Every email in this case, including the ones you approved."
                : demo
                  ? "Sample emails to explore, alongside your test HR replies."
                  : "Messages for your transition."}
          </p>
        </div>
        <button
          className="icon-button"
          aria-label="Refresh inbox"
          disabled={busy}
          onClick={() => load()}
        >
          <RefreshCw size={17} className={busy ? "spin" : ""} />
        </button>
      </header>
      <div className="inbox-scroll" aria-busy={busy}>
        {data?.warning && (
          <p className="inbox-notice" role="status">
            {data.warning}
          </p>
        )}
        {error && (
          <div className="inbox-error" role="alert">
            <p>{error}</p>
            <button
              className="secondary"
              onClick={() => load(selected || undefined)}
            >
              Try again
            </button>
          </div>
        )}
        {selected ? (
          <article className="inbox-detail">
            <button className="text-button" onClick={() => load()}>
              <ArrowLeft size={15} /> All messages
            </button>
            <span className="inbox-eyebrow">
              {selected.demo
                ? "FICTIONAL DEMO EMAIL"
                : selected.direction === "outbound"
                  ? "SENT AFTER YOUR APPROVAL"
                  : "RECEIVED EMAIL"}
            </span>
            <h3>{selected.subject}</h3>
            <div className="inbox-sender">
              <strong>
                {selected.direction === "outbound"
                  ? `To ${selected.to}`
                  : selected.from}
              </strong>
              <time dateTime={selected.at}>{timestamp(selected.at)}</time>
            </div>
            {busy ? (
              <p className="inbox-loading" role="status">
                <LoaderCircle size={18} className="spin" /> Opening message…
              </p>
            ) : (
              !error && <p className="inbox-body">{selected.body}</p>
            )}
            {!busy && !!selected.attachments?.length && (
              <div className="inbox-attachments">
                {selected.attachments.map((a) => (
                  <button
                    key={a.id}
                    className="text-button"
                    onClick={() => openDocument(a.id)}
                  >
                    <Paperclip size={14} aria-hidden="true" /> {a.name}
                  </button>
                ))}
              </div>
            )}
            {!busy && !error && selected.source && (
              <button
                className="inbox-source text-button"
                onClick={() =>
                  openDocument(
                    selected.source!.documentId,
                    selected.source!.page,
                  )
                }
              >
                <FileText size={16} aria-hidden="true" />
                Read source document · page {selected.source.page}
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            )}
            {selected.taskId && (
              <button
                className="inbox-task"
                onClick={() => openTask(selected.taskId!)}
              >
                <span>
                  <small>RELATED TASK</small>
                  {selected.taskTitle}
                </span>
                <ArrowUpRight size={17} />
              </button>
            )}
          </article>
        ) : (
          <>
            {busy && (
              <p className="inbox-loading" role="status">
                <LoaderCircle size={18} className="spin" /> Checking your inbox…
              </p>
            )}
            {data && (
              <>
                <div className="inbox-list-label">
                  <span>
                    {data.messages.length}{" "}
                    {data.messages.length === 1 ? "message" : "messages"}
                  </span>
                  <span>Newest first</span>
                </div>
                {data.messages.length ? (
                  <div className="inbox-list">
                    {data.messages.map((message) => (
                      <button
                        className="inbox-message"
                        key={message.id}
                        onClick={() => load(message)}
                      >
                        <span className="inbox-message-top">
                          <span className="inbox-from">
                            {message.direction === "outbound" ? (
                              <>
                                <Send size={13} aria-label="Sent" />
                                To {message.to}
                              </>
                            ) : (
                              message.from
                            )}
                          </span>
                          <time dateTime={message.at}>
                            {timestamp(message.at)}
                          </time>
                        </span>
                        <strong>{message.subject}</strong>
                        {message.demo && (
                          <span className="inbox-sample-label">Demo email</span>
                        )}
                        <p>{message.preview || "Open to read this message."}</p>
                        {!!message.attachments?.length && (
                          <span className="inbox-attachment-count">
                            <Paperclip size={12} aria-hidden="true" />
                            {message.attachments.length === 1
                              ? message.attachments[0].name
                              : `${message.attachments.length} attachments`}
                          </span>
                        )}
                        {message.taskTitle && (
                          <span className="inbox-task-label">
                            {message.taskTitle}
                            <ArrowUpRight size={13} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  !busy &&
                  !error && (
                    <div className="inbox-empty">
                      <span className="inbox-empty-icon">
                        <InboxIcon size={30} />
                      </span>
                      <h3>
                        {data.connected
                          ? "You’re all caught up."
                          : "A home for your HR replies."}
                      </h3>
                      <p>
                        {practice
                          ? "This case has no email yet. Deliver the first one from your board."
                          : data.provider === "gmail"
                            ? "Connect email and choose HR threads in workspace settings. Replies appear here after checking. Refresh reloads saved replies."
                            : data.connected
                              ? "No HR replies for this workspace yet. Refresh when you’re ready to check again."
                              : "Demo HR replies will appear here once the reimbursement workflow connects your test inbox."}
                      </p>
                    </div>
                  )
                )}
                {data.limited && (
                  <p className="inbox-limit">
                    Showing the latest 30 messages per claim.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
      <footer className="inbox-footer">
        <ShieldCheck size={15} />
        <div>
          {practice
            ? "Simulated email for this practice case."
            : demo
              ? "Sample emails are fictional. Nothing is sent."
              : "Only replies linked to this workspace."}
          <small>
            {practice
              ? "Nothing here is delivered to a real inbox."
              : updatedAt
                ? `Last checked ${localTime(updatedAt)}`
                : "Reading email never sends a reply."}
          </small>
        </div>
      </footer>
    </section>
  );
}
