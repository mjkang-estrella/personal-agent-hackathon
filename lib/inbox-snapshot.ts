import { AgentMailClient } from "agentmail";
import { readImportedGmail } from "./gmail/inbox";
import { pool } from "./db";
import { readInbox } from "./inbox";
import { scenarioInbox } from "./mail-agent";
import type { InboxSnapshot, Workspace } from "./types";

// The one place that decides which messages belong to a workspace.
export async function inboxSnapshot(
  id: string,
  w: Workspace,
  messageId?: string,
): Promise<InboxSnapshot> {
  if (w.scenario) return scenarioInbox(w, messageId);
  if (!w.demo) return readImportedGmail(w, messageId);
  if (messageId && messageId.length > 1000)
    return { connected: true, messages: [], limited: false };
  const claims = await pool.query<{ id: string; task_id: string }>(
    "SELECT id,task_id FROM jobswitch_claims WHERE workspace_id=$1",
    [id],
  );
  return readInbox(
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
}
