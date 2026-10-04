// Uses the configured development DB, isolated disposable workspaces, and fake Google HTTP responses.
// No mailbox is accessed and no outgoing email is sent.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, getWorkspace, mutate } from "../lib/db";
import { beginConnect, finishConnect, disconnect } from "../lib/gmail/oauth";
import { access, connection, mutateConnected } from "../lib/gmail/store";
import { trackThread, listThreads, syncGmail } from "../lib/gmail/sync";
import { GMAIL_SCOPE } from "../lib/gmail/security";
const ids = [randomUUID(), randomUUID()];
const originalFetch = globalThis.fetch;
let revoke = false,
  invalidGrant = false,
  disconnectDuringExchange = false;
const requests: string[] = [];
globalThis.fetch = async (input, init) => {
  const url = String(input);
  requests.push(url);
  if (url === "https://oauth2.googleapis.com/token") {
    const form = new URLSearchParams(String(init?.body));
    if (
      disconnectDuringExchange &&
      form.get("grant_type") === "authorization_code"
    ) {
      disconnectDuringExchange = false;
      await disconnect(ids[0]);
    }
    if (invalidGrant)
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    if (form.get("grant_type") === "authorization_code")
      assert.ok(form.get("code_verifier"));
    return Response.json({
      access_token: "fake-access",
      refresh_token: "fake-refresh",
      scope: GMAIL_SCOPE,
    });
  }
  if (url === "https://oauth2.googleapis.com/revoke") {
    revoke = true;
    return new Response(null, { status: 200 });
  }
  if (url.endsWith("/profile"))
    return Response.json({ emailAddress: "fictional-user@example.com" });
  if (url.includes("/threads/abc"))
    return Response.json({
      messages: [
        {
          id: "123",
          threadId: "abc",
          internalDate: "1700000000000",
          payload: {
            headers: [
              { name: "From", value: "HR <hr@example.com>" },
              { name: "Subject", value: "Fictional claim" },
            ],
          },
        },
      ],
    });
  if (url.includes("/threads?"))
    return Response.json({ threads: [{ id: "abc" }] });
  throw new Error("Unexpected external request in Gmail smoke test.");
};
try {
  for (const id of ids) await getWorkspace(id);
  await mutate(ids[0], (w) => {
    w.demo = false;
  });
  let url = new URL(await beginConnect(ids[0]));
  const state = url.searchParams.get("state")!;
  assert.equal(url.searchParams.get("scope"), GMAIL_SCOPE);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  await assert.rejects(finishConnect(ids[1], state, "fake-code"));
  assert.equal(await finishConnect(ids[0], state, "fake-code"), true);
  await assert.rejects(finishConnect(ids[0], state, "fake-code"));
  const c = (await connection(ids[0]))!;
  assert.notEqual(c.encrypted_refresh, "fake-refresh");
  assert.equal((await access(ids[0])).token, "fake-access");
  assert.equal((await listThreads(ids[0], "hr@example.com")).length, 1);
  await assert.rejects(
    trackThread(ids[0], "learning", "abc", "other@example.com"),
  );
  const tracked = await trackThread(
    ids[0],
    "learning",
    "abc",
    "hr@example.com",
  );
  assert.equal(tracked.tasks[0].gmail?.threadId, "abc");
  assert.equal(tracked.tasks[0].status, "waiting");
  await assert.rejects(
    trackThread(ids[0], "learning", "abc", "hr@example.com"),
  );
  const checked = await syncGmail(ids[0]);
  assert.ok(checked.tasks[0].processedMessageIds?.includes("gmail:123"));
  assert.equal(checked.tasks[0].status, "waiting");
  assert.equal(checked.activity[0].title, "Review an HR reply in Gmail");
  const before = requests.length;
  await syncGmail(ids[1]);
  assert.equal(requests.length, before);
  invalidGrant = true;
  await assert.rejects(access(ids[0]));
  assert.equal((await connection(ids[0]))?.status, "reconnect");
  invalidGrant = false;
  await disconnect(ids[0]);
  assert.equal(revoke, false);
  assert.equal(await connection(ids[0]), undefined);
  assert.equal((await getWorkspace(ids[0])).tasks[0].gmail, undefined);
  await assert.rejects(
    mutateConnected(ids[0], c.generation, () => {
      throw new Error("Stale callback executed");
    }),
  );
  url = new URL(await beginConnect(ids[0]));
  disconnectDuringExchange = true;
  await assert.rejects(
    finishConnect(ids[0], url.searchParams.get("state")!, "fake-code"),
  );
  assert.equal(await connection(ids[0]), undefined);
  url = new URL(await beginConnect(ids[0]));
  await pool.query(
    "UPDATE jobswitch_gmail_oauth_states SET expires_at=now()-interval '1 minute' WHERE workspace_id=$1",
    [ids[0]],
  );
  await assert.rejects(
    finishConnect(ids[0], url.searchParams.get("state")!, "fake-code"),
  );
  console.log(
    "Gmail smoke passed: OAuth replay/expiry/workspace isolation, encrypted storage, refresh/reconnect and local-only disconnect, sender binding, disconnect race. All Google HTTP calls mocked.",
  );
} finally {
  globalThis.fetch = originalFetch;
  await pool.query(
    "DELETE FROM jobswitch_workspaces WHERE id=ANY($1::uuid[])",
    [ids],
  );
  await pool.end();
}
