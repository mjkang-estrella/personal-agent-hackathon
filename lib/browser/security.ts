import { isIP } from "node:net";
import type { BrowserAccount, PublicBrowserAccount } from "./types";

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
      intent: r.intent,
      intentHash: r.intentHash,
      status: r.status,
      message: r.message,
      question: r.question,
      steps: r.steps,
      history: r.history.slice(-30),
      outcome: r.outcome,
      confirmedAt: r.confirmedAt,
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
