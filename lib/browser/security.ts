import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type {
  BrowserAccount,
  BrowserPage,
  BrowserRun,
  PublicBrowserAccount,
} from "./types";

export function portalUrl(raw: string): URL {
  const url = new URL(raw);
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    isIP(hostname) ||
    hostname.includes(":") ||
    !hostname.includes(".") ||
    /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(hostname) ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Enter a public HTTPS sign-in URL without query parameters.",
    );
  }
  return url;
}

export const pageFingerprint = (page: BrowserPage) =>
  createHash("sha256").update(JSON.stringify(page)).digest("hex");

export function assertApproval(
  run: BrowserRun,
  approval: string,
  page: BrowserPage,
  now = Date.now(),
) {
  const pending = run.pending;
  if (
    run.status !== "review" ||
    !pending ||
    pending.id !== approval ||
    pending.expiresAt <= now ||
    pending.fingerprint !== pageFingerprint(page) ||
    page.blocked
  ) {
    throw new Error(
      "The page or approval changed. Inspect the page again before continuing.",
    );
  }
  return pending.action;
}

// Explicit projection: never serialize provider identifiers, login tokens, or profile names.
export function publicAccount(a: BrowserAccount): PublicBrowserAccount {
  const r = a.run;
  return {
    id: a.id,
    label: a.label,
    url: a.url,
    hasPassword: !!a.credential,
    status: a.status,
    run: r && {
      id: r.id,
      goal: r.goal,
      status: r.status,
      message: r.message,
      steps: r.steps,
      pending: r.pending && {
        id: r.pending.id,
        action: r.pending.action,
        page: r.pending.page,
        expiresAt: r.pending.expiresAt,
      },
    },
  };
}

export function trustedKernelUrl(raw: string) {
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    !["kernel.com", "onkernel.com", "kernel.sh"].some(
      (d) => u.hostname === d || u.hostname.endsWith(`.${d}`),
    )
  ) {
    throw new Error("Invalid browser handoff URL.");
  }
  return u.href;
}
