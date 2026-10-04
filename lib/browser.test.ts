import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { Playwright } from "@onkernel/sdk/resources/browsers/playwright";
import { Browsers } from "@onkernel/sdk/resources/browsers/browsers";
import { Connections } from "@onkernel/sdk/resources/auth/connections";
import { Credentials } from "@onkernel/sdk/resources/credentials";
import { Profiles } from "@onkernel/sdk/resources/profiles";
import { pool } from "./db";
import { account } from "./browser/store";
import { assertApproval, pageFingerprint, portalUrl, publicAccount, trustedKernelUrl } from "./browser/security";
import { approveRun, deleteAccount, readPage, validateAction } from "./browser/service";
import { observationCode } from "./browser/page";
import type { BrowserAccount, BrowserPage } from "./browser/types";

process.env.KERNEL_API_KEY = "fictional-test-key";
afterEach(() => mock.restoreAll());
const page: BrowserPage = {
  url: "https://portal.example.com/claims", title: "Test HR portal", text: "Course fee: $20. Submit claim",
  blocked: false,
  controls: [{ id: 0, tag: "button", type: "submit", label: "Submit claim", value: "", href: "", options: [] }],
};
function fixture(): BrowserAccount {
  return {
    id: "account-a", label: "Fictional HR", url: "https://portal.example.com/login", profile: "private-profile", credential: "private-credential", connectionId: "private-connection", status: "connected",
    run: {
      id: "run-a", goal: "Submit the $20 fictional claim", sessionId: "private-browser", status: "review", message: "Review", steps: 0,
      pending: { id: "approval-a", action: { kind: "click", target: 0, value: "", explanation: "Submit the reviewed claim" }, page: structuredClone(page), fingerprint: pageFingerprint(page), expiresAt: Date.now() + 60_000 },
    },
  };
}
test("public account projection strips provider identifiers and approval fingerprints", () => {
  const value = JSON.stringify(publicAccount(fixture()));
  for (const secret of ["private-profile", "private-credential", "private-connection", "private-browser", pageFingerprint(page)]) assert.ok(!value.includes(secret));
});
test("approval rejects changed amount, URL, target, expiry, replay and authentication challenge", () => {
  const run = fixture().run!;
  assert.equal(assertApproval(run, "approval-a", page).kind, "click");
  for (const changed of [
    { ...page, text: "Course fee: $2000. Submit claim" },
    { ...page, url: "https://attacker.example.net" },
    { ...page, controls: [{ ...page.controls[0], label: "Delete account" }] },
    { ...page, blocked: true },
  ]) assert.throws(() => assertApproval(run, "approval-a", changed));
  assert.throws(() => assertApproval(run, "other-approval", page));
  assert.throws(() => assertApproval(run, "approval-a", page, run.pending!.expiresAt));
  run.status = "executing";
  assert.throws(() => assertApproval(run, "approval-a", page));
});
test("portal and handoff validation reject credential URLs and untrusted destinations", () => {
  for (const url of ["http://company.com", "https://user:pass@company.com", "https://localhost", "https://127.0.0.1", "https://[::1]", "https://portal.internal", "https://company.com:444", "https://company.com/?token=secret", "https://company.com/#token"]) assert.throws(() => portalUrl(url));
  assert.equal(portalUrl("https://portal.company.com/login").hostname, "portal.company.com");
  assert.throws(() => trustedKernelUrl("https://kernel.com.attacker.com/"));
  assert.throws(() => trustedKernelUrl("javascript:alert(1)"));
  assert.equal(trustedKernelUrl("https://auth.kernel.com/login/fictional"), "https://auth.kernel.com/login/fictional");
});
test("model actions cannot choose hidden credentials or arbitrary selectors", () => {
  const action = { kind: "fill" as const, target: 0, value: "hello", explanation: "Fill" };
  assert.throws(() => validateAction(action, page));
  assert.throws(() => validateAction(action, { ...page, controls: [{ ...page.controls[0], tag: "input", type: "password" }] }));
  assert.throws(() => validateAction({ ...action, target: 999 }, page));
  assert.throws(() => validateAction({ ...action, kind: "select" }, { ...page, controls: [{ ...page.controls[0], tag: "select", options: ["approved"] }] }));
});
test("account lookup is always scoped by workspace", async () => {
  const q = mock.method(pool, "query", async (sql: string, values: string[]) => {
    assert.match(sql, /workspace_id=\$1 AND id=\$2/);
    assert.deepEqual(values, ["workspace-b", "account-a"]);
    return { rows: [] };
  });
  await assert.rejects(account("workspace-b", "account-a"), /not found/);
  assert.equal(q.mock.callCount(), 1);
});
test("approval is durably consumed before browser dispatch; timeout cannot replay it", async () => {
  const a = fixture();
  const writes: BrowserAccount[] = [];
  mock.method(pool, "query", async (_sql: string, values: string[]) => {
    writes.push(JSON.parse(values[2])); return { rowCount: 1, rows: [] };
  });
  let dispatches = 0;
  mock.method(Playwright.prototype, "execute", async (_id: string, input: { code: string }) => {
    if (input.code.includes("const target=")) {
      dispatches++;
      assert.equal(writes.at(-1)!.run!.status, "executing");
      assert.equal(writes.at(-1)!.run!.pending, undefined);
      throw new Error("Provider error with a secret that must not be persisted");
    }
    return { success: true, result: page };
  });
  await approveRun("workspace-a", a, "approval-a");
  assert.equal(a.run!.status, "handoff");
  assert.ok(!JSON.stringify(writes).includes("Provider error"));
  await assert.rejects(approveRun("workspace-a", a, "approval-a"));
  assert.equal(dispatches, 1);
});
test("changed page blocks all browser mutations", async () => {
  const execute = mock.method(Playwright.prototype, "execute", async () => ({ success: true, result: { ...page, text: "Different claim" } }));
  await assert.rejects(approveRun("workspace-a", fixture(), "approval-a"));
  assert.equal(execute.mock.callCount(), 1);
});
test("successful action remains unverified until a new observation", async () => {
  const a = fixture();
  mock.method(pool, "query", async () => ({ rowCount: 1, rows: [] }));
  mock.method(Playwright.prototype, "execute", async (_id: string, input: { code: string }) => ({ success: true, result: input.code.includes("const target=") ? { attempted: true } : page }));
  await approveRun("workspace-a", a, "approval-a");
  assert.equal(a.run!.status, "ready");
  assert.equal(a.run!.steps, 1);
  assert.equal(a.run!.pending, undefined);
});
test("disconnected accounts cannot read a browser", async () => {
  const a = fixture(); a.status = "deleting";
  await assert.rejects(readPage(a));
});
test("deletion fences execution and retains cleanup handles on provider failure", async () => {
  const a = fixture(); const writes: BrowserAccount[] = [];
  mock.method(pool, "query", async (_sql: string, values: string[]) => { writes.push(JSON.parse(values[2])); return { rowCount: 1, rows: [] }; });
  mock.method(Browsers.prototype, "deleteByID", async () => { throw new Error("Provider unavailable"); });
  await assert.rejects(deleteAccount("workspace-a", a));
  assert.equal(writes[0].status, "deleting");
  assert.equal(a.run!.status, "closed");
  assert.equal(a.run!.sessionId, "private-browser");
  assert.equal(a.credential, "private-credential");
});
test("deletion removes browser, auth, credentials and profile before local record", async () => {
  const a = fixture(); const events: string[] = [];
  mock.method(pool, "query", async (sql: string) => { if (sql.startsWith("DELETE")) events.push("local"); return { rowCount: 1, rows: [] }; });
  mock.method(Browsers.prototype, "deleteByID", async () => { events.push("browser"); });
  mock.method(Connections.prototype, "delete", async () => { events.push("auth"); });
  mock.method(Connections.prototype, "list", () => ({ async *[Symbol.asyncIterator]() {} }));
  mock.method(Credentials.prototype, "delete", async () => { events.push("credential"); });
  mock.method(Profiles.prototype, "delete", async () => { events.push("profile"); });
  await deleteAccount("workspace-a", a);
  assert.deepEqual(events, ["browser", "auth", "credential", "profile", "local"]);
});
test("browser observation is self-contained JavaScript, without transpiler helper references", () => {
  assert.ok(!observationCode.includes("__name"));
  assert.doesNotThrow(() => new Function("page", `return (async()=>{${observationCode}})()`));
});
