import test from "node:test";
import assert from "node:assert/strict";
import {
  ticket,
  readTicket,
  downloadUrl,
  graphFilesUrl,
  limitedBytes,
} from "./connections/file-security";
import {
  extractDocument,
  appendDocument,
  MAX_FILE_BYTES,
} from "./document-import";
import { makeWorkspace } from "./fixtures";
import { previewSchema } from "./calendar-state";
process.env.SESSION_SECRET = "cloud-tests-only";
test("file tickets reject tampering and calendar schemas exclude file services", () => {
  const value = { workspace: "one", service: "google-drive", generation: "a" };
  const raw = ticket(value);
  assert.deepEqual(readTicket(raw), value);
  assert.throws(() =>
    readTicket(raw.replace(raw[0], raw[0] === "a" ? "b" : "a")),
  );
  assert.throws(() => readTicket(raw + ".extra"));
  assert.equal(
    previewSchema.shape.service.safeParse("google-drive").success,
    false,
  );
});
test("provider listing and download boundaries exclude arbitrary targets", () => {
  assert.ok(
    graphFilesUrl(
      "https://graph.microsoft.com/v1.0/me/drive/root/children?$skiptoken=x",
    ),
  );
  for (const u of [
    "https://evil.example/v1.0/me/drive/root/children",
    "https://graph.microsoft.com/v1.0/users/other/drive/root/children",
    "https://graph.microsoft.com/v1.0/me/messages",
    "https://user@graph.microsoft.com/v1.0/me/drive/root/children",
  ])
    assert.throws(() => graphFilesUrl(u));
  assert.ok(
    downloadUrl("https://fictional.sharepoint.com/file?download=example"),
  );
  for (const u of [
    "http://fictional.sharepoint.com/file",
    "https://127.0.0.1/file",
    "https://evilsharepoint.com/file",
    "https://files.1drv.com.evil.example/file",
    "https://user:secret@fictional.sharepoint.com/file",
  ])
    assert.throws(() => downloadUrl(u));
});
test("stream limits apply without a content length header", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_FILE_BYTES));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    },
  });
  await assert.rejects(limitedBytes(new Response(body)), /smaller/);
  assert.equal(
    new TextDecoder().decode(await limitedBytes(new Response("small"))),
    "small",
  );
});
test("shared extraction validates text types, minimum text and size", async () => {
  assert.deepEqual(
    await extractDocument(
      "policy.md",
      new TextEncoder().encode("Fictional policy evidence with enough text."),
    ),
    ["Fictional policy evidence with enough text."],
  );
  await assert.rejects(extractDocument("short.txt", new Uint8Array([65])));
  await assert.rejects(extractDocument("policy.docx", new Uint8Array(30)));
  await assert.rejects(
    extractDocument("huge.txt", new Uint8Array(MAX_FILE_BYTES + 1)),
  );
});
test("cloud imports invalidate approved drafts, enforce limits and retain versions", () => {
  const w = makeWorkspace();
  w.documents = [];
  w.tasks[0].status = "ready";
  const source = {
    service: "google-drive" as const,
    account: "fictional",
    fileId: "one",
    version: "1",
  };
  const input = {
    name: "fictional.txt",
    pages: ["Fictional employer policy."],
    kind: "policy" as const,
    employer: "previous" as const,
    cloudSource: source,
  };
  appendDocument(w, input);
  assert.equal(w.tasks[0].status, "todo");
  assert.equal(w.tasks[0].claim, undefined);
  assert.equal(w.demo, false);
  assert.equal(w.documents[0].cloudSource?.version, "1");
  assert.throws(() => appendDocument(w, input), /already imported/);
  w.tasks[0].status = "submitting";
  assert.throws(
    () =>
      appendDocument(w, { ...input, cloudSource: { ...source, version: "2" } }),
    /submission/,
  );
});
