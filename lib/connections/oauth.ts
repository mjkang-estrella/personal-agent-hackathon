import { randomBytes, randomUUID } from "node:crypto";
import { pool } from "../db";
import {
  challenge,
  hash,
  seal,
  unseal,
  senderAddress,
} from "../gmail/security";
import { config, requireScope, type Service } from "./config";
import { binding, tokenRequest } from "./store";
export async function begin(id: string, service: Service) {
  const c = config(service),
    state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(32).toString("base64url"),
    generation = randomUUID();
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const r = await db.query(
      "INSERT INTO jobswitch_connections(workspace_id,service,generation,status) VALUES($1,$2,$3,'connecting') ON CONFLICT(workspace_id,service) DO UPDATE SET generation=$3 WHERE jobswitch_connections.status='connecting' RETURNING generation",
      [id, service, generation],
    );
    if (!r.rowCount)
      throw new Error(
        "Please disconnect this service before connecting another account.",
      );
    await db.query(
      "INSERT INTO jobswitch_connection_states(state_hash,workspace_id,service,generation,encrypted_verifier,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes') ON CONFLICT(workspace_id,service) DO UPDATE SET state_hash=$1,generation=$4,encrypted_verifier=$5,expires_at=EXCLUDED.expires_at",
      [
        hash(state),
        id,
        service,
        generation,
        seal(verifier, binding(id, service)),
      ],
    );
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
  const url = new URL(c.authorize);
  url.search = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirect,
    response_type: "code",
    scope: c.scopes,
    state,
    code_challenge: challenge(verifier),
    code_challenge_method: "S256",
    prompt: "consent",
    ...(c.google ? { access_type: "offline" } : {}),
  }).toString();
  return url.href;
}
export async function finish(id: string, state: string, code: string | null) {
  if (!/^[a-zA-Z0-9_-]{43}$/.test(state))
    throw new Error("Please restart this expired sign-in.");
  const result = await pool.query(
    "DELETE FROM jobswitch_connection_states WHERE workspace_id=$1 AND state_hash=$2 AND expires_at>now() RETURNING *",
    [id, hash(state)],
  );
  const saved = result.rows[0];
  if (!saved) throw new Error("Please restart this expired sign-in.");
  const service: Service = saved.service,
    c = config(service);
  if (!code) return { origin: c.origin, connected: false };
  const token = await tokenRequest(service, {
    grant_type: "authorization_code",
    code,
    redirect_uri: c.redirect,
    code_verifier: unseal(saved.encrypted_verifier, binding(id, service)),
  });
  requireScope(service, token.scope);
  if (!token.refresh_token)
    throw new Error("Please grant offline access and reconnect.");
  const response = await fetch(
    c.google
      ? "https://openidconnect.googleapis.com/v1/userinfo"
      : "https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName",
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
      redirect: "error",
    },
  );
  if (!response.ok) throw new Error("Please try verifying your account again.");
  const profile = await response.json();
  const account = c.google ? profile.sub : profile.id;
  const email = senderAddress(
    c.google
      ? profile.email || ""
      : profile.mail || profile.userPrincipalName || "",
  );
  if (
    typeof account !== "string" ||
    !account ||
    !email ||
    (c.google && profile.email_verified !== true)
  )
    throw new Error("Please use an account with a verified email address.");
  const r = await pool.query(
    "UPDATE jobswitch_connections SET account_id=$4,email=$5,encrypted_refresh=$6,status='connected',updated_at=now() WHERE workspace_id=$1 AND service=$2 AND generation=$3 AND status='connecting' RETURNING generation",
    [
      id,
      service,
      saved.generation,
      account,
      email,
      seal(token.refresh_token, binding(id, service)),
    ],
  );
  if (!r.rowCount)
    throw new Error("Your connection changed. Please try again.");
  return { origin: c.origin, connected: true };
}
