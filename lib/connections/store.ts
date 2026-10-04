import { pool } from "../db";
import { seal, unseal } from "../gmail/security";
import { config, requireScope, type Service } from "./config";
import { z } from "zod";
export interface Connection {
  workspace_id: string;
  service: Service;
  generation: string;
  account_id: string;
  email: string;
  encrypted_refresh: string;
  status: "connecting" | "connected" | "reconnect";
}
export const binding = (id: string, service: Service) =>
  `connections:${service}:${id}`;
export async function connection(
  id: string,
  service: Service,
): Promise<Connection | undefined> {
  return (
    await pool.query(
      "SELECT * FROM jobswitch_connections WHERE workspace_id=$1 AND service=$2",
      [id, service],
    )
  ).rows[0];
}
export class Reconnect extends Error {
  constructor() {
    super("Please disconnect and reconnect this service.");
  }
}
export async function tokenRequest(
  service: Service,
  fields: Record<string, string>,
) {
  const c = config(service);
  const r = await fetch(c.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      ...fields,
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => ({}));
    if (["invalid_grant", "interaction_required"].includes(error.error))
      throw new Reconnect();
    throw new Error("Please try connecting this service again.");
  }
  return z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().optional(),
      scope: z.string().optional(),
    })
    .parse(await r.json());
}
// Call refresh and all connection writes inside the workspace advisory lock.
export async function access(id: string, service: Service) {
  const c = await connection(id, service);
  if (!c || c.status !== "connected" || !c.encrypted_refresh)
    throw new Reconnect();
  try {
    const token = await tokenRequest(service, {
      grant_type: "refresh_token",
      refresh_token: unseal(c.encrypted_refresh, binding(id, service)),
    });
    if (token.scope) requireScope(service, token.scope);
    if (token.refresh_token) {
      const r = await pool.query(
        "UPDATE jobswitch_connections SET encrypted_refresh=$4,updated_at=now() WHERE workspace_id=$1 AND service=$2 AND generation=$3 AND status='connected' RETURNING generation",
        [
          id,
          service,
          c.generation,
          seal(token.refresh_token, binding(id, service)),
        ],
      );
      if (!r.rowCount) throw new Reconnect();
    }
    return { token: token.access_token, connection: c };
  } catch (e) {
    if (e instanceof Reconnect)
      await pool.query(
        "UPDATE jobswitch_connections SET status='reconnect' WHERE workspace_id=$1 AND service=$2 AND generation=$3",
        [id, service, c.generation],
      );
    throw e;
  }
}
export async function disconnect(id: string, service?: Service) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      "DELETE FROM jobswitch_connection_states WHERE workspace_id=$1 AND ($2::text IS NULL OR service=$2)",
      [id, service || null],
    );
    await db.query(
      "DELETE FROM jobswitch_connections WHERE workspace_id=$1 AND ($2::text IS NULL OR service=$2)",
      [id, service || null],
    );
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
  // Per-feature disconnect must not revoke other grants issued to the same app.
  // Keep calendar receipts and imported evidence after disconnect.
}
