import pg from "pg";
import { randomUUID } from "node:crypto";
import { makeWorkspace } from "./fixtures";
import type { Workspace, Activity } from "./types";
const globals = globalThis as unknown as {
  jobswitchPool?: pg.Pool;
  jobswitchLockPool?: pg.Pool;
};
export const pool =
  globals.jobswitchPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
  });
globals.jobswitchPool = pool;
// Locks can span model calls. A separate bounded pool leaves query connections
// available when several workspaces run concurrently.
export const lockPool =
  globals.jobswitchLockPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
  });
globals.jobswitchLockPool = lockPool;
export async function getWorkspace(id: string): Promise<Workspace> {
  const r = await pool.query(
    "SELECT data FROM jobswitch_workspaces WHERE id=$1",
    [id],
  );
  if (r.rows[0]) return r.rows[0].data;
  const w = makeWorkspace();
  await pool.query(
    "INSERT INTO jobswitch_workspaces(id,data) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [id, JSON.stringify(w)],
  );
  return (
    await pool.query("SELECT data FROM jobswitch_workspaces WHERE id=$1", [id])
  ).rows[0].data;
}
export async function mutate(id: string, fn: (w: Workspace) => void) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      "SELECT data FROM jobswitch_workspaces WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!r.rows[0]) throw new Error("Workspace not found.");
    const w: Workspace = r.rows[0].data;
    fn(w);
    await client.query(
      "UPDATE jobswitch_workspaces SET data=$2,version=version+1,updated_at=now() WHERE id=$1",
      [id, JSON.stringify(w)],
    );
    await client.query("COMMIT");
    return w;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export function activity(
  w: Workspace,
  title: string,
  detail: string,
  type: Activity["type"] = "agent",
) {
  w.activity.unshift({
    id: randomUUID(),
    at: new Date().toISOString(),
    title,
    detail,
    type,
  });
  w.activity = w.activity.slice(0, 100);
}

// Transaction-scoped advisory locks work with Neon's transaction pooler.
// Keep this separate from row mutations so state/progress remains readable.
export async function withWorkspaceLock<T>(
  id: string,
  fn: () => Promise<T>,
): Promise<T> {
  const client = await lockPool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS locked",
      [id],
    );
    if (!result.rows[0].locked)
      throw new Error(
        "Your agent is finishing a step. Please try again shortly.",
      );
    const value = await fn();
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
