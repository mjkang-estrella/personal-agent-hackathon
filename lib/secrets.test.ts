import { test } from "node:test";
import assert from "node:assert/strict";
import { sessionSigningSecret } from "./secrets";

test("session signing requires its own secret and never falls back to provider keys", () => {
  const previous = process.env.SESSION_SECRET;
  const openai = process.env.OPENAI_API_KEY;
  try {
    delete process.env.SESSION_SECRET;
    process.env.OPENAI_API_KEY = "unused-provider-key";
    assert.throws(() => sessionSigningSecret(), /not configured/);
    process.env.SESSION_SECRET = "independent-session-secret";
    assert.equal(sessionSigningSecret(), "independent-session-secret");
  } finally {
    if (previous === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previous;
    if (openai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = openai;
  }
});
