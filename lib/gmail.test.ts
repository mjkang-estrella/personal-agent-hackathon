import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  seal,
  unseal,
  senderAddress,
  challenge,
  GMAIL_SCOPE,
} from "./gmail/security";
import { requireReadScope, plainText, newReplyText } from "./gmail/client";
import { eligibleMessage } from "./gmail/sync";

test("Gmail tokens are randomized, authenticated, and bound to a workspace", () => {
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const a = seal("test-refresh-token", "one");
  const b = seal("test-refresh-token", "one");
  assert.notEqual(a, b);
  assert.ok(!a.includes("test-refresh-token"));
  assert.equal(unseal(a, "one"), "test-refresh-token");
  assert.throws(() => unseal(a, "two"));
  const parts = a.split(".");
  parts[2] = Buffer.from("tampered").toString("base64url");
  assert.throws(() => unseal(parts.join("."), "one"));
});
test("PKCE uses SHA-256 and requires the exact read-only Gmail scope", () => {
  assert.equal(
    challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
  requireReadScope(GMAIL_SCOPE);
  assert.throws(() => requireReadScope(GMAIL_SCOPE + ".fake"));
  assert.throws(() => requireReadScope(undefined));
});
test("Sender filters reject Gmail query operators and ignore sent, draft, spam, trash, and invalid dates", () => {
  assert.equal(senderAddress("HR <People@Example.com>"), "people@example.com");
  assert.equal(
    senderAddress("hr@example.com OR from:someone@example.com"),
    null,
  );
  const m = {
    id: "abc",
    threadId: "def",
    internalDate: "1234567890",
    payload: { headers: [{ name: "From", value: "HR <people@example.com>" }] },
  };
  assert.equal(eligibleMessage(m, "people@example.com"), true);
  assert.equal(eligibleMessage(m, "other@example.com"), false);
  for (const label of ["SENT", "DRAFT", "SPAM", "TRASH"])
    assert.equal(
      eligibleMessage({ ...m, labelIds: [label] }, "people@example.com"),
      false,
    );
  assert.equal(
    eligibleMessage({ ...m, internalDate: "" }, "people@example.com"),
    false,
  );
});
test("Only bounded plain-text reply content becomes evidence", () => {
  const data = (text: string) => Buffer.from(text).toString("base64url");
  assert.equal(
    plainText({
      mimeType: "text/html",
      body: { data: data("<b>approved</b>") },
    }),
    "",
  );
  assert.equal(
    plainText({
      mimeType: "text/plain",
      filename: "attachment.txt",
      body: { data: data("approved") },
    }),
    "",
  );
  assert.equal(
    plainText({
      parts: [
        {
          mimeType: "text/plain",
          body: { data: data("Please send your certificate.") },
        },
      ],
    }),
    "Please send your certificate.",
  );
  assert.equal(
    newReplyText(
      "Please send your certificate.\n\nOn Tuesday HR wrote:\nYour claim is approved.",
    ),
    "Please send your certificate.",
  );
  assert.equal(
    newReplyText("Checking.\n> Your claim is approved."),
    "Checking.",
  );
});

test("Gmail inbox only reads saved workspace evidence and retains it after disconnect", async () => {
  const { readImportedGmail } = await import("./gmail/inbox");
  const { makeWorkspace } = await import("./fixtures");
  const w = makeWorkspace();
  w.demo = false;
  w.documents.push({
    id: "gmail-123",
    name: "HR reply",
    employer: "personal",
    kind: "other",
    pages: ["Please send a certificate."],
    addedAt: "2026-10-04T12:00:00Z",
    emailSource: {
      id: "gmail:123",
      from: "hr@example.com",
      subject: "Fictional claim",
      at: "2026-10-04T12:00:00Z",
      taskId: "learning",
    },
  });
  const list = readImportedGmail(w);
  assert.equal(list.messages.length, 1);
  assert.equal(list.messages[0].body, undefined);
  assert.equal(
    readImportedGmail(w, "gmail:123").message?.body,
    "Please send a certificate.",
  );
  assert.equal(readImportedGmail(w, "foreign-id").message, undefined);
  assert.equal(
    readImportedGmail(makeWorkspace(), "gmail:123").message,
    undefined,
  );
  assert.equal(w.tasks[0].status, "todo");
});
