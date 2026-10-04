export type Stage = "before" | "between" | "after";
export type Status =
  | "todo"
  | "ready"
  | "submitting"
  | "waiting"
  | "needs_info"
  | "approved"
  | "done";
export type Category =
  "money" | "health" | "retirement" | "onboarding" | "offboarding";
export interface Evidence {
  documentId: string;
  page: number;
  quote: string;
}
export interface Document {
  emailSource?: {
    id: string;
    from: string;
    subject: string;
    at: string;
    taskId: string;
  };
  id: string;
  name: string;
  employer: "previous" | "next" | "personal";
  kind: "policy" | "receipt" | "certificate" | "other";
  pages: string[];
  addedAt: string;
}
export interface Task {
  id: string;
  title: string;
  description: string;
  stage: Stage;
  category: Category;
  status: Status;
  deadline: string | null;
  deadlineRule: "departure" | "start" | "enrollment" | "fixed" | "unknown";
  amount: number | null;
  evidence: Evidence[];
  missing: string[];
  nextAction: string;
  claim?: ClaimDraft;
  outlook?: {
    threadId: string;
    sender: string;
    generation: string;
    bindingId: string;
  };
  gmail?: {
    threadId: string;
    sender: string;
    generation: string;
    bindingId: string;
  };
  mailThreadId?: string;
  mailMessageId?: string;
  processedMessageIds?: string[];
  lastReply?: string;
  lastReplyAt?: string;
  submittingAt?: string;
  browserSessionId?: string;
  browserUrl?: string;
  error?: string;
  dateReview?: boolean;
  history?: TaskEvent[];
}
export interface TaskEvent {
  at: string;
  status: Status;
  note: string;
  evidence?: Evidence;
}
export interface Contact {
  name: string;
  address: string;
}
// Practice-case mail lives in the workspace. It is never delivered to the
// `.example` addresses it displays.
export interface MailMessage {
  id: string;
  threadId: string;
  direction: "inbound" | "outbound";
  from: Contact;
  to: Contact[];
  subject: string;
  body: string;
  at: string;
  inReplyTo: string | null;
  attachmentIds: string[];
  documentId: string;
  taskIds: string[];
  triaged: boolean;
  draftId?: string;
}
export interface Draft {
  id: string;
  taskId: string;
  to: Contact[];
  subject: string;
  body: string;
  inReplyTo: string | null;
  attachmentIds: string[];
  reason: string;
  evidence: Evidence[];
  status: "draft" | "sent" | "dismissed" | "superseded";
  createdAt: string;
  editedAt?: string;
  sentAt?: string;
  sentMessageId?: string;
}
export interface DateProposal {
  lastDay: string;
  startDay: string;
  reason: string;
  evidence: Evidence;
}
export interface ScenarioState {
  id: string;
  title: string;
  summary: string;
  released: number;
  total: number;
  clock: string;
  self: Contact;
  contacts: Contact[];
  // Sample outbound message id -> the user's approved message that replaced it.
  aliases: Record<string, string>;
  checkpoint?: { title: string; expected: string; mustNot: string };
  // Set when the case cannot continue until the user approves an email to them.
  waitingFor?: Contact;
  waitingAttachments?: string[];
}
export interface ClaimDraft {
  employee: string;
  course: string;
  amount: number;
  receiptId: string;
  certificateId: string | null;
  policyDocumentId: string;
  policyPage: number;
  note: string;
}
export interface Profile {
  name: string;
  previousEmployer: string;
  nextEmployer: string;
  lastDay: string;
  startDay: string;
}
export interface Activity {
  id: string;
  at: string;
  title: string;
  detail: string;
  type: "agent" | "user" | "mail" | "browser" | "system";
}
export interface Resource {
  title: string;
  url: string;
  description: string;
}
export interface AgentState {
  enabled: boolean;
  phase?: "analyze" | "prepare" | "sync" | "triage" | "idle";
  pending?: boolean;
  analyzedInput?: string;
  preparedInputs?: Record<string, string>;
  lastSyncedAt?: string;
  lastRunAt?: string;
  error?: string;
}
export interface BackgroundStatus {
  enabled: boolean;
  generation: string;
  status: "starting" | "running" | "retrying" | "paused" | "attention";
  startedAt: string;
  runId?: string;
  lastCheckedAt?: string;
  failures?: number;
  error?: string;
}
export interface Workspace {
  agent?: AgentState;
  background?: BackgroundStatus;
  profile: Profile;
  documents: Document[];
  tasks: Task[];
  activity: Activity[];
  resources: Resource[];
  demo: boolean;
  analyzedAt: string | null;
  analysisSummary: string;
  inbox?: string;
  hrInbox?: string;
  scenario?: ScenarioState;
  mail?: MailMessage[];
  drafts?: Draft[];
  dateProposal?: DateProposal;
}

export interface InboxMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  at: string;
  taskId?: string;
  taskTitle?: string;
  body?: string;
  direction?: "inbound" | "outbound";
  to?: string;
  attachments?: { id: string; name: string }[];
}
export interface InboxSnapshot {
  provider?: "gmail" | "scenario";
  connected: boolean;
  messages: InboxMessage[];
  limited: boolean;
  message?: InboxMessage;
}
