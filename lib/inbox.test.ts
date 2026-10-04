import { test } from "node:test";
import assert from "node:assert/strict";
import { readInbox, type InboxScope } from "./inbox";

type Client = Parameters<typeof readInbox>[1];
type Message = Awaited<ReturnType<Client["get"]>>;
const scope: InboxScope = {
  demo: true,
  inbox: "demo@example.test",
  hrInbox: "hr@example.test",
  claims: [
    { id: "claim-a", taskId: "learning", title: "Learning reimbursement" },
  ],
};
function message(overrides: Partial<Message> = {}): Message {
  return {
    inboxId: scope.inbox!,
    messageId: "message-a",
    threadId: "thread-a",
    labels: ["received"],
    timestamp: new Date("2026-10-04T12:00:00Z"),
    from: "People Team <hr@example.test>",
    to: [scope.inbox!],
    subject: "Re: [JobSwitch claim-a] Learning reimbursement",
    preview: "Please send a certificate.",
    text: "Please send a certificate. <script>untrusted()</script>",
    html: "<img src='https://example.test/tracker'>",
    size: 200,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
function client(items: Message[], nextPageToken?: string) {
  const calls: unknown[][] = [];
  const api: Client = {
    list: (async (...args: unknown[]) => {
      calls.push(args);
      return { count: items.length, messages: items, nextPageToken };
    }) as Client["list"],
    get: (async (_inbox: string, id: string) =>
      items.find((item) => item.messageId === id)!) as Client["get"],
  };
  return { api, calls };
}
test("shared inbox lists only exact owned claim markers and expected participants", async () => {
  const { api, calls } = client(
    [
      message(),
      message({ messageId: "foreign", subject: "[JobSwitch claim-b]" }),
      message({ messageId: "prefix", subject: "[JobSwitch claim-a-more]" }),
      message({
        messageId: "ambiguous",
        subject: "[JobSwitch claim-a] [JobSwitch claim-b]",
      }),
      message({ messageId: "sender", from: "someone@example.test" }),
      message({ messageId: "recipient", to: ["elsewhere@example.test"] }),
      message({ messageId: "inbox", inboxId: "other@example.test" }),
    ],
    "more",
  );
  const result = await readInbox(scope, api);
  assert.deepEqual(
    result.messages.map((m) => m.id),
    ["message-a"],
  );
  assert.equal(result.limited, true);
  assert.deepEqual(calls[0], [
    scope.inbox,
    {
      limit: 30,
      ascending: false,
      subject: ["[JobSwitch claim-a]"],
      from: [scope.hrInbox],
    },
  ]);
  assert.equal("body" in result.messages[0], false);
  assert.equal("html" in result.messages[0], false);
});
test("message detail rechecks ownership and exposes plain text only", async () => {
  const { api } = client([
    message(),
    message({ messageId: "foreign", subject: "[JobSwitch claim-b]" }),
  ]);
  const result = await readInbox(scope, api, "message-a");
  assert.equal(result.message?.body, message().text);
  assert.equal(result.message?.taskId, "learning");
  assert.equal("html" in result.message!, false);
  assert.equal("headers" in result.message!, false);
  assert.equal((await readInbox(scope, api, "foreign")).message, undefined);
});
test("unconnected, personal, and claimless workspaces never query shared mail", async () => {
  const api = {
    list: () => {
      throw new Error("must not query");
    },
    get: () => {
      throw new Error("must not query");
    },
  } as unknown as Client;
  for (const state of [
    { ...scope, inbox: undefined },
    { ...scope, demo: false },
    { ...scope, claims: [] },
  ]) {
    assert.deepEqual((await readInbox(state, api)).messages, []);
    assert.equal((await readInbox(state, api, "message-a")).message, undefined);
  }
});
test("newest messages come first and duplicate results appear once", async () => {
  const { api } = client([
    message(),
    message({ messageId: "new", timestamp: new Date("2026-10-05T12:00:00Z") }),
    message(),
  ]);
  assert.deepEqual(
    (await readInbox(scope, api)).messages.map((m) => m.id),
    ["new", "message-a"],
  );
});
test("provider failures are not silently presented as an empty inbox", async () => {
  const api = {
    list: async () => {
      throw new Error("provider failure");
    },
  } as unknown as Client;
  await assert.rejects(readInbox(scope, api), /provider failure/);
});
