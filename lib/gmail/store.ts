import { pool } from "../db";
import type { Workspace } from "../types";
import { unseal } from "./security";
import { tokenRequest, GmailRevoked } from "./client";
export interface Connection {
  workspace_id: string;
  generation: string;
  email: string | null;
  encrypted_refresh: string | null;
  status: "connecting" | "connected" | "reconnect";
}
export async function connection(id: string): Promise<Connection | undefined> {
  return (
    await pool.query(
      "SELECT * FROM jobswitch_gmail_connections WHERE workspace_id=$1",
      [id],
    )
  ).rows[0];
}
export async function access(id: string) {
  const c = await connection(id);
  if (!c || c.status !== "connected" || !c.encrypted_refresh)
    throw new Error("Please connect Gmail first.");
  try {
    const token = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: unseal(c.encrypted_refresh, id),
    });
    return { token: token.access_token, connection: c };
  } catch (e) {
    if (e instanceof GmailRevoked)
      await pool.query(
        "UPDATE jobswitch_gmail_connections SET status='reconnect' WHERE workspace_id=$1 AND generation=$2",
        [id, c.generation],
      );
    throw e;
  }
}
// Serialize disconnect/reconnect against applying in-flight Gmail results.
export async function mutateConnected(
  id: string,
  generation: string,
  fn: (w: Workspace) => void,
) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const c = await db.query(
      "SELECT generation FROM jobswitch_gmail_connections WHERE workspace_id=$1 AND generation=$2 AND status='connected' FOR UPDATE",
      [id, generation],
    );
    if (!c.rowCount)
      throw new Error("Your Gmail connection changed. Please try again.");
    const r = await db.query(
      "SELECT data FROM jobswitch_workspaces WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!r.rowCount) throw new Error("Workspace not found.");
    const w: Workspace = r.rows[0].data;
    fn(w);
    await db.query(
      "UPDATE jobswitch_workspaces SET data=$2,version=version+1,updated_at=now() WHERE id=$1",
      [id, JSON.stringify(w)],
    );
    await db.query("COMMIT");
    return w;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
