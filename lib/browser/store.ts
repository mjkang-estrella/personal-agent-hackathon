import { pool } from "../db";
import type { BrowserAccount } from "./types";

export async function accounts(workspace: string): Promise<BrowserAccount[]> {
  return (
    await pool.query(
      "SELECT data FROM jobswitch_browser_accounts WHERE workspace_id=$1 ORDER BY created_at DESC",
      [workspace],
    )
  ).rows.map((r) => r.data);
}
export async function account(
  workspace: string,
  id: string,
): Promise<BrowserAccount> {
  const r = await pool.query(
    "SELECT data FROM jobswitch_browser_accounts WHERE workspace_id=$1 AND id=$2",
    [workspace, id],
  );
  if (!r.rows[0]) throw new Error("Account not found.");
  return r.rows[0].data;
}
export async function saveAccount(workspace: string, a: BrowserAccount) {
  const r = await pool.query(
    "UPDATE jobswitch_browser_accounts SET data=$3 WHERE workspace_id=$1 AND id=$2 RETURNING id",
    [workspace, a.id, JSON.stringify(a)],
  );
  if (!r.rowCount) throw new Error("Account not found.");
}
