import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../db";
import { makePersonalWorkspace } from "../fixtures";

async function insertWorkspace(client: PoolClient) {
  const id = randomUUID();
  await client.query(
    "INSERT INTO jobswitch_workspaces(id,data) VALUES($1,$2)",
    [id, JSON.stringify(makePersonalWorkspace())],
  );
  return id;
}

// Serialize account creation/restoration, and claim a guest workspace at most once.
// Provider user IDs come exclusively from a verified server session, never a form.
export async function accountWorkspace(
  userId: string,
  candidate?: string,
  fresh = false,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO jobswitch_accounts(user_id) VALUES($1) ON CONFLICT DO NOTHING",
      [userId],
    );
    const account = (
      await client.query(
        "SELECT active_workspace_id FROM jobswitch_accounts WHERE user_id=$1 FOR UPDATE",
        [userId],
      )
    ).rows[0];
    let id: string | undefined;
    if (!fresh && candidate) {
      const owner = (
        await client.query(
          "SELECT user_id FROM jobswitch_workspace_owners WHERE workspace_id=$1",
          [candidate],
        )
      ).rows[0];
      if (owner?.user_id === userId) id = candidate;
    }
    if (!fresh && !id) id = account.active_workspace_id;
    if (!id) {
      id = await insertWorkspace(client);
      await client.query(
        "INSERT INTO jobswitch_workspace_owners(workspace_id,user_id) VALUES($1,$2)",
        [id, userId],
      );
      // Only the first sign-in saves the guest's demo or practice progress, and
      // only as a secondary workspace. Returning users restore their own account,
      // even on a shared browser with someone else's cookie.
      if (!fresh && candidate && !account.active_workspace_id)
        await client.query(
          "INSERT INTO jobswitch_workspace_owners(workspace_id,user_id) SELECT id,$2 FROM jobswitch_workspaces WHERE id=$1 ON CONFLICT DO NOTHING",
          [candidate, userId],
        );
    }
    await client.query(
      "UPDATE jobswitch_accounts SET active_workspace_id=$2 WHERE user_id=$1",
      [userId, id],
    );
    await client.query("COMMIT");
    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Accounts created before personal workspaces were blank only own demo data.
// Give them a personal workspace on sign-in; returns its ID when one was created.
export async function ensurePersonalWorkspace(userId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO jobswitch_accounts(user_id) VALUES($1) ON CONFLICT DO NOTHING",
      [userId],
    );
    await client.query(
      "SELECT 1 FROM jobswitch_accounts WHERE user_id=$1 FOR UPDATE",
      [userId],
    );
    const personal = await client.query(
      `SELECT 1 FROM jobswitch_workspace_owners o JOIN jobswitch_workspaces w ON w.id=o.workspace_id
       WHERE o.user_id=$1 AND w.data->>'demo' IS DISTINCT FROM 'true' LIMIT 1`,
      [userId],
    );
    let id: string | undefined;
    if (!personal.rowCount) {
      id = await insertWorkspace(client);
      await client.query(
        "INSERT INTO jobswitch_workspace_owners(workspace_id,user_id) VALUES($1,$2)",
        [id, userId],
      );
      await client.query(
        "UPDATE jobswitch_accounts SET active_workspace_id=$2 WHERE user_id=$1",
        [userId, id],
      );
    }
    await client.query("COMMIT");
    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function workspaceOwner(id: string) {
  return (
    await pool.query(
      "SELECT user_id FROM jobswitch_workspace_owners WHERE workspace_id=$1",
      [id],
    )
  ).rows[0]?.user_id as string | undefined;
}

export async function ownedWorkspaces(userId: string) {
  return (
    await pool.query(
      `SELECT w.id, w.data->>'demo' = 'true' AS demo,
      w.data->'profile'->>'previousEmployer' AS "previousEmployer",
      w.data->'profile'->>'nextEmployer' AS "nextEmployer"
     FROM jobswitch_workspaces w JOIN jobswitch_workspace_owners o ON o.workspace_id=w.id
     WHERE o.user_id=$1 ORDER BY w.created_at DESC`,
      [userId],
    )
  ).rows;
}
