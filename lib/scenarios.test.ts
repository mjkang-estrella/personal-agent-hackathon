import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deliverNext,
  makeScenarioWorkspace,
  scenarioData,
  scenarioIds,
} from "./scenarios";
import { sendDraft } from "./mail-agent";
import { draftPayload } from "./drafts";
import { validEvidence } from "./domain";
import type { Workspace } from "./types";

// Simulates the user approving an email to the address the case expects next.
function approveEmailTo(
  w: Workspace,
  address: string,
  attachmentIds: string[] = [],
) {
  const to = w.scenario!.contacts.find((c) => c.address === address)!;
  const task = w.tasks[0] || {
    id: "t1",
    title: "Practice task",
    description: "",
    stage: "before" as const,
    category: "onboarding" as const,
    status: "todo" as const,
    deadline: null,
    deadlineRule: "unknown" as const,
    amount: null,
    evidence: [],
    missing: [],
    nextAction: "",
  };
  if (!w.tasks.length) w.tasks.push(task);
  const draft = {
    id: `d-${(w.drafts || []).length}`,
    taskId: task.id,
    to: [to],
    subject: "Following up",
    body: "Hello, could you confirm the next step? Thanks, Alex",
    inReplyTo: null,
    attachmentIds,
    reason: "Needed to continue.",
    evidence: [],
    status: "draft" as const,
    createdAt: new Date().toISOString(),
  };
  (w.drafts ??= []).push(draft);
  return sendDraft(w, draft.id, JSON.stringify(draftPayload(w, draft)));
}

function expectedOutbound(id: string, stepIndex: number) {
  const data = scenarioData(id);
  const step = data.scenario.steps[stepIndex];
  const sample = data.messages.find(
    (m) => step.releaseMessageIds.includes(m.id) && m.direction === "outbound",
  )!;
  return [
    sample.recipients[0].address,
    sample.attachments.map((a) => a.id),
  ] as const;
}

test("every practice case opens with only its first step's mail and documents", () => {
  assert.equal(scenarioIds.length, 8);
  for (const id of scenarioIds) {
    const data = scenarioData(id);
    const first = data.scenario.steps[0];
    const w = makeScenarioWorkspace(id);
    assert.equal(w.scenario!.released, 1, id);
    assert.equal(w.demo, true);
    assert.deepEqual(w.tasks, []);
    assert.deepEqual(
      w.mail!.map((m) => m.id).sort(),
      [...first.releaseMessageIds].sort(),
      id,
    );
    assert.deepEqual(
      w.documents.map((d) => d.id).sort(),
      [...first.releaseDocumentIds].sort(),
      `${id} must not see future documents`,
    );
    assert.ok(w.mail!.every((m) => m.direction === "inbound" && !m.triaged));
    assert.ok(
      !w.scenario!.contacts.some((c) => c.address === w.scenario!.self.address),
    );
    assert.equal(w.agent?.pending, true);
  }
});

test("every step's verbatim evidence is in the workspace once the step is released", () => {
  for (const id of scenarioIds) {
    const data = scenarioData(id);
    const w = makeScenarioWorkspace(id);
    data.scenario.steps.forEach((step, index) => {
      if (index > 0) {
        if (step.requiresUserApproval) {
          const [address, attachments] = expectedOutbound(id, index);
          assert.equal(
            approveEmailTo(w, address, [...attachments]).advanced,
            true,
            `${id}/${step.id}: the user's email continues the case`,
          );
          return;
        }
        deliverNext(w);
      }
      for (const e of step.evidence) {
        const doc = w.documents.find((d) => d.id === e.sourceId);
        assert.ok(doc, `${id}/${step.id}: ${e.sourceId} released`);
        assert.ok(
          doc.pages.some((_, i) =>
            validEvidence(
              { documentId: e.sourceId, page: i + 1, quote: e.quote },
              w,
            ),
          ),
          `${id}/${step.id}: quote verifies`,
        );
      }
    });
    assert.equal(w.scenario!.released, data.scenario.steps.length);
    assert.equal(w.scenario!.waitingFor, undefined);
    assert.throws(() => deliverNext(w), /No more emails/);
  }
});

test("an outbound step waits for the user's own approved email; samples never appear", () => {
  const w = makeScenarioWorkspace("02-background-check");
  assert.equal(
    w.scenario!.waitingFor?.name,
    "Maya Chen | Northstar People Team",
  );
  assert.throws(
    () => deliverNext(w),
    /waiting for your approved email to Maya/,
  );
  const wrong = approveEmailTo(w, "people@orbit.example");
  assert.equal(wrong.advanced, false, "a different recipient does not count");
  assert.throws(() => deliverNext(w), /waiting for your approved email/);
  const right = approveEmailTo(w, "people@northstar.example");
  assert.equal(right.advanced, true);
  assert.equal(w.scenario!.waitingFor, undefined);
  const sent = w.mail!.find(
    (m) =>
      m.direction === "outbound" &&
      m.to[0].address === "people@northstar.example",
  )!;
  deliverNext(w);
  const reply = w.mail!.find((m) => m.id === "s02-m03")!;
  assert.equal(
    reply.inReplyTo,
    sent.id,
    "replies thread onto the user's email",
  );
  assert.equal(reply.threadId, sent.threadId);
  assert.ok(w.documents.some((d) => d.id === "s02-employment"));
  assert.ok(
    !w.mail!.some((m) => m.id === "s02-m02") &&
      !w.documents.some((d) => d.id === "s02-m02"),
    "the stored sample outbound email is never inserted",
  );
  assert.ok(
    Date.parse(w.scenario!.clock) >= Date.parse("2026-10-06T09:00:00-07:00"),
  );
});

test("an approved email sent early still satisfies the later outbound step", () => {
  const w = makeScenarioWorkspace("08-onboarding-coordination");
  approveEmailTo(w, "it@orbit.example");
  deliverNext(w); // profile verified
  deliverNext(w); // duplicate reminder
  deliverNext(w); // outbound step satisfied, appointment confirmation arrives
  assert.ok(w.mail!.some((m) => m.id === "s08-m06"));
});

test("a status update without the receipt never counts as the claim submission", () => {
  const w = makeScenarioWorkspace("05-post-exit-expense");
  approveEmailTo(w, "expenses@northstar.example"); // premature, no receipt
  deliverNext(w); // receipt recovered
  assert.deepEqual(w.scenario!.waitingAttachments, [
    "Harbor Learning | Itemized workshop receipt",
  ]);
  assert.throws(
    () => deliverNext(w),
    /Expense Operations with Harbor Learning \| Itemized workshop receipt attached/,
  );
  const submitted = approveEmailTo(w, "expenses@northstar.example", [
    "s05-receipt",
  ]);
  assert.equal(submitted.advanced, true);
  assert.equal(w.scenario!.waitingAttachments, undefined);
  deliverNext(w);
  const ack = w.mail!.find((m) => m.id === "s05-m04")!;
  assert.equal(ack.inReplyTo, w.mail!.at(-2)!.id);
});
