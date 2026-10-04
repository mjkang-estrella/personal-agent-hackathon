import { AgentMailClient } from "agentmail";
import { sessionId } from "@/lib/session";
import { getWorkspace, pool } from "@/lib/db";
import { readInbox } from "@/lib/inbox";

export async function GET(request: Request) {
  const headers = { "cache-control": "private, no-store" };
  try {
    const id = await sessionId();
    const w = await getWorkspace(id);
    const claims = await pool.query<{ id: string; task_id: string }>(
      "SELECT id,task_id FROM jobswitch_claims WHERE workspace_id=$1",
      [id],
    );
    const messageId =
      new URL(request.url).searchParams.get("messageId") || undefined;
    if (messageId && messageId.length > 1000)
      return Response.json(
        { error: "Message not found in this workspace." },
        { status: 404, headers },
      );
    const snapshot = await readInbox(
      {
        inbox: w.inbox,
        hrInbox: w.hrInbox,
        demo: w.demo,
        claims: claims.rows.map((claim) => ({
          id: claim.id,
          taskId: claim.task_id,
          title:
            w.tasks.find((task) => task.id === claim.task_id)?.title ||
            "Reimbursement claim",
        })),
      },
      new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY }).inboxes
        .messages,
      messageId,
    );
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
