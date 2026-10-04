import { randomBytes, randomUUID } from "node:crypto";
import { pool } from "../db";
import {
  challenge,
  GMAIL_SCOPE,
  gmailConfig,
  hash,
  seal,
  unseal,
} from "./security";
import { gmailGet, requireReadScope, tokenRequest } from "./client";

export async function beginConnect(id: string) {
  const c = gmailConfig();
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(32).toString("base64url"),
    generation = randomUUID();
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const r = await db.query(
      "INSERT INTO jobswitch_gmail_connections(workspace_id,generation,status) VALUES($1,$2,'connecting') ON CONFLICT(workspace_id) DO UPDATE SET generation=$2,updated_at=now() WHERE jobswitch_gmail_connections.status='connecting' RETURNING generation",
      [id, generation],
    );
    if (!r.rowCount)
      throw new Error(
        "Please disconnect your current Gmail account before connecting another.",
      );
    await db.query(
      "INSERT INTO jobswitch_gmail_oauth_states(state_hash,workspace_id,generation,encrypted_verifier,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes') ON CONFLICT(workspace_id) DO UPDATE SET state_hash=$1,generation=$3,encrypted_verifier=$4,expires_at=EXCLUDED.expires_at",
      [hash(state), id, generation, seal(verifier, id)],
    );
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirect,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: challenge(verifier),
    code_challenge_method: "S256",
  }).toString();
  return url.href;
}
export async function finishConnect(
  id: string,
  state: string,
  code: string | null,
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(state))
    throw new Error("Your Gmail sign-in expired. Please try again.");
  const r = await pool.query(
    "DELETE FROM jobswitch_gmail_oauth_states WHERE state_hash=$1 AND workspace_id=$2 AND expires_at>now() RETURNING generation,encrypted_verifier",
    [hash(state), id],
  );
  const saved = r.rows[0];
  if (!saved) throw new Error("Your Gmail sign-in expired. Please try again.");
  if (!code) return false;
  const c = gmailConfig();
  const token = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: c.redirect,
    code_verifier: unseal(saved.encrypted_verifier, id),
  });
  requireReadScope(token.scope);
  if (!token.refresh_token)
    throw new Error("Please grant offline Gmail access and try again.");
  const profile = await gmailGet(token.access_token, "profile");
  if (typeof profile.emailAddress !== "string")
    throw new Error("Gmail account could not be verified.");
  const updated = await pool.query(
    "UPDATE jobswitch_gmail_connections SET email=$3,encrypted_refresh=$4,status='connected',updated_at=now() WHERE workspace_id=$1 AND generation=$2 AND status='connecting'",
    [id, saved.generation, profile.emailAddress, seal(token.refresh_token, id)],
  );
  if (!updated.rowCount)
    throw new Error("Your Gmail connection changed. Please try again.");
  return true;
}
export async function disconnect(id: string) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      "DELETE FROM jobswitch_gmail_connections WHERE workspace_id=$1",
      [id],
    );
    await db.query(
      "DELETE FROM jobswitch_gmail_oauth_states WHERE workspace_id=$1",
      [id],
    );
    const w = await db.query(
      "SELECT data FROM jobswitch_workspaces WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (w.rows[0]) {
      const data = w.rows[0].data;
      for (const t of data.tasks) delete t.gmail;
      await db.query(
        "UPDATE jobswitch_workspaces SET data=$2,version=version+1 WHERE id=$1",
        [id, JSON.stringify(data)],
      );
    }
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
  // Google revokes the whole app grant, including other services/workspaces.
  // Local disconnect preserves those connections; users can revoke the whole
  // app explicitly in Google Account permissions.
  return { disconnected: true, revoked: false };
}
