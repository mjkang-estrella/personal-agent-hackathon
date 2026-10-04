import { z } from "zod";
import { GMAIL_SCOPE, gmailConfig } from "./security";
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});
export class GmailRevoked extends Error {
  constructor() {
    super("Please reconnect Gmail.");
  }
}
export async function tokenRequest(fields: Record<string, string>) {
  const c = gmailConfig();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      ...fields,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    if (e.error === "invalid_grant") throw new GmailRevoked();
    throw new Error("Gmail connection failed. Please try again.");
  }
  return tokenSchema.parse(await r.json());
}
export function requireReadScope(scope: string | undefined) {
  if (!scope?.split(" ").includes(GMAIL_SCOPE))
    throw new Error("Please grant read-only Gmail access to connect.");
}
export async function gmailGet(
  token: string,
  path: string,
  query: Record<string, string> = {},
) {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/" + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (r.status === 401) throw new GmailRevoked();
  if (!r.ok)
    throw new Error("Gmail could not complete this request. Please try again.");
  return r.json();
}
export interface GmailPart {
  mimeType?: string;
  filename?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
}
export interface GmailMessage {
  id: string;
  threadId: string;
  internalDate: string;
  snippet?: string;
  payload?: GmailPart;
  labelIds?: string[];
}
export function header(m: GmailMessage, name: string) {
  return (
    m.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())
      ?.value || ""
  );
}
export function plainText(part: GmailPart | undefined, depth = 0): string {
  if (!part || depth > 15 || part.filename) return "";
  if (part.mimeType === "text/plain" && part.body?.data)
    return Buffer.from(part.body.data, "base64url")
      .toString("utf8")
      .slice(0, 20_000);
  return (part.parts || [])
    .map((p) => plainText(p, depth + 1))
    .filter(Boolean)
    .join("\n")
    .slice(0, 20_000);
}

// Conservative plain-text history boundary. HTML and attachments are not analyzed.
export function newReplyText(text: string) {
  const lines = text.split(/\r?\n/);
  const reply: string[] = [];
  for (const line of lines) {
    if (
      /^\s*>/.test(line) ||
      /^\s*On .+wrote:\s*$/i.test(line) ||
      /^\s*-+\s*(Original Message|Forwarded message)/i.test(line) ||
      /^From:\s+.+/i.test(line)
    )
      break;
    reply.push(line);
  }
  return reply.join("\n").trim();
}
