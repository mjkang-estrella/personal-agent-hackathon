import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { signedWorkspace, verifiedWorkspace } from "./auth/workspace-cookie";

test("workspace capabilities reject tampering, wrong secrets, and malformed cookies", () => {
  const id = randomUUID();
  const raw = signedWorkspace(id, "test-secret");
  assert.equal(verifiedWorkspace(raw, "test-secret"), id);
  for (const cookie of [
    undefined,
    "",
    id,
    `${raw}.suffix`,
    `../${raw}`,
    `${randomUUID()}.${raw.split(".")[1]}`,
    raw.replace(/.$/, "x"),
  ]) {
    assert.equal(verifiedWorkspace(cookie, "test-secret"), undefined);
  }
  assert.equal(verifiedWorkspace(raw, "other-secret"), undefined);
});
