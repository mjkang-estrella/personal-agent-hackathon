export interface PageControl {
  id: number;
  tag: string;
  type: string;
  label: string;
  value: string;
  href: string;
  options: string[];
  checked?: boolean;
  disabled?: boolean;
}
export interface BrowserPage {
  url: string;
  title: string;
  text: string;
  controls: PageControl[];
  blocked: boolean;
}
export interface BrowserAction {
  kind: "click" | "fill" | "select" | "handoff" | "done";
  target: number;
  value: string;
  explanation: string;
}
export interface BrowserRun {
  id: string;
  goal: string;
  sessionId?: string;
  status:
    | "starting"
    | "ready"
    | "review"
    | "executing"
    | "handoff"
    | "reported_done"
    | "closed";
  message: string;
  steps: number;
  pending?: {
    id: string;
    action: BrowserAction;
    page: BrowserPage;
    fingerprint: string;
    expiresAt: number;
  };
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
  run?: Omit<BrowserRun, "sessionId" | "pending"> & {
    pending?: Omit<NonNullable<BrowserRun["pending"]>, "fingerprint">;
  };
}
