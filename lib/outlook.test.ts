import test from "node:test";
import assert from "node:assert/strict";
import {
  graphUrl,
  requireReadScope,
  toMessage,
  odataLiteral,
  plainText,
} from "./outlook/client";
import { seal, unseal } from "./outlook/security";
import { eligibleMessage } from "./outlook/sync";
test("Graph requests cannot send user tokens to another host or user", () => {
  assert.equal(graphUrl("me/messages").origin, "https://graph.microsoft.com");
  for (const url of [
    "https://evil.example/v1.0/me/messages",
    "//evil.example/me/messages",
    "https://graph.microsoft.com/v1.0/users/other/messages",
    "me/../../users/other",
    "https://token@graph.microsoft.com/v1.0/me/messages",
  ])
    assert.throws(() => graphUrl(url));
  assert.equal(odataLiteral("x' or true"), "'x'' or true'");
});
test("Outlook requires exact read scope and workspace-bound ciphertext", () => {
  requireReadScope("User.Read Mail.Read");
  requireReadScope("https://graph.microsoft.com/Mail.Read");
  assert.throws(() => requireReadScope("Mail.ReadBasic"));
  process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 4).toString(
    "base64",
  );
  const cipher = seal("refresh", "workspace-a");
  assert.equal(unseal(cipher, "workspace-a"), "refresh");
  assert.throws(() => unseal(cipher, "workspace-b"));
});
test("Outlook evidence requires a received message and unique plain-text reply", () => {
  const value = {
    id: "msg=",
    conversationId: "thread=",
    receivedDateTime: "2026-10-01T10:00:00Z",
    isDraft: false,
    subject: "Claim",
    from: { emailAddress: { address: "HR@example.com" } },
    uniqueBody: { contentType: "text", content: "Your request was approved." },
  };
  const message = toMessage(value)!;
  assert.ok(eligibleMessage(message, "hr@example.com"));
  assert.ok(!eligibleMessage(message, "another@example.com"));
  assert.equal(plainText(message.payload), "Your request was approved.");
  assert.equal(toMessage({ ...value, isDraft: true }), null);
  assert.equal(toMessage({ ...value, receivedDateTime: "bad" }), null);
  assert.equal(
    plainText(
      toMessage({
        ...value,
        uniqueBody: { contentType: "html", content: "<b>approved</b>" },
      })!.payload,
    ),
    "",
  );
});
