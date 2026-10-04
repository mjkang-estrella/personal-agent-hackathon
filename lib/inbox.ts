import type { AgentMailClient } from "agentmail";
import type { InboxMessage, InboxSnapshot } from "./types";

export interface InboxScope {
  inbox?: string;
  hrInbox?: string;
  demo: boolean;
  claims: { id: string; taskId: string; title: string }[];
}
type Messages = AgentMailClient["inboxes"]["messages"];
type Header = Awaited<ReturnType<Messages["get"]>>;
const address = (value: string) =>
  (value.match(/<([^>]+)>/)?.[1] || value).trim().toLowerCase();

// The demo mailbox is shared. Provider substring filters alone are not an
// authorization boundary: recheck exact claim markers and participants locally.
function ownedClaim(scope: InboxScope, message: Header | Omit<Header, "text">) {
  if (
    message.inboxId !== scope.inbox ||
    address(message.from) !== scope.hrInbox?.toLowerCase() ||
    !message.to.some((to) => address(to) === scope.inbox?.toLowerCase())
  )
    return undefined;
  const markers = [
    ...(message.subject || "").matchAll(/\[JobSwitch ([^\]]+)\]/g),
  ];
  if (markers.length !== 1) return undefined;
  return scope.claims.find((claim) => claim.id === markers[0][1]);
}
function summary(
  message: Header,
  claim: InboxScope["claims"][number],
): InboxMessage {
  return {
    id: message.messageId,
    from: message.from,
    subject: message.subject || "(No subject)",
    preview: message.preview || "",
    at: message.timestamp.toISOString(),
    taskId: claim.taskId,
    taskTitle: claim.title,
  };
}
export async function readInbox(
  scope: InboxScope,
  messages: Pick<Messages, "list" | "get">,
  messageId?: string,
): Promise<InboxSnapshot> {
  const result: InboxSnapshot = {
    connected: !!(scope.demo && scope.inbox && scope.hrInbox),
    messages: [],
    limited: false,
  };
  if (!result.connected || !scope.claims.length) return result;
  if (messageId) {
    const message = await messages.get(scope.inbox!, messageId);
    const claim = ownedClaim(scope, message);
    if (claim)
      result.message = {
        ...summary(message, claim),
        // Render as text only. Do not expose HTML, remote images, headers or attachment URLs.
        body:
          message.text ||
          message.extractedText ||
          "No plain-text body is available for this message.",
      };
    return result;
  }
  const found = new Map<string, InboxMessage>();
  for (const claim of scope.claims) {
    const page = await messages.list(scope.inbox!, {
      limit: 30,
      ascending: false,
      subject: [`[JobSwitch ${claim.id}]`],
      from: [scope.hrInbox!],
    });
    result.limited ||= !!page.nextPageToken;
    for (const message of page.messages) {
      const owner = ownedClaim(scope, message);
      if (owner) found.set(message.messageId, summary(message, owner));
    }
  }
  result.messages = [...found.values()].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );
  return result;
}
