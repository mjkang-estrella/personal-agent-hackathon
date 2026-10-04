import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWorkspace } from "./fixtures";
import { demoMessages, readDemoInbox } from "./demo-inbox";
import type { InboxSnapshot } from "./types";

const empty = async (): Promise<InboxSnapshot> => ({
  connected: false,
  messages: [],
  limited: false,
});
test("existing demos get readable, source-grounded emails without changing workspace state", async () => {
  const w = makeWorkspace();
  const before = structuredClone(w);
  const list = await readDemoInbox(w, empty);
  assert.equal(list.messages.length, 4);
  assert.equal(list.provider, "demo");
  assert.equal(list.connected, false);
  for (const summary of list.messages) {
    assert.equal(summary.body, undefined);
    const detail = await readDemoInbox(
      w,
      () => {
        throw new Error("must not call provider");
      },
      summary.id,
    );
    const m = detail.message!;
    assert.equal(m.demo, true);
    assert.match(m.body!, /Fictional demo email/);
    assert.ok(m.body!.includes(m.source!.quote));
    assert.ok(
      w.documents
        .find((d) => d.id === m.source!.documentId)!
        .pages[m.source!.page - 1].includes(m.source!.quote),
    );
    assert.ok(w.tasks.some((t) => t.id === m.taskId));
  }
  assert.match(
    (await readDemoInbox(w, empty, "demo-email-learning")).message!.body!,
    /not final reimbursement approval/,
  );
  assert.deepEqual(w, before);
});
test("sample detail never bypasses workspace kind or source ownership", async () => {
  const w = makeWorkspace();
  assert.deepEqual(demoMessages({ ...w, demo: false }), []);
  assert.deepEqual(
    demoMessages({
      ...w,
      scenario: { id: "practice" } as NonNullable<typeof w.scenario>,
    }),
    [],
  );
  const removed = {
    ...w,
    documents: w.documents.filter((d) => d.id !== "hr-confirmation"),
  };
  assert.equal(
    (await readDemoInbox(removed, empty, "demo-email-learning")).message,
    undefined,
  );
  w.documents[0].pages[0] = "Changed policy with no supporting quote.";
  assert.equal(
    (await readDemoInbox(w, empty, "demo-email-coverage")).message,
    undefined,
  );
  assert.equal(
    (await readDemoInbox(w, empty, "demo-email-unknown")).message,
    undefined,
  );
});
test("live replies retain ordering, limits and detail authorization alongside samples", async () => {
  const w = makeWorkspace();
  const live: InboxSnapshot = {
    connected: true,
    limited: true,
    messages: [
      {
        id: "live",
        from: "Test HR",
        subject: "Claim received",
        preview: "Received, not approved",
        at: "2026-10-04T12:00:00Z",
      },
    ],
  };
  const result = await readDemoInbox(w, async () => live);
  assert.equal(result.messages.length, 5);
  assert.equal(result.messages[0].id, "live");
  assert.equal(result.connected, true);
  assert.equal(result.limited, true);
  const detail = await readDemoInbox(
    w,
    async (id) => {
      assert.equal(id, "foreign-live-message");
      return empty();
    },
    "foreign-live-message",
  );
  assert.equal(detail.message, undefined);
});
test("provider errors leave demo mail browsable but are disclosed; detail errors propagate", async () => {
  const fail = async () => {
    throw new Error("private provider error");
  };
  const w = makeWorkspace();
  const result = await readDemoInbox(w, fail);
  assert.equal(result.messages.length, 4);
  assert.match(result.warning!, /could not be checked/);
  assert.ok(!JSON.stringify(result).includes("private provider error"));
  await assert.rejects(
    readDemoInbox(w, fail, "live-message"),
    /private provider error/,
  );
});
