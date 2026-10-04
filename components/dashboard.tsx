"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  LayoutDashboard,
  Files,
  Activity,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Check,
  CheckCheck,
  CalendarDays,
  Clock,
  ShieldCheck,
  Heart,
  Wallet,
  Sparkles,
  MoreHorizontal,
  X,
  Upload,
  FileText,
  Download,
  ExternalLink,
  LoaderCircle,
  Mail,
  BriefcaseBusiness,
  Search,
  CircleHelp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  GraduationCap,
  Monitor,
  Send,
  CheckSquare,
  BookOpen,
} from "lucide-react";
import type { Workspace, Task, Document, Stage, Status } from "@/lib/types";
import Assistant from "./assistant";
import BackgroundControls from "./background-controls";
import { MODEL_LABEL } from "@/lib/model-config";
import { addDays, replyPayload } from "@/lib/domain";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const date = (s: string | null) =>
  s
    ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Confirm with HR";
const statuses: Record<Status, string> = {
  todo: "To do",
  ready: "Ready for approval",
  submitting: "Submitting",
  waiting: "Waiting for HR",
  needs_info: "Needs your input",
  approved: "Approved · unpaid",
  done: "Completed",
};
const categories = {
  money: { label: "Benefits & money", icon: Wallet, color: "peach" },
  health: { label: "Health coverage", icon: Heart, color: "lavender" },
  retirement: { label: "Retirement", icon: ShieldCheck, color: "sage" },
  onboarding: {
    label: "Getting started",
    icon: BriefcaseBusiness,
    color: "blue",
  },
};
const stages: {
  id: Stage;
  title: string;
  caption: string;
  icon: typeof LogOut;
}[] = [
  {
    id: "before",
    title: "Before leaving",
    caption: "Wrap things up well",
    icon: LogOut,
  },
  {
    id: "between",
    title: "Between jobs",
    caption: "Keep the essentials covered",
    icon: ArrowLeftRight,
  },
  {
    id: "after",
    title: "After starting",
    caption: "Set yourself up for what’s next",
    icon: BriefcaseBusiness,
  },
];
type Page = "board" | "documents" | "activity" | "settings";
export default function Dashboard() {
  const [w, setW] = useState<Workspace | null>(null);
  const [page, setPage] = useState<Page>("board");
  const [selected, setSelected] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<{ id: string; page: number } | null>(
    null,
  );
  const [chat, setChat] = useState(false);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [upload, setUpload] = useState(false);
  const [dates, setDates] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [certificateId, setCertificateId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const notify = (text: string, error = false) => setToast({ text, error });
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setW(json);
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewDoc(null);
        setSelected(null);
        setUpload(false);
        setDates(false);
        setChat(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!busy.includes("submit")) return;
    const t = setInterval(load, 1800);
    return () => clearInterval(t);
  }, [busy, load]);
  useEffect(() => {
    if (!w?.background?.enabled || busy) return;
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [w?.background?.enabled, busy, load]);
  async function act(
    action: string,
    extra: Record<string, unknown> = {},
    message?: string,
  ) {
    if (busy) return;
    setBusy(action);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setW(json);
      if (action === "new_workspace") {
        setPage("board");
        setSelected(null);
      }
      if (message) notify(message);
      return json as Workspace;
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy("");
    }
  }
  function openTask(id: string) {
    setSelected(id);
    setChat(false);
    setCertificateId("");
  }
  const task = w?.tasks.find((t) => t.id === selected);
  const document = w?.documents.find((d) => d.id === viewDoc?.id);
  if (!w)
    return (
      <main className="loading-screen">
        <span className="brand-mark">
          <ArrowLeftRight size={24} />
        </span>
        <h2>JobSwitch</h2>
        {loadError ? (
          <>
            <p>{loadError}</p>
            <button className="primary" onClick={load}>
              Try again
            </button>
          </>
        ) : (
          <p>
            <LoaderCircle size={16} className="spin" /> Getting your next
            chapter ready…
          </p>
        )}
      </main>
    );
  const complete = w.tasks.filter((t) =>
    ["done", "approved"].includes(t.status),
  ).length;
  const attention = w.tasks.filter(
    (t) => t.status === "ready" || t.status === "needs_info",
  ).length;
  const initials = w.profile.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  const currentDay = new Date().toISOString().slice(0, 10);
  const departureDays = Math.ceil(
    (Date.parse(w.profile.lastDay) - Date.parse(currentDay)) / 86400000,
  );
  const selectedCertificate = w.documents.find(
    (d) =>
      d.id ===
      (certificateId || w.documents.find((d) => d.kind === "certificate")?.id),
  );
  const links: [Page, typeof LayoutDashboard, string][] = [
    ["board", LayoutDashboard, "Transition board"],
    ["documents", Files, "My documents"],
    ["activity", Activity, "Agent activity"],
  ];
  const visible = w.tasks.filter(
    (t) =>
      (filter === "all" ||
        (filter === "attention" &&
          ["ready", "needs_info"].includes(t.status)) ||
        (filter === "done" && ["approved", "done"].includes(t.status))) &&
      (!search ||
        `${t.title} ${t.description}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="JobSwitch home">
          <span className="brand-mark">
            <ArrowLeftRight size={21} />
          </span>
          JobSwitch<span className="brand-dot">.</span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-icon">A</span>
          <div>
            <strong>My next chapter</strong>
            <small>Personal workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="nav-label">YOUR TRANSITION</p>
        <nav>
          {links.map(([id, Icon, label]) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => setPage(id)}
            >
              <Icon size={18} />
              {label}
              {id === "documents" && (
                <span className="nav-count">{w.documents.length}</span>
              )}
              {id === "activity" && attention > 0 && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
        <button
          className="sidebar-assistant"
          onClick={() => {
            setChat(true);
            setSelected(null);
          }}
        >
          <Sparkles size={18} />
          <span>Ask JobSwitch</span>
          <span className="shortcut">↗</span>
        </button>
        <div className="sidebar-bottom">
          <div className="quiet-card">
            <span className="little-stars">✦</span>
            <h4>
              A fresh start.
              <br />
              Fewer loose ends.
            </h4>
            <p>
              We’ll keep track of the details, so you can focus on what’s next.
            </p>
            <div className="mini-horizon">
              <span />
              <span />
              <span />
            </div>
          </div>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => setPage("settings")}
          >
            <Settings size={18} />
            Workspace settings
          </button>
          <div className="profile">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{w.profile.name}</strong>
              <small>Your personal transition</small>
            </div>
            <ShieldCheck size={15} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            My workspace <ChevronRight size={13} />
            <span>
              {page === "board"
                ? "Transition board"
                : page === "documents"
                  ? "My documents"
                  : page === "activity"
                    ? "Agent activity"
                    : "Settings"}
            </span>
          </div>
          <div className="topbar-right">
            <button className="demo-pill" onClick={() => setPage("settings")}>
              {w.demo ? "Demo workspace" : "Personal workspace"}
            </button>
            <button
              className="icon-button"
              aria-label="About JobSwitch"
              onClick={() =>
                notify(
                  "JobSwitch turns your employer documents into a plan. Review evidence, approve actions, and keep track of every reply.",
                )
              }
            >
              <CircleHelp size={19} />
            </button>
            <span className="avatar small">{initials}</span>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="green-dot" /> YOUR NEXT CHAPTER, HANDLED
              </div>
              <h1>
                {page === "board"
                  ? "A smoother move starts here."
                  : page === "documents"
                    ? "All the details. One place."
                    : page === "activity"
                      ? "Your agent, at work."
                      : "Make this workspace yours."}
              </h1>
              <p>
                {page === "board"
                  ? `From ${w.profile.previousEmployer} to ${w.profile.nextEmployer}. Let’s take care of everything in between.`
                  : page === "documents"
                    ? "The source of truth for your transition. Every recommendation starts here."
                    : page === "activity"
                      ? "A clear record of what happened, what changed, and what comes next."
                      : "Your dates and details keep every next step in sync."}
              </p>
            </div>
            <button
              className="primary"
              onClick={() => {
                setChat(true);
                setSelected(null);
              }}
            >
              <Sparkles size={16} /> Ask JobSwitch
            </button>
          </div>
          {page === "board" && (
            <>
              {!w.documents.length && (
                <section className="empty-start">
                  <div>
                    <h2>Let’s map out your transition.</h2>
                    <p>
                      Set your name and employers in Settings, then add a
                      handbook from each company. Your agent will connect the
                      dots.
                    </p>
                  </div>
                  <button className="primary" onClick={() => setUpload(true)}>
                    <Upload size={16} /> Add your first document
                  </button>
                </section>
              )}
              <section className="journey">
                <div className="employer">
                  <span className="employer-logo northstar">✳</span>
                  <div>
                    <small>LEAVING</small>
                    <strong>{w.profile.previousEmployer}</strong>
                    <span>Last day · {date(w.profile.lastDay)}</span>
                  </div>
                </div>
                <div className="journey-bridge">
                  <span className="journey-line" />
                  <span className="journey-symbol">
                    <ArrowRight size={18} />
                  </span>
                  <span className="journey-line" />
                  <small>A new beginning</small>
                </div>
                <div className="employer">
                  <span className="employer-logo orbit">
                    o<span>◦</span>
                  </span>
                  <div>
                    <small>JOINING</small>
                    <strong>{w.profile.nextEmployer}</strong>
                    <span>First day · {date(w.profile.startDay)}</span>
                  </div>
                </div>
                <button
                  className="text-button edit-dates"
                  onClick={() => setDates(true)}
                >
                  <CalendarDays size={15} /> Edit dates
                </button>
              </section>
              <section className="summary-grid">
                <div className="summary-card">
                  <div className="summary-icon peach">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <span>Potential benefits to explore</span>
                    <div className="stat">
                      {money(w.tasks.reduce((n, t) => n + (t.amount || 0), 0))}
                      <small>in policy allowances & claims</small>
                    </div>
                  </div>
                  <ArrowUpRight size={17} className="muted" />
                </div>
                <div className="summary-card">
                  <div className="summary-icon sage">
                    <CheckCheck size={21} />
                  </div>
                  <div>
                    <span>Your transition progress</span>
                    <div className="stat">
                      {complete}
                      <small>of {w.tasks.length} tasks resolved</small>
                    </div>
                  </div>
                  <svg className="progress-ring" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      style={{
                        strokeDasharray: `${w.tasks.length ? (complete / w.tasks.length) * 100.5 : 0} 100.5`,
                      }}
                    />
                  </svg>
                </div>
                <div className="summary-card">
                  <div className="summary-icon lavender">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <span>
                      {departureDays >= 0
                        ? "Until your last day"
                        : "Your departure date"}
                    </span>
                    <div className="stat">
                      {departureDays >= 0
                        ? departureDays
                        : date(w.profile.lastDay)}
                      <small>
                        {departureDays >= 0
                          ? "days to tie up loose ends"
                          : "time to look ahead"}
                      </small>
                    </div>
                  </div>
                </div>
              </section>
              <section className="insight">
                <span className="insight-symbol">
                  <Sparkles size={19} />
                </span>
                <div>
                  <strong>
                    {attention
                      ? `${attention} ${attention === 1 ? "task needs" : "tasks need"} your attention`
                      : "A little attention now. A lot less to worry about later."}
                  </strong>
                  <p>
                    {w.analyzedAt
                      ? w.analysisSummary
                      : w.documents.length
                        ? w.demo
                          ? "Your learning reimbursement has a deadline. Start there, then check your health coverage between jobs."
                          : "Your documents are ready. Run analysis to build a plan grounded in your employer policies."
                        : "Add both employers’ documents, then run analysis to generate your personal plan."}
                  </p>
                </div>
                <button
                  className="text-button"
                  disabled={!!busy}
                  onClick={() =>
                    act(
                      "analyze",
                      {},
                      "Your board is updated with verified document evidence.",
                    )
                  }
                >
                  <Busy busy={busy === "analyze"} />
                  {busy === "analyze"
                    ? "Reading documents…"
                    : "Analyze documents"}
                  <ArrowRight size={15} />
                </button>
              </section>
              <div className="board-toolbar">
                <div className="board-title">
                  <h2>Your transition plan</h2>
                  <span>{w.tasks.length}</span>
                </div>
                <div className="board-controls">
                  <div className="segmented">
                    <button
                      className={filter === "all" ? "selected" : ""}
                      onClick={() => setFilter("all")}
                    >
                      All tasks
                    </button>
                    <button
                      className={filter === "attention" ? "selected" : ""}
                      onClick={() => setFilter("attention")}
                    >
                      Needs you{attention > 0 && <b>{attention}</b>}
                    </button>
                    <button
                      className={filter === "done" ? "selected" : ""}
                      onClick={() => setFilter("done")}
                    >
                      Resolved
                    </button>
                  </div>
                  <button
                    className="secondary small-button"
                    onClick={() => setUpload(true)}
                  >
                    <Plus size={15} /> Add documents
                  </button>
                </div>
              </div>
              <section className="kanban">
                {stages.map((stage) => {
                  const tasks = visible.filter((t) => t.stage === stage.id);
                  const Icon = stage.icon;
                  return (
                    <section
                      className={`kanban-column stage-${stage.id}`}
                      key={stage.id}
                    >
                      <header className="column-header">
                        <div>
                          <Icon size={16} />
                          <h3>{stage.title}</h3>
                          <span>{tasks.length}</span>
                        </div>
                        <p>{stage.caption}</p>
                      </header>
                      <div className="column-cards">
                        {tasks.map((t, i) => (
                          <TaskCard
                            key={t.id}
                            task={t}
                            featured={
                              t.stage === "before" &&
                              i === 0 &&
                              t.category === "money"
                            }
                            open={() => openTask(t.id)}
                          />
                        ))}
                        {!tasks.length && (
                          <div className="empty-column">
                            <CheckCircle2 size={24} />
                            <p>
                              {filter === "all"
                                ? "Nothing here yet."
                                : "No matching tasks."}
                            </p>
                          </div>
                        )}
                        {stage.id === "between" && filter === "all" && (
                          <div className="breathing-room">
                            <span>☀</span>
                            <strong>A little breathing room.</strong>
                            <p>
                              You’re allowed to enjoy the space
                              <br />
                              between one chapter and the next.
                            </p>
                            <div className="terrain">
                              <i />
                              <i />
                              <i />
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </section>
              <div className="board-footer">
                <span>
                  <ShieldCheck size={14} /> Every recommendation has a source.
                  Every action is your call.
                </span>
                <a href="/api/export">
                  <Download size={14} /> Export plan
                </a>
              </div>
            </>
          )}
          {page === "documents" && (
            <>
              <div className="section-toolbar">
                <div className="search-field">
                  <Search size={17} />
                  <input
                    placeholder="Search documents…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search documents"
                  />
                </div>
                <button className="primary" onClick={() => setUpload(true)}>
                  <Upload size={16} /> Add document
                </button>
              </div>
              <div className="documents-list">
                <div className="list-header">
                  <span>DOCUMENT</span>
                  <span>BELONGS TO</span>
                  <span>PAGES</span>
                  <span />
                </div>
                {w.documents
                  .filter((d) =>
                    d.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((d) => (
                    <button
                      className="document-row"
                      key={d.id}
                      onClick={() => setViewDoc({ id: d.id, page: 1 })}
                    >
                      <span>
                        <span
                          className={`document-icon ${d.employer === "previous" ? "peach" : d.employer === "next" ? "lavender" : "sage"}`}
                        >
                          <FileText size={22} />
                        </span>
                        <span>
                          <strong>{d.name}</strong>
                          <small>
                            {d.kind.charAt(0).toUpperCase() + d.kind.slice(1)} ·
                            Added{" "}
                            {new Date(d.addedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </small>
                        </span>
                      </span>
                      <span className="ownership">
                        {d.employer === "previous"
                          ? w.profile.previousEmployer
                          : d.employer === "next"
                            ? w.profile.nextEmployer
                            : "Personal"}
                      </span>
                      <span>{d.pages.length}</span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
              </div>
              <div className="document-help">
                <ShieldCheck size={20} />
                <div>
                  <strong>Your documents stay in your workspace.</strong>
                  <p>
                    They are sent to the model only to analyze your transition.
                    Public web searches never contain their text.
                  </p>
                </div>
              </div>
            </>
          )}
          {page === "activity" && (
            <>
              <div className="section-toolbar">
                <div>
                  <h2>Every step, accounted for</h2>
                  <p className="muted">
                    Approvals, discoveries, and follow-ups.
                  </p>
                </div>
                <button
                  className="secondary"
                  disabled={!!busy}
                  onClick={() =>
                    act("sync", {}, "Inbox checked for new HR replies.")
                  }
                >
                  <RefreshCw
                    size={16}
                    className={busy === "sync" ? "spin" : ""}
                  />{" "}
                  Check for replies
                </button>
              </div>
              <div className="activity-feed">
                {w.activity.map((a) => (
                  <article className="activity-item" key={a.id}>
                    <span
                      className={`activity-icon ${a.type === "user" ? "sage" : a.type === "mail" ? "blue" : "peach"}`}
                    >
                      {a.type === "mail" ? (
                        <Mail size={18} />
                      ) : a.type === "user" ? (
                        <Check size={18} />
                      ) : a.type === "browser" ? (
                        <Monitor size={18} />
                      ) : (
                        <Sparkles size={18} />
                      )}
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      <p>{a.detail}</p>
                      <span>
                        {new Date(a.at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        ·{" "}
                        {a.type === "user"
                          ? "You"
                          : a.type === "mail"
                            ? "AgentMail"
                            : a.type === "browser"
                              ? "Kernel"
                              : "JobSwitch"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {page === "settings" && (
            <SettingsForm
              onUpdate={setW}
              w={w}
              busy={busy}
              act={act}
              editDates={() => setDates(true)}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>Built for the space between.</span>
          <span>
            JobSwitch <span>✦</span>
          </span>
        </footer>
      </div>
      {toast && (
        <div role="status" className={`toast ${toast.error ? "error" : ""}`}>
          {toast.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.text}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {busy && (
        <div className="working-indicator">
          <LoaderCircle size={14} className="spin" />
          {busy === "analyze"
            ? "Reading your documents"
            : busy === "submit"
              ? "Submitting with Kernel"
              : busy === "prepare"
                ? "Checking your receipt and policy"
                : busy.includes("hr_")
                  ? "Sending demo HR email"
                  : busy === "sync"
                    ? "Checking HR replies"
                    : "Working on it"}
          <span>…</span>
        </div>
      )}
      {task && (
        <>
          <div className="scrim" onClick={() => setSelected(null)} />
          <aside
            className="task-panel"
            role="dialog"
            aria-modal="true"
            aria-label={task.title}
          >
            <div className="panel-top">
              <span>
                {stages.find((s) => s.id === task.stage)?.title}{" "}
                <ChevronRight size={13} /> Task details
              </span>
              <button
                className="icon-button"
                aria-label="Close task details"
                onClick={() => setSelected(null)}
              >
                <X size={21} />
              </button>
            </div>
            <div className="panel-content">
              <div className="task-meta">
                <span
                  className={`category-label ${categories[task.category].color}`}
                >
                  {categories[task.category].label}
                </span>
                <StatusBadge status={task.status} />
              </div>
              <h2>{task.title}</h2>
              <p className="task-description">{task.description}</p>
              <div className="detail-facts">
                <div>
                  <small>DEADLINE</small>
                  <strong>
                    <CalendarDays size={15} />
                    {date(task.deadline)}
                  </strong>
                </div>
                {task.amount !== null && (
                  <div>
                    <small>POTENTIAL AMOUNT</small>
                    <strong>{money(task.amount)}</strong>
                  </div>
                )}
              </div>
              {task.dateReview && (
                <div className="notice warning">
                  <CalendarDays size={18} />
                  <p>
                    Your dates changed. This task needs review. Reanalyze
                    documents for updated coverage details; confirm changes to
                    submitted items with HR.
                  </p>
                </div>
              )}
              {task.error && (
                <div className="notice warning">
                  <AlertCircle size={18} />
                  <p>{task.error}</p>
                </div>
              )}
              {task.status === "approved" && (
                <div className="notice success">
                  <CheckCircle2 size={21} />
                  <div>
                    <strong>Approved. One less loose end.</strong>
                    <p>
                      HR confirmed your reimbursement. Payment is still pending.
                    </p>
                  </div>
                </div>
              )}
              {w.demo && task.id === "coverage" && (
                <div className="coverage-period">
                  <strong>
                    {Math.max(
                      0,
                      Math.round(
                        (new Date(
                          Number(w.profile.startDay.slice(0, 4)),
                          Number(w.profile.startDay.slice(5, 7)),
                          1,
                        ).getTime() -
                          new Date(w.profile.lastDay + "T00:00:00").getTime()) /
                          86400000,
                      ) - 1,
                    )}{" "}
                    days
                  </strong>
                  <div>
                    <p>
                      Potential gap: {date(addDays(w.profile.lastDay, 1))}{" "}
                      through the end of{" "}
                      {new Date(
                        w.profile.startDay + "T12:00:00Z",
                      ).toLocaleDateString("en-US", { month: "long" })}
                      .
                    </p>
                    <small>
                      Based on the two demo policies. Confirm individual
                      eligibility with HR.
                    </small>
                  </div>
                </div>
              )}
              {task.missing.length > 0 && (
                <section className="detail-section">
                  <h3>
                    <CircleHelp size={17} /> Still needs confirmation
                  </h3>
                  <ul className="missing-list">
                    {task.missing.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="detail-section">
                <h3>
                  <BookOpen size={17} /> Why this is on your plan
                </h3>
                {task.evidence.map((e, i) => {
                  const d = w.documents.find((d) => d.id === e.documentId);
                  return (
                    <button
                      className="evidence-card"
                      key={i}
                      onClick={() =>
                        setViewDoc({ id: e.documentId, page: e.page })
                      }
                    >
                      <blockquote>“{e.quote}”</blockquote>
                      <span>
                        <FileText size={14} />
                        {d?.name || "Document"} · p. {e.page}
                        <ArrowUpRight size={14} />
                      </span>
                    </button>
                  );
                })}
              </section>
              {task.lastReply && (
                <section className="detail-section">
                  <h3>
                    <Mail size={17} /> Latest from HR
                  </h3>
                  <div className="email-preview">
                    <span>Northstar People Team</span>
                    <p>{task.lastReply}</p>
                  </div>
                </section>
              )}
              {task.claim && (
                <section className="detail-section">
                  <h3>
                    <FileText size={17} />
                    {task.status === "ready"
                      ? "Review your claim"
                      : "Claim details"}
                  </h3>
                  <div className="claim-review">
                    <dl>
                      <dt>Employee</dt>
                      <dd>{task.claim.employee}</dd>
                      <dt>Course</dt>
                      <dd>{task.claim.course}</dd>
                      <dt>Amount</dt>
                      <dd>{money(task.claim.amount)}</dd>
                      <dt>Receipt</dt>
                      <dd>
                        {
                          w.documents.find(
                            (d) => d.id === task.claim?.receiptId,
                          )?.name
                        }
                      </dd>
                      <dt>Destination</dt>
                      <dd>Northstar test HR portal</dd>
                    </dl>
                    <p>{task.claim.note}</p>
                  </div>
                </section>
              )}
              {task.status === "needs_info" && (
                <section className="detail-section">
                  <h3>
                    <Upload size={17} /> Add your completion certificate
                  </h3>
                  {!w.documents.some((d) => d.kind === "certificate") ? (
                    <div className="certificate-actions">
                      <button
                        className="secondary"
                        onClick={() => setUpload(true)}
                      >
                        Upload certificate
                      </button>
                      {w.demo && (
                        <button
                          className="text-button"
                          disabled={!!busy}
                          onClick={() =>
                            act("certificate", {}, "Demo certificate added.")
                          }
                        >
                          Use demo certificate <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <select
                        aria-label="Completion certificate"
                        value={selectedCertificate?.id || ""}
                        onChange={(e) => setCertificateId(e.target.value)}
                      >
                        {w.documents
                          .filter((d) => d.kind === "certificate")
                          .map((d) => (
                            <option value={d.id} key={d.id}>
                              {d.name}
                            </option>
                          ))}
                      </select>
                      <div className="email-preview">
                        <span>To: Northstar Demo HR · {w.hrInbox}</span>
                        <p>{`Hello Northstar People Team,\n\nPlease find my completion certificate for ${task.claim?.course} attached, as requested for my $${task.claim?.amount} reimbursement claim.\n\nThank you,\n${w.profile.name}`}</p>
                        <small>
                          <FileText size={13} /> Attachment:{" "}
                          {selectedCertificate?.name} (text)
                        </small>
                      </div>
                      <button
                        className="primary full"
                        disabled={!!busy}
                        onClick={() =>
                          act(
                            "send_certificate",
                            {
                              taskId: task.id,
                              certificateId: selectedCertificate?.id,
                              approval: JSON.stringify(
                                replyPayload(w, task, selectedCertificate!),
                              ),
                            },
                            "Certificate sent to HR.",
                          )
                        }
                      >
                        <Busy busy={busy === "send_certificate"} />
                        <Send size={16} /> Approve & send reply
                      </button>
                    </>
                  )}
                </section>
              )}
              {task.category === "health" && (
                <section className="detail-section">
                  <h3>
                    <Search size={17} /> Understand your options
                  </h3>
                  <p className="muted">
                    Find general guidance from official public sources. Your
                    employer documents determine the policy details.
                  </p>
                  <button
                    className="secondary"
                    disabled={!!busy}
                    onClick={() =>
                      act(
                        "research",
                        {
                          topic:
                            task.stage === "after" ? "enrollment" : "coverage",
                        },
                        "Official sources added.",
                      )
                    }
                  >
                    <Busy busy={busy === "research"} />
                    <Search size={15} /> Find official guidance
                  </button>
                  {w.resources.map((r) => (
                    <a
                      className="resource-card"
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <strong>{r.title}</strong>
                      <span>
                        {new URL(r.url).hostname}
                        <ExternalLink size={13} />
                      </span>
                    </a>
                  ))}
                </section>
              )}
              {task.status === "waiting" && w.demo && (
                <section className="demo-controls">
                  <span className="demo-pill">DEMO CONTROLS</span>
                  <p>
                    Send a real email from your dedicated test HR inbox, then
                    let JobSwitch process the reply.
                  </p>
                  <button
                    className="secondary full"
                    disabled={!!busy}
                    onClick={() =>
                      act(
                        task.claim?.certificateId ? "hr_approve" : "hr_request",
                        { taskId: task.id },
                        "Demo HR email sent. Check replies if it has not arrived yet.",
                      )
                    }
                  >
                    <Mail size={16} />
                    {task.claim?.certificateId
                      ? "Send demo HR approval"
                      : "Send demo HR document request"}
                  </button>
                  <button
                    className="text-button"
                    disabled={!!busy}
                    onClick={() => act("sync", {}, "Inbox checked.")}
                  >
                    <RefreshCw size={14} /> Check replies
                  </button>
                </section>
              )}
            </div>
            <footer className="panel-footer">
              {task.status === "todo" && task.category === "money" && (
                <button
                  className="primary full"
                  disabled={!!busy}
                  onClick={() =>
                    act(
                      "prepare",
                      { taskId: task.id },
                      "Claim checked against your documents.",
                    )
                  }
                >
                  <Busy busy={busy === "prepare"} />
                  <Sparkles size={16} /> Check eligibility & prepare claim
                </button>
              )}
              {task.status === "ready" && w.demo && (
                <>
                  <p>
                    <ShieldCheck size={14} /> Submit only the claim and receipt
                    shown above.
                  </p>
                  <button
                    className="primary full"
                    disabled={!!busy}
                    onClick={() =>
                      act(
                        "submit",
                        {
                          taskId: task.id,
                          approval: JSON.stringify(task.claim),
                        },
                        "Claim submitted. Waiting for HR review.",
                      )
                    }
                  >
                    <Busy busy={busy === "submit"} />
                    <Check size={17} /> Approve & submit claim
                  </button>
                </>
              )}
              {task.status === "ready" && !w.demo && (
                <p>
                  Claim prepared. Submit it through your employer’s secure
                  portal. Automatic submission is available in the fictional
                  demo.
                </p>
              )}
              {task.status === "submitting" && (
                <>
                  <p>
                    <LoaderCircle size={15} className="spin" /> Kernel is
                    filling your approved claim.
                  </p>
                  {task.browserUrl && (
                    <a
                      className="secondary full"
                      href={task.browserUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch browser session <ExternalLink size={14} />
                    </a>
                  )}
                </>
              )}
              {!task.claim && task.category !== "money" && (
                <button
                  className="secondary full"
                  disabled={!!busy}
                  onClick={() => act("complete", { taskId: task.id })}
                >
                  <CheckSquare size={16} />
                  {task.status === "done"
                    ? "Reopen task"
                    : "I’ve handled this — mark complete"}
                </button>
              )}
              {["waiting", "approved", "needs_info", "done"].includes(
                task.status,
              ) && (
                <span className="footer-status">
                  <ShieldCheck size={14} />
                  {task.nextAction}
                </span>
              )}
            </footer>
          </aside>
        </>
      )}
      {chat && <Assistant close={() => setChat(false)} />}
      {document && viewDoc && (
        <div className="modal-backdrop" onClick={() => setViewDoc(null)}>
          <section
            className="document-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Document viewer"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <FileText size={19} />
                <strong>{document.name}</strong>
              </div>
              <button
                className="icon-button"
                aria-label="Close document"
                onClick={() => setViewDoc(null)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="document-paper">
              <span className="paper-eyebrow">
                SOURCE DOCUMENT · PAGE {viewDoc.page}
              </span>
              <pre>{document.pages[viewDoc.page - 1]}</pre>
            </div>
            <footer>
              <span>
                {document.employer === "personal"
                  ? "Personal document"
                  : document.employer === "previous"
                    ? w.profile.previousEmployer
                    : w.profile.nextEmployer}
              </span>
              <div>
                <button
                  className="icon-button"
                  disabled={viewDoc.page === 1}
                  onClick={() =>
                    setViewDoc({ ...viewDoc, page: viewDoc.page - 1 })
                  }
                  aria-label="Previous page"
                >
                  <ChevronRight
                    size={16}
                    style={{ transform: "rotate(180deg)" }}
                  />
                </button>
                <span>
                  {viewDoc.page} / {document.pages.length}
                </span>
                <button
                  className="icon-button"
                  disabled={viewDoc.page === document.pages.length}
                  onClick={() =>
                    setViewDoc({ ...viewDoc, page: viewDoc.page + 1 })
                  }
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
      {upload && (
        <div className="modal-backdrop" onClick={() => setUpload(false)}>
          <form
            className="form-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add document"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              const data = new FormData(e.currentTarget);
              setBusy("upload");
              try {
                const res = await fetch("/api/documents", {
                  method: "POST",
                  body: data,
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error);
                setW(json);
                setUpload(false);
                notify(
                  "Document added. Analyze your documents to update the plan.",
                );
              } catch (e) {
                notify((e as Error).message, true);
              } finally {
                setBusy("");
              }
            }}
          >
            <div className="modal-title">
              <span className="icon-bubble peach">
                <Upload size={22} />
              </span>
              <button
                type="button"
                className="icon-button"
                aria-label="Close upload"
                onClick={() => setUpload(false)}
              >
                <X size={20} />
              </button>
            </div>
            <h2>Add a little context.</h2>
            <p>Upload a handbook, receipt, HR email, or certificate.</p>
            <label className="drop-zone">
              <Upload size={26} />
              <strong>Choose your document</strong>
              <span>PDF, TXT, or MD · up to 4 MB</span>
              <input
                ref={fileRef}
                type="file"
                name="file"
                accept=".pdf,.txt,.md"
                required
                aria-label="Document file"
              />
            </label>
            <div className="form-grid">
              <label>
                Belongs to
                <select name="employer" defaultValue="previous">
                  <option value="previous">{w.profile.previousEmployer}</option>
                  <option value="next">{w.profile.nextEmployer}</option>
                  <option value="personal">Personal</option>
                </select>
              </label>
              <label>
                Document type
                <select
                  name="kind"
                  defaultValue={
                    task?.status === "needs_info" ? "certificate" : "policy"
                  }
                >
                  <option value="policy">Benefits policy</option>
                  <option value="receipt">Receipt</option>
                  <option value="certificate">Certificate</option>
                  <option value="other">HR email / other</option>
                </select>
              </label>
            </div>
            <div className="notice">
              <ShieldCheck size={16} />
              <p>
                Uploaded documents are stored in your private workspace and used
                by the AI to prepare your plan.
              </p>
            </div>
            <button className="primary full" disabled={!!busy}>
              <Busy busy={busy === "upload"} /> Add to my documents
            </button>
          </form>
        </div>
      )}
      {dates && (
        <div className="modal-backdrop" onClick={() => setDates(false)}>
          <form
            className="form-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit transition dates"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const result = await act(
                "dates",
                { lastDay: f.get("lastDay"), startDay: f.get("startDay") },
                "Dates updated. Your task deadlines are in sync.",
              );
              if (result) setDates(false);
            }}
          >
            <div className="modal-title">
              <span className="icon-bubble lavender">
                <CalendarDays size={22} />
              </span>
              <button
                type="button"
                className="icon-button"
                aria-label="Close dates"
                onClick={() => setDates(false)}
              >
                <X size={20} />
              </button>
            </div>
            <h2>When’s your next chapter?</h2>
            <p>We’ll update the deadlines linked to these dates.</p>
            <label>
              Your last working day
              <input
                type="date"
                name="lastDay"
                required
                defaultValue={w.profile.lastDay}
              />
            </label>
            <label>
              Your new start date
              <input
                type="date"
                name="startDay"
                required
                defaultValue={w.profile.startDay}
              />
            </label>
            <div className="notice">
              <RefreshCw size={16} />
              <p>
                Prepared claims will need a fresh review. Already submitted
                claims stay in your history.
              </p>
            </div>
            <button className="primary full" disabled={!!busy}>
              <Busy busy={busy === "dates"} /> Update my dates
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
function Busy({ busy }: { busy: boolean }) {
  return busy ? <LoaderCircle size={15} className="spin" /> : null;
}
function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span />
      {statuses[status]}
    </span>
  );
}
function TaskCard({
  task,
  featured,
  open,
}: {
  task: Task;
  featured: boolean;
  open: () => void;
}) {
  const c = categories[task.category];
  const Icon = task.title.toLowerCase().includes("learning")
    ? GraduationCap
    : c.icon;
  return (
    <button
      className={`task-card ${featured ? "featured" : ""} ${["done", "approved"].includes(task.status) ? "resolved" : ""}`}
      onClick={open}
    >
      <div className="card-top">
        <span className={`card-icon ${c.color}`}>
          <Icon size={20} />
        </span>
        <span className="card-menu">
          <ArrowUpRight size={17} />
        </span>
      </div>
      <span className="card-category">{c.label}</span>
      <h4>{task.title}</h4>
      <p>{task.description}</p>
      {task.amount !== null && (
        <div className="amount-line">
          {money(task.amount)}
          <span>
            {task.stage === "after"
              ? "policy allowance"
              : "potential reimbursement"}
          </span>
        </div>
      )}
      <div className="card-evidence">
        <FileText size={13} />
        {task.evidence.length}{" "}
        {task.evidence.length === 1 ? "source" : "sources"}
        <span>·</span> Evidence attached
      </div>
      <div className="card-bottom">
        <StatusBadge status={task.status} />
        {task.deadline && (
          <span className="card-date">
            <CalendarDays size={12} />
            {date(task.deadline)}
          </span>
        )}
      </div>
      {featured && task.status === "todo" && (
        <div className="card-recommended">
          <Sparkles size={12} /> A good place to start <ArrowRight size={13} />
        </div>
      )}
    </button>
  );
}
function SettingsForm({
  w,
  busy,
  act,
  editDates,
  onUpdate,
}: {
  w: Workspace;
  busy: string;
  act: (
    a: string,
    b: Record<string, unknown>,
    m?: string,
  ) => Promise<Workspace | undefined>;
  editDates: () => void;
  onUpdate: (w: Workspace) => void;
}) {
  return (
    <div className="settings-grid">
      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          act("profile", Object.fromEntries(f), "Workspace updated.");
        }}
      >
        <h2>Your transition</h2>
        <label>
          Your name
          <input
            name="name"
            defaultValue={w.profile.name}
            required
            maxLength={100}
          />
        </label>
        <label>
          Previous employer
          <input
            name="previousEmployer"
            defaultValue={w.profile.previousEmployer}
            required
            maxLength={100}
          />
        </label>
        <label>
          New employer
          <input
            name="nextEmployer"
            defaultValue={w.profile.nextEmployer}
            required
            maxLength={100}
          />
        </label>
        <button className="primary" disabled={!!busy}>
          Save details
        </button>
        <button className="text-button" type="button" onClick={editDates}>
          <CalendarDays size={15} /> Edit transition dates
        </button>
      </form>
      <BackgroundControls w={w} onUpdate={onUpdate} />
      <div className="settings-card">
        <h2>Connected to your next chapter</h2>
        <p className="muted">Live services powering this workspace.</p>
        {[
          [`Mastra + ${MODEL_LABEL}`, "Document reasoning & your assistant"],
          ["Neon", "Documents, evidence & task history"],
          ["Exa", "Official public guidance"],
          ["Kernel", "Approved test portal submissions"],
          ["AgentMail", "HR emails & follow-ups"],
        ].map(([name, description]) => (
          <div className="service-row" key={name}>
            <span className="green-dot" />
            <div>
              <strong>{name}</strong>
              <small>{description}</small>
            </div>
            <Check size={16} />
          </div>
        ))}
        <button
          className="secondary full"
          style={{ marginTop: 20 }}
          disabled={!!busy}
          onClick={() =>
            act(
              "new_workspace",
              { mode: w.demo ? "personal" : "demo" },
              "New workspace created.",
            )
          }
          type="button"
        >
          {w.demo
            ? "Start with my own documents"
            : "Open a fresh demo workspace"}{" "}
          <ArrowRight size={15} />
        </button>
        <div className="notice">
          <ShieldCheck size={18} />
          <p>
            This workspace is private to this browser. The demo uses fictional
            employers and dedicated test email inboxes.
          </p>
        </div>
      </div>
    </div>
  );
}
