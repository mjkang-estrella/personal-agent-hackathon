import { sessionId } from "@/lib/session";
import { getWorkspace } from "@/lib/db";
import { inboxSnapshot } from "@/lib/inbox-snapshot";

export async function GET(request: Request) {
  const headers = { "cache-control": "private, no-store" };
  try {
    const id = await sessionId();
    const w = await getWorkspace(id);
    const messageId =
      new URL(request.url).searchParams.get("messageId") || undefined;
    const snapshot = await inboxSnapshot(id, w, messageId);
    if (messageId && !snapshot.message)
      return Response.json(
        { error: "Message not found in this workspace." },
        { status: 404, headers },
      );
    return Response.json(snapshot, { headers });
  } catch {
    return Response.json(
      { error: "Your inbox could not be loaded. Please try again." },
      { status: 503, headers },
    );
  }
}
