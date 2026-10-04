import Kernel from "@onkernel/sdk";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { pool } from "../db";
import { account, accounts, saveAccount } from "./store";
import { portalUrl, trustedKernelUrl } from "./security";
import type { BrowserAccount } from "./types";

export const kernel = () =>
  new Kernel({
    apiKey: process.env.KERNEL_API_KEY,
    maxRetries: 0,
    timeout: 45000,
  });
export const browserConfigured = () => !!process.env.KERNEL_API_KEY;

export async function publicPortal(raw: string) {
  const u = portalUrl(raw);
  // Reject private endpoints before asking the remote browser to visit them.
  const addresses = await lookup(u.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) =>
      address.includes(":")
        ? /^(::|fc|fd|fe[89ab])/i.test(address)
        : /^(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7]))\./.test(
            address,
          ),
    )
  ) {
    throw new Error("Choose a public portal address.");
  }
  return u;
}

export async function connectAccount(
  workspace: string,
  input: { label: string; url: string; username?: string; password?: string },
) {
  if ((await accounts(workspace)).length >= 10)
    throw new Error("Remove an account before adding another.");
  const url = await publicPortal(input.url);
  const id = randomUUID();
  const a: BrowserAccount = {
    id,
    label: input.label,
    url: url.href,
    profile: `jobswitch-${id}`,
    status: "creating",
    credential: input.password ? `jobswitch-${id}` : undefined,
  };
  // Persist cleanup handles before external writes. Failed setup remains deletable.
  await pool.query(
    "INSERT INTO jobswitch_browser_accounts(id,workspace_id,data) VALUES($1,$2,$3)",
    [id, workspace, JSON.stringify(a)],
  );
  const k = kernel();
  try {
    if (a.credential)
      await k.credentials.create({
        name: a.credential,
        domain: url.hostname,
        values: { username: input.username!, password: input.password! },
      });
    const c = await k.auth.connections.create({
      domain: url.hostname,
      login_url: url.href,
      profile_name: a.profile,
      allowed_domains: [url.hostname],
      health_checks: false,
      auto_reauth: false,
      record_session: false,
      save_credentials: !!a.credential,
      credential: a.credential ? { name: a.credential } : undefined,
      browser: { stealth: false, telemetry: { enabled: false } },
    });
    a.connectionId = c.id;
    a.status = "needs_login";
    await saveAccount(workspace, a);
    await k.auth.connections.login(c.id, { record_session: false });
  } catch {
    a.status = "error";
    await saveAccount(workspace, a);
    throw new Error(
      "Account setup could not finish. Refresh the list, then reconnect or delete the account.",
    );
  }
}

export async function refreshAccount(workspace: string, a: BrowserAccount) {
  if (!a.connectionId || a.status === "deleting") return a;
  const c = await kernel().auth.connections.retrieve(a.connectionId);
  a.status =
    c.status === "AUTHENTICATED" && c.flow_status !== "IN_PROGRESS"
      ? "connected"
      : "needs_login";
  await saveAccount(workspace, a);
  return a;
}

export async function loginAccount(workspace: string, a: BrowserAccount) {
  if (!a.connectionId || a.status === "deleting")
    throw new Error("Delete this incomplete account and connect again.");
  await closeRun(workspace, a);
  const k = kernel();
  const c = await k.auth.connections.retrieve(a.connectionId);
  if (c.flow_status !== "IN_PROGRESS")
    await k.auth.connections.login(a.connectionId, { record_session: false });
  a.status = "needs_login";
  await saveAccount(workspace, a);
}

export async function handoffUrl(
  workspace: string,
  id: string,
  kind: "login" | "browser",
) {
  const a = await account(workspace, id);
  if (a.status === "deleting") throw new Error("Account is disconnected.");
  if (kind === "login" && a.connectionId) {
    const c = await kernel().auth.connections.retrieve(a.connectionId);
    if (c.hosted_url && c.flow_status === "IN_PROGRESS")
      return trustedKernelUrl(c.hosted_url);
  }
  if (kind === "browser" && a.run?.sessionId && a.run.status !== "closed") {
    const b = await kernel().browsers.retrieve(a.run.sessionId);
    if (b.browser_live_view_url)
      return trustedKernelUrl(b.browser_live_view_url);
  }
  throw new Error(
    "The session expired. Reconnect the account or start a new browser task.",
  );
}

async function ignoreMissing(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    if (!(e instanceof Kernel.APIError && e.status === 404)) throw e;
  }
}

export async function closeRun(workspace: string, a: BrowserAccount) {
  if (!a.run) return;
  if (a.run.status === "closed") return;
  a.run.status = "closed";
  await saveAccount(workspace, a);
  // Delete by deterministic name as well, to recover an ambiguous create response.
  await ignoreMissing(() =>
    kernel().browsers.deleteByID(
      a.run!.sessionId || `jobswitch-run-${a.run!.id}`,
    ),
  );
  delete a.run.sessionId;
  delete a.run.extensionLoaded;
  a.run.message = "Browser closed. No more actions will run.";
  await saveAccount(workspace, a);
}

export async function deleteAccount(workspace: string, a: BrowserAccount) {
  a.status = "deleting";
  await saveAccount(workspace, a); // Fence execution before cleanup; retain handles on failure.
  await closeRun(workspace, a);
  const k = kernel();
  if (a.connectionId)
    await ignoreMissing(() => k.auth.connections.delete(a.connectionId!));
  // Also recover a connection whose create response was lost.
  for await (const c of k.auth.connections.list({ profile_name: a.profile }))
    await k.auth.connections.delete(c.id);
  if (a.credential)
    await ignoreMissing(() => k.credentials.delete(a.credential!));
  await ignoreMissing(() => k.profiles.delete(a.profile));
  await pool.query(
    "DELETE FROM jobswitch_browser_accounts WHERE workspace_id=$1 AND id=$2",
    [workspace, a.id],
  );
}
