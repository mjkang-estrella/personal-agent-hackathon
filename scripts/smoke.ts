// Explicit live integration test. Uses only fictional data and demo-owned mailboxes.
import assert from "node:assert/strict";
import { replyPayload } from "../lib/domain";
const base = process.env.SMOKE_URL || "http://127.0.0.1:3000";
const initial = await fetch(`${base}/api/state`);
const cookie = initial.headers.get("set-cookie")!.split(";")[0];
let state = await initial.json();
async function action(action: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(`${base}/api/action`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const value = await res.json();
  if (!res.ok) throw new Error(`${action}: ${value.error}`);
  state = value;
  return state;
}
await action("prepare", { taskId: "learning" });
let task = state.tasks.find((t: { id: string }) => t.id === "learning");
assert.equal(
  task.status,
  "ready",
  JSON.stringify({ status: task.status, missing: task.missing }),
);
console.log("PASS: Mastra prepared an evidence-backed claim.");
const rejected = await fetch(`${base}/api/action`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({
    action: "submit",
    taskId: "learning",
    approval: JSON.stringify({ ...task.claim, amount: 1 }),
  }),
});
assert.equal(rejected.status, 400);
console.log("PASS: Modified approval rejected before submission.");
await action("submit", {
  taskId: "learning",
  approval: JSON.stringify(task.claim),
});
assert.equal(state.tasks[0].status, "waiting");
console.log("PASS: Kernel submitted through the live test portal.");
await action("submit", {
  taskId: "learning",
  approval: JSON.stringify(task.claim),
});
assert.equal(state.tasks[0].status, "waiting");
console.log("PASS: Duplicate submission recovered existing confirmation.");
await action("hr_request", { taskId: "learning" });
for (let i = 0; i < 6 && state.tasks[0].status !== "needs_info"; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  await action("sync");
}
assert.equal(state.tasks[0].status, "needs_info");
console.log(
  "PASS: AgentMail delivered the HR request; Mastra updated the task.",
);
await action("certificate");
task = state.tasks[0];
const approval = JSON.stringify(
  replyPayload(
    state,
    task,
    state.documents.find((d: { id: string }) => d.id === "course-certificate"),
  ),
);
await action("send_certificate", {
  taskId: "learning",
  certificateId: "course-certificate",
  approval,
});
assert.equal(state.tasks[0].status, "waiting");
console.log("PASS: Approved reply sent with the verified certificate.");
await action("hr_approve", { taskId: "learning" });
for (let i = 0; i < 6 && state.tasks[0].status !== "approved"; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  await action("sync");
}
assert.equal(state.tasks[0].status, "approved");
console.log("PASS: HR approval received; payment remains pending.");
const persistent = await fetch(`${base}/api/state`, {
  headers: { cookie },
}).then((r) => r.json());
assert.equal(persistent.tasks[0].status, "approved");
console.log("PASS: State persisted across requests.");

const other = await fetch(`${base}/api/state`);
const otherCookie = other.headers.get("set-cookie")!.split(";")[0];
const form = new FormData();
form.set(
  "file",
  new Blob([
    "Fictional private workspace isolation document. Never share this marker.",
  ]),
  "private-test.txt",
);
form.set("kind", "other");
form.set("employer", "personal");
const uploaded = await fetch(`${base}/api/documents`, {
  method: "POST",
  headers: { cookie: otherCookie },
  body: form,
});
assert.equal(uploaded.status, 200);
assert.equal((await uploaded.json()).demo, false);
const original = await fetch(`${base}/api/state`, { headers: { cookie } }).then(
  (r) => r.json(),
);
assert.equal(
  original.documents.some(
    (d: { name: string }) => d.name === "private-test.txt",
  ),
  false,
);
const crossOrigin = await fetch(`${base}/api/action`, {
  method: "POST",
  headers: {
    cookie,
    origin: "https://other.example",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    action: "dates",
    lastDay: "2026-10-22",
    startDay: "2026-10-26",
  }),
});
assert.equal(crossOrigin.status, 400);
console.log("PASS: Uploads stay isolated; cross-origin writes are blocked.");
