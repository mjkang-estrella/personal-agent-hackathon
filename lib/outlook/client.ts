import { z } from "zod";
import { OUTLOOK_SCOPE, outlookConfig, senderAddress } from "./security";
export { header, plainText, newReplyText } from "../gmail/client";
export type { GmailMessage as OutlookMessage } from "../gmail/client";
import type { GmailMessage } from "../gmail/client";
export class OutlookRevoked extends Error {
  constructor() {
    super("Please reconnect Outlook.");
  }
}
export async function tokenRequest(fields: Record<string, string>) {
  const c = outlookConfig();
  const r = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        ...fields,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    },
  );
  if (!r.ok) {
    const error = await r.json().catch(() => ({}));
    if (["invalid_grant", "interaction_required"].includes(error.error))
      throw new OutlookRevoked();
    throw new Error("Please try connecting Outlook again.");
  }
  return z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().optional(),
      scope: z.string().optional(),
    })
    .parse(await r.json());
}
export function requireReadScope(scope: string | undefined) {
  const scopes = scope?.toLowerCase().split(" ") || [];
  if (
    !scopes.includes(OUTLOOK_SCOPE.toLowerCase()) &&
    !scopes.includes("https://graph.microsoft.com/mail.read")
  )
    throw new Error("Please grant read-only Outlook access to connect.");
}
export function graphUrl(path: string) {
  const url = new URL(path, "https://graph.microsoft.com/v1.0/");
  if (
    url.origin !== "https://graph.microsoft.com" ||
    !url.pathname.startsWith("/v1.0/me/") ||
    url.username ||
    url.password
  )
    throw new Error("Invalid Microsoft Graph destination.");
  return url;
}
export async function graphGet(
  token: string,
  path: string,
  query: Record<string, string> = {},
) {
  const url = graphUrl(path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.body-content-type="text", IdType="ImmutableId"',
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (r.status === 401) throw new OutlookRevoked();
  if (!r.ok) throw new Error("Please try checking Outlook again.");
  return r.json();
}
const messageSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  subject: z.string().default(""),
  receivedDateTime: z.string(),
  isDraft: z.boolean(),
  from: z.object({ emailAddress: z.object({ address: z.string() }) }),
  uniqueBody: z
    .object({ contentType: z.string(), content: z.string() })
    .optional(),
});
export function toMessage(value: unknown): GmailMessage | null {
  const p = messageSchema.safeParse(value);
  if (
    !p.success ||
    p.data.isDraft ||
    !senderAddress(p.data.from.emailAddress.address)
  )
    return null;
  const m = p.data,
    time = Date.parse(m.receivedDateTime);
  if (!Number.isFinite(time)) return null;
  const text =
    m.uniqueBody?.contentType.toLowerCase() === "text"
      ? m.uniqueBody.content.slice(0, 20_000)
      : "";
  return {
    id: m.id,
    threadId: m.conversationId,
    internalDate: String(time),
    payload: {
      mimeType: "text/plain",
      body: { data: Buffer.from(text).toString("base64url") },
      headers: [
        { name: "From", value: m.from.emailAddress.address },
        { name: "Subject", value: m.subject },
      ],
    },
  };
}
export const odataLiteral = (value: string) =>
  "'" + value.replaceAll("'", "''") + "'";
// Adapt Graph conversations to the existing evidence pipeline. Only Inbox is read.
export async function outlookGet(
  token: string,
  path: string,
  query: Record<string, string> = {},
) {
  if (path === "profile") {
    const p = await graphGet(token, "me/", {
      $select: "id,mail,userPrincipalName",
    });
    return { emailAddress: senderAddress(p.mail || p.userPrincipalName || "") };
  }
  const select =
    "id,conversationId,subject,receivedDateTime,isDraft,from" +
    (query.format === "full" ? ",uniqueBody" : "");
  let filter: string;
  if (path === "threads") {
    const sender = senderAddress(query.q?.match(/^from:(\S+)/)?.[1] || "");
    if (!sender) throw new Error("Enter a valid HR email address.");
    filter = `receivedDateTime ge ${new Date(Date.now() - 90 * 86400000).toISOString()} and from/emailAddress/address eq ${odataLiteral(sender)}`;
  } else if (path.startsWith("threads/")) {
    filter = `conversationId eq ${odataLiteral(path.slice(8))}`;
  } else throw new Error("Invalid Outlook operation.");
  let data = await graphGet(token, "me/mailFolders/inbox/messages", {
    $select: select,
    $filter: filter,
    $top: "50",
  });
  const values: unknown[] = [...(data.value || [])];
  // Bounded pagination: never silently truncate a selected conversation.
  for (let page = 1; data["@odata.nextLink"] && page < 5; page++) {
    data = await graphGet(token, data["@odata.nextLink"]);
    values.push(...(data.value || []));
  }
  if (data["@odata.nextLink"])
    throw new Error(
      "Please choose a smaller HR conversation or review this sender in Outlook; this check exceeds 250 messages.",
    );
  const messages = values
    .map(toMessage)
    .filter(
      (m): m is GmailMessage =>
        Boolean(m) && (path === "threads" || m!.threadId === path.slice(8)),
    );
  return path === "threads"
    ? {
        threads: [
          ...new Set(
            messages
              .sort((a, b) => Number(b.internalDate) - Number(a.internalDate))
              .map((m) => m.threadId),
          ),
        ]
          .slice(0, 15)
          .map((id) => ({ id })),
      }
    : { messages };
}
