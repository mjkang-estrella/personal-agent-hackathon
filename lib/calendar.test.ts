import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { makeWorkspace } from "./fixtures";
import {
  signature,
  validatePreview,
  taskContext,
  nextDate,
  eventPayload,
  type ReminderPreview,
} from "./calendar-state";
import { requireScope, config } from "./connections/config";
const task = makeWorkspace().tasks[0];
const c = {
  generation: randomUUID(),
  account_id: "fictional-account",
  email: "person@example.com",
};
function fixture(): ReminderPreview {
  return {
    taskId: task.id,
    title: "Review benefits deadline",
    date: "2026-10-16",
    timeZone: "America/Los_Angeles",
    service: "google-calendar",
    generation: c.generation,
    account: c.account_id,
    email: c.email,
    context: taskContext(task),
    expires: Date.now() + 600_000,
  };
}
process.env.SESSION_SECRET = "unit-test-calendar-secret";
test("approval binds workspace, account, task context and exact event fields", () => {
  const p = fixture(),
    sig = signature("workspace", p);
  validatePreview("workspace", p, sig, task, c);
  for (const change of [
    { title: "Changed" },
    { date: "2026-10-17" },
    { email: "other@example.com" },
    { service: "microsoft-calendar" as const },
  ])
    assert.throws(() =>
      validatePreview("workspace", { ...p, ...change }, sig, task, c),
    );
  assert.throws(() => validatePreview("other", p, sig, task, c));
  assert.throws(() =>
    validatePreview(
      "workspace",
      p,
      sig,
      { ...task, deadline: "2026-11-01" },
      c,
    ),
  );
  assert.throws(() =>
    validatePreview("workspace", p, sig, task, {
      ...c,
      generation: randomUUID(),
    }),
  );
  assert.throws(() =>
    validatePreview("workspace", p, sig, task, c, p.expires + 1),
  );
});
test("calendar dates are real dates and payloads never invite attendees", () => {
  assert.equal(nextDate("2028-02-29"), "2028-03-01");
  assert.equal(nextDate("2026-12-31"), "2027-01-01");
  assert.throws(() => nextDate("2026-02-29"));
  const p = fixture(),
    id = randomUUID();
  for (const service of ["google-calendar", "microsoft-calendar"] as const) {
    const payload = eventPayload(service, p, id);
    assert.ok(!("attendees" in payload));
    assert.ok(!("attachments" in payload));
    assert.deepEqual(eventPayload(service, p, id), payload);
  }
  assert.equal(
    eventPayload("google-calendar", p, id).id,
    id.replaceAll("-", ""),
  );
  assert.equal(eventPayload("microsoft-calendar", p, id).transactionId, id);
});
test("service scopes and callback cannot be broadened through input", () => {
  requireScope(
    "google-calendar",
    "openid email https://www.googleapis.com/auth/calendar.events.owned",
  );
  requireScope("microsoft-calendar", "User.Read Calendars.ReadWrite");
  assert.throws(() => requireScope("microsoft-calendar", "Mail.Read"));
  process.env.GOOGLE_CLIENT_ID = "fake";
  process.env.GOOGLE_CLIENT_SECRET = "fake";
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString(
    "base64",
  );
  process.env.GOOGLE_CONNECTIONS_REDIRECT_URI =
    "https://example.com/api/connections/callback?returnTo=evil";
  assert.throws(() => config("google-calendar"));
});
