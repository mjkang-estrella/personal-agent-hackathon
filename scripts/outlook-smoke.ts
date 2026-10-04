// Uses the configured development DB, isolated disposable workspaces, and fake Microsoft HTTP responses.
// No mailbox is accessed and no outgoing email is sent.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, getWorkspace, mutate } from "../lib/db";
import { beginConnect, finishConnect, disconnect } from "../lib/outlook/oauth";
import { access, connection, mutateConnected } from "../lib/outlook/store";
import { trackThread, listThreads, syncOutlook } from "../lib/outlook/sync";
import { OUTLOOK_SCOPE } from "../lib/outlook/security";
process.env.MICROSOFT_CLIENT_ID = "fixture-client";
process.env.MICROSOFT_CLIENT_SECRET = "fixture-secret";
process.env.MICROSOFT_REDIRECT_URI =
  "http://localhost:3001/api/outlook/callback";
process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
  "base64",
);
const ids = [randomUUID(), randomUUID()];
const originalFetch = globalThis.fetch;
let invalidGrant = false,
  disconnectDuringExchange = false;
const requests: string[] = [];
globalThis.fetch = async (input, init) => {
  const url = String(input);
  requests.push(url);
  if (url === "https://login.microsoftonline.com/common/oauth2/v2.0/token") {
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
      scope: OUTLOOK_SCOPE,
    });
  }
  if (url.includes("/v1.0/me/?"))
    return Response.json({ mail: "fictional-user@example.com" });
  if (url.includes("/mailFolders/inbox/messages"))
    return Response.json({
      value: [
        {
          id: "123",
          conversationId: "abc",
          receivedDateTime: "2026-10-01T10:00:00Z",
          isDraft: false,
          from: { emailAddress: { address: "hr@example.com" } },
          subject: "Fictional claim",
        },
      ],
    });
  throw new Error("Unexpected external request in Outlook smoke test.");
};
try {
  for (const id of ids) await getWorkspace(id);
  await mutate(ids[0], (w) => {
    w.demo = false;
  });
  let url = new URL(await beginConnect(ids[0]));
  const state = url.searchParams.get("state")!;
  assert.equal(
    url.searchParams.get("scope"),
    `offline_access User.Read ${OUTLOOK_SCOPE}`,
  );
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
  assert.equal(tracked.tasks[0].outlook?.threadId, "abc");
  assert.equal(tracked.tasks[0].status, "waiting");
  await assert.rejects(
    trackThread(ids[0], "learning", "abc", "hr@example.com"),
  );
  const checked = await syncOutlook(ids[0]);
  assert.ok(checked.tasks[0].processedMessageIds?.includes("outlook:123"));
  assert.equal(checked.tasks[0].status, "waiting");
  assert.equal(checked.activity[0].title, "Review an HR reply in Outlook");
  const before = requests.length;
  await syncOutlook(ids[1]);
  assert.equal(requests.length, before);
  invalidGrant = true;
  await assert.rejects(access(ids[0]));
  assert.equal((await connection(ids[0]))?.status, "reconnect");
  invalidGrant = false;
  await disconnect(ids[0]);
  assert.equal(await connection(ids[0]), undefined);
  assert.equal((await getWorkspace(ids[0])).tasks[0].outlook, undefined);
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
    "UPDATE jobswitch_outlook_oauth_states SET expires_at=now()-interval '1 minute' WHERE workspace_id=$1",
    [ids[0]],
  );
  await assert.rejects(
    finishConnect(ids[0], url.searchParams.get("state")!, "fake-code"),
  );
  console.log(
    "Outlook smoke passed: OAuth replay/expiry/workspace isolation, encrypted storage, refresh/reconnect, sender binding, disconnect race. All Microsoft HTTP calls mocked.",
  );
} finally {
  globalThis.fetch = originalFetch;
  await pool.query(
    "DELETE FROM jobswitch_workspaces WHERE id=ANY($1::uuid[])",
    [ids],
  );
  await pool.end();
}
