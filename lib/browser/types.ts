// A confirmed intent is the user's approval for an entire browser task: the
// exact values the agent may enter, the files it may upload, and the single
// consequential outcome it may perform. Anything outside it pauses the run.
export interface IntentField {
  name: string; // Variable name the model sees, e.g. "course_fee".
  label: string;
  value: string; // Substituted only at execution; never shown to the planner.
}
export interface IntentFile {
  documentId: string;
  name: string;
}
export interface BrowserIntent {
  goal: string;
  outcome: string | null; // e.g. "Submit the education reimbursement claim".
  fields: IntentField[];
  files: IntentFile[];
}

// Stagehand's serializable action, replayed without a model call.
export interface StagehandAction {
  selector: string;
  description: string;
  method?: string;
  arguments?: string[];
}

export interface BrowserStep {
  at: string;
  kind: "action" | "upload" | "outcome" | "note";
  description: string;
  url?: string;
}

export interface BrowserRun {
  id: string;
  intent: BrowserIntent;
  intentHash: string;
  status:
    | "draft" // Intent prepared; waiting for the user's confirmation.
    | "running"
    | "paused" // Needs a decision outside the confirmed intent.
    | "handoff" // Sign-in, MFA or CAPTCHA in the live browser.
    | "done"
    | "failed"
    | "closed";
  message: string;
  question?: string;
  steps: number;
  history: BrowserStep[];
  sessionId?: string;
  extensionLoaded?: boolean;
  // Written before the outcome action is dispatched; never retried.
  outcome?: {
    status: "attempted" | "observed" | "unknown";
    at: string;
    evidence?: string;
  };
  confirmedAt?: string;
}

export interface BrowserAccount {
  id: string;
  label: string;
  url: string;
  profile: string;
  credential?: string;
  connectionId?: string;
  status: "creating" | "needs_login" | "connected" | "error" | "deleting";
  run?: BrowserRun;
}

export interface PublicBrowserAccount {
  id: string;
  label: string;
  url: string;
  hasPassword: boolean;
  status: BrowserAccount["status"];
  run?: Omit<BrowserRun, "sessionId" | "extensionLoaded" | "intent"> & {
    // Field values are shown to the owner for confirmation, as in claims.
    intent: BrowserIntent;
  };
}
