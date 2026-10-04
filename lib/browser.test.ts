import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { Browsers } from "@onkernel/sdk/resources/browsers/browsers";
import { Connections } from "@onkernel/sdk/resources/auth/connections";
import { Credentials } from "@onkernel/sdk/resources/credentials";
import { Profiles } from "@onkernel/sdk/resources/profiles";
import { pool } from "./db";
import { account, saveRunIfCurrent } from "./browser/store";
import { portalUrl, publicAccount, trustedKernelUrl } from "./browser/security";
import { intentHash, reviewAction } from "./browser/intent";
import { confirmRun, resumeRun } from "./browser/runner";
import { deleteAccount } from "./browser/service";
import type {
  BrowserAccount,
  BrowserIntent,
  StagehandAction,
} from "./browser/types";

process.env.KERNEL_API_KEY = "fictional-test-key";
afterEach(() => mock.restoreAll());
const intent: BrowserIntent = {
  goal: "Submit my fictional education reimbursement claim",
  outcome: "Submit the reimbursement claim",
  fields: [
    { name: "course_fee", label: "Course fee", value: "1200" },
    { name: "claim_type", label: "Claim type", value: "Education" },
  ],
  files: [{ documentId: "receipt-1", name: "Receipt.pdf" }],
};
function fixture(): BrowserAccount {
  return {
    id: "account-a",
    label: "Fictional HR",
    url: "https://portal.example.com/login",
    profile: "private-profile",
    credential: "private-credential",
    connectionId: "private-connection",
    status: "connected",
    run: {
      id: "run-a",
      intent: structuredClone(intent),
      intentHash: intentHash(intent),
      status: "running",
      message: "Working",
      steps: 0,
      history: [],
      sessionId: "private-browser",
      extensionLoaded: true,
    },
  };
}
const act = (
  description: string,
  method = "click",
  args?: string[],
): StagehandAction => ({
  selector: "xpath=//button[1]",
  description,
  method,
  arguments: args,
});

test("public account projection strips provider identifiers", () => {
  const value = JSON.stringify(publicAccount(fixture()));
  for (const secret of [
    "private-profile",
    "private-credential",
    "private-connection",
    "private-browser",
  ])
    assert.ok(!value.includes(secret));
  assert.ok(!value.includes("extensionLoaded"));
});
test("any change to the confirmed intent changes its hash", () => {
  const base = intentHash(intent);
  assert.equal(
    intentHash({ ...intent, fields: [...intent.fields].reverse() }),
    base,
  );
  for (const changed of [
    { ...intent, goal: intent.goal + "!" },
    { ...intent, outcome: "Delete my account" },
    {
      ...intent,
      fields: [{ ...intent.fields[0], value: "12000" }, intent.fields[1]],
    },
    { ...intent, files: [] },
  ])
    assert.notEqual(intentHash(changed), base);
});
test("entries must use confirmed values; unknown values pause", () => {
  assert.equal(
    reviewAction(
      act("Course fee input", "fill", ["%course_fee%"]),
      intent,
      false,
      false,
    ).kind,
    "auto",
  );
  assert.equal(
    reviewAction(
      act("Claim type", "selectOptionFromDropdown", ["Education"]),
      intent,
      false,
      false,
    ).kind,
    "auto",
  );
  assert.equal(
    reviewAction(
      act("Search policies box", "type", ["reimbursement"]),
      intent,
      false,
      false,
    ).kind,
    "auto",
  );
  for (const a of [
    act("Course fee input", "fill", ["%bank_account%"]),
    act("Course fee input", "fill", ["9999"]),
    act("Claim type", "selectOptionFromDropdown", ["Relocation"]),
    act("Notes", "fill", ["a", "b"]),
  ])
    assert.equal(reviewAction(a, intent, false, false).kind, "pause");
});
test("only the planner-declared, unused outcome may run; keywords alone pause", () => {
  assert.equal(
    reviewAction(act("Next page"), intent, false, false).kind,
    "auto",
  );
  assert.equal(
    reviewAction(act("Submit claim button"), intent, true, false).kind,
    "outcome",
  );
  assert.equal(
    reviewAction(act("Submit claim button"), intent, false, false).kind,
    "pause",
  );
  assert.equal(
    reviewAction(act("Submit claim button"), intent, true, true).kind,
    "pause",
  );
  assert.equal(
    reviewAction(act("Pay now"), { ...intent, outcome: null }, true, false)
      .kind,
    "pause",
  );
  assert.equal(
    reviewAction(act("Delete account"), intent, false, false).kind,
    "pause",
  );
  assert.equal(
    reviewAction(act("Reject all cookies"), intent, false, false).kind,
    "auto",
  );
  assert.equal(
    reviewAction(act("Submit form", "press", ["Enter"]), intent, false, false)
      .kind,
    "pause",
  );
  assert.equal(
    reviewAction(act("Run script", "evaluate"), intent, false, false).kind,
    "pause",
  );
  assert.equal(
    reviewAction(act("Field", "press", ["Control+A"]), intent, false, false)
      .kind,
    "pause",
  );
});
test("confirmation requires the reviewed plan and complete values", async () => {
  const a = fixture();
  a.run!.status = "draft";
  await assert.rejects(
    confirmRun("workspace-a", a, intent, "0".repeat(64)),
    /changed/,
  );
  const empty = { ...intent, fields: [{ ...intent.fields[0], value: " " }] };
  await assert.rejects(
    confirmRun("workspace-a", a, empty, a.run!.intentHash),
    /every value/,
  );
  assert.equal(a.run!.status, "draft");
});
test("an outcome with an unknown result cannot be resumed", async () => {
  const a = fixture();
  a.run!.status = "paused";
  a.run!.outcome = { status: "unknown", at: "now" };
  await assert.rejects(resumeRun("workspace-a", a), /live browser/);
});
test("run saves are fenced to the same running run", async () => {
  const q = mock.method(
    pool,
    "query",
    async (sql: string, values: string[]) => {
      assert.match(
        sql,
        /data->'run'->>'id'=\$4 AND data->'run'->>'status'='running'/,
      );
      assert.equal(values[3], "run-a");
      return { rowCount: 0, rows: [] };
    },
  );
  assert.equal(
    await saveRunIfCurrent("workspace-a", fixture(), "run-a"),
    false,
  );
  assert.equal(q.mock.callCount(), 1);
});
test("portal and handoff validation reject credential URLs and untrusted destinations", () => {
  for (const url of [
    "http://company.com",
    "https://user:pass@company.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://[::1]",
    "https://portal.internal",
    "https://company.com:444",
    "https://company.com/?token=secret",
    "https://company.com/#token",
  ])
    assert.throws(() => portalUrl(url));
  assert.equal(
    portalUrl("https://portal.company.com/login").hostname,
    "portal.company.com",
  );
  assert.throws(() => trustedKernelUrl("https://kernel.com.attacker.com/"));
  assert.throws(() => trustedKernelUrl("javascript:alert(1)"));
  assert.equal(
    trustedKernelUrl("https://auth.kernel.com/login/fictional"),
    "https://auth.kernel.com/login/fictional",
  );
});
test("account lookup is always scoped by workspace", async () => {
  const q = mock.method(
    pool,
    "query",
    async (sql: string, values: string[]) => {
      assert.match(sql, /workspace_id=\$1 AND id=\$2/);
      assert.deepEqual(values, ["workspace-b", "account-a"]);
      return { rows: [] };
    },
  );
  await assert.rejects(account("workspace-b", "account-a"), /not found/);
  assert.equal(q.mock.callCount(), 1);
});
test("deletion fences execution and retains cleanup handles on provider failure", async () => {
  const a = fixture();
  const writes: BrowserAccount[] = [];
  mock.method(pool, "query", async (_sql: string, values: string[]) => {
    writes.push(JSON.parse(values[2]));
    return { rowCount: 1, rows: [] };
  });
  mock.method(Browsers.prototype, "deleteByID", async () => {
    throw new Error("Provider unavailable");
  });
  await assert.rejects(deleteAccount("workspace-a", a));
  assert.equal(writes[0].status, "deleting");
  assert.equal(a.run!.status, "closed");
  assert.equal(a.run!.sessionId, "private-browser");
  assert.equal(a.credential, "private-credential");
});
test("deletion removes browser, auth, credentials and profile before local record", async () => {
  const a = fixture();
  const events: string[] = [];
  mock.method(pool, "query", async (sql: string) => {
    if (sql.startsWith("DELETE")) events.push("local");
    return { rowCount: 1, rows: [] };
  });
  mock.method(Browsers.prototype, "deleteByID", async () => {
    events.push("browser");
  });
  mock.method(Connections.prototype, "delete", async () => {
    events.push("auth");
  });
  mock.method(Connections.prototype, "list", () => ({
    async *[Symbol.asyncIterator]() {},
  }));
  mock.method(Credentials.prototype, "delete", async () => {
    events.push("credential");
  });
  mock.method(Profiles.prototype, "delete", async () => {
    events.push("profile");
  });
  await deleteAccount("workspace-a", a);
  assert.deepEqual(events, [
    "browser",
    "auth",
    "credential",
    "profile",
    "local",
  ]);
});
