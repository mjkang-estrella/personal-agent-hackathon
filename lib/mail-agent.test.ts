import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyTriage,
  resolveDateProposal,
  saveDraft,
  sendDraft,
  type TriageResult,
} from "./mail-agent";
import { deliverNext, makeScenarioWorkspace } from "./scenarios";
import { nextAgentStep, reviewKind } from "./automation";
import { draftPayload, openDraft } from "./drafts";

type TaskUpdate = TriageResult["tasks"][number];
type DraftProposal = TriageResult["drafts"][number];
const quote = (documentId: string, text: string) => ({
  documentId,
  page: 1,
  quote: text,
});
const task = (over: Partial<TaskUpdate> = {}): TaskUpdate => ({
  ref: "new-1",
  title: "Send background check evidence",
  description: "Orbit needs two documents for screening.",
  stage: "before",
  category: "onboarding",
  status: "todo",
  deadline: "2026-10-08",
  missing: ["Northstar employment statement"],
  nextAction: "Ask Northstar for an employment statement.",
  change: "Orbit asked for two items",
  evidence: [quote("s02-m01", "Your review is pending.")],
  statusEvidence: null,
  ...over,
});
const draft = (over: Partial<DraftProposal> = {}): DraftProposal => ({
  taskRef: "new-1",
  toAddress: "people@northstar.example",
  replyToMessageId: null,
  subject: "Employment statement for my Orbit onboarding",
  body: "Hi Maya, could you send a statement of my current employment? Thanks, Alex",
  reason: "Orbit needs it by October 8.",
  evidence: [quote("s02-m01", "a Northstar employment statement")],
  attachmentIds: [],
  ...over,
});
const result = (over: Partial<TriageResult> = {}): TriageResult => ({
  summary: "Screening is pending.",
  tasks: [task()],
  drafts: [],
  dateProposal: null,
  ...over,
});
const screening = () => makeScenarioWorkspace("02-background-check");

test("triage keeps only tasks with verified quotes and links them to the mail", () => {
  const w = screening();
  const outcome = applyTriage(
    w,
    result({
      tasks: [
        task(),
        task({
          ref: "new-2",
          title: "Invented task",
          evidence: [quote("s02-m01", "Your check is cleared already.")],
        }),
      ],
    }),
    ["s02-m01"],
  );
  assert.equal(outcome.tasks, 1);
  assert.equal(outcome.rejected, 1);
  assert.deepEqual(
    w.tasks.map((t) => t.title),
    ["Send background check evidence"],
  );
  assert.equal(w.tasks[0].history?.[0].note, "Orbit asked for two items");
  const mail = w.mail!.find((m) => m.id === "s02-m01")!;
  assert.ok(mail.triaged);
  assert.deepEqual(mail.taskIds, [w.tasks[0].id]);
  assert.equal(nextAgentStep(w, "any"), null, "triaged mail is not re-read");
});

test("closing needs proof in the new mail; approval is only for money", () => {
  const w = screening();
  applyTriage(w, result(), ["s02-m01"]);
  const id = w.tasks[0].id;
  // Quoting the original request does not prove completion.
  applyTriage(
    w,
    result({
      tasks: [
        task({
          ref: id,
          status: "done",
          statusEvidence: quote("s02-m01", "Your review is pending."),
        }),
      ],
    }),
    [],
  );
  assert.equal(w.tasks[0].status, "todo");
  applyTriage(
    w,
    result({
      tasks: [
        task({
          ref: id,
          status: "approved",
          statusEvidence: quote("s02-m01", "Your review is pending."),
        }),
      ],
    }),
    ["s02-m01"],
  );
  assert.notEqual(w.tasks[0].status, "approved");
  assert.equal(w.tasks.length, 1, "updates by ref never duplicate the task");
});

test("drafts may only go to known contacts and never carry identifiers", () => {
  const w = screening();
  const outcome = applyTriage(
    w,
    result({
      drafts: [
        draft({ toAddress: "someone@attacker.example" }),
        draft({ body: "My SSN is 123-45-6789. Thanks, Alex" }),
        draft({ toAddress: "alex.morgan@personal.example" }),
      ],
    }),
    ["s02-m01"],
  );
  assert.equal(outcome.drafts, 0);
  assert.equal(outcome.rejected, 3);
  assert.equal(openDraft(w, w.tasks[0].id), undefined);
});

test("drafts attach only received or personal documents, never email bodies", () => {
  const w = screening();
  applyTriage(
    w,
    result({
      drafts: [
        draft({
          attachmentIds: ["s02-checklist", "s02-m01", "s02-employment"],
        }),
      ],
    }),
    ["s02-m01"],
  );
  const d = openDraft(w, w.tasks[0].id)!;
  assert.deepEqual(d.attachmentIds, ["s02-checklist"]);
  assert.equal(reviewKind(w.tasks[0], w), "draft");
});

test("a fresh draft replaces the agent's last one but never the user's edits", () => {
  const w = screening();
  applyTriage(w, result({ drafts: [draft()] }), ["s02-m01"]);
  const first = openDraft(w, w.tasks[0].id)!;
  const ref = w.tasks[0].id;
  applyTriage(
    w,
    result({ tasks: [], drafts: [draft({ taskRef: ref, subject: "Second" })] }),
    [],
  );
  assert.equal(first.status, "superseded");
  const second = openDraft(w, ref)!;
  assert.equal(second.subject, "Second");
  saveDraft(w, second.id, "My words", "Hi Maya, my own wording. Alex");
  applyTriage(
    w,
    result({ tasks: [], drafts: [draft({ taskRef: ref, subject: "Third" })] }),
    [],
  );
  assert.equal(openDraft(w, ref)!.subject, "My words");
  assert.throws(
    () => saveDraft(w, second.id, "x", "Account 123456789012"),
    /remove account or identification numbers/,
  );
});

test("sending requires the exact approved payload and never duplicates", () => {
  const w = screening();
  applyTriage(w, result({ drafts: [draft()] }), ["s02-m01"]);
  const d = openDraft(w, w.tasks[0].id)!;
  const approval = JSON.stringify(draftPayload(w, d));
  saveDraft(w, d.id, d.subject, `${d.body}\nP.S. changed`);
  assert.throws(() => sendDraft(w, d.id, approval), /changed/);
  const fresh = JSON.stringify(draftPayload(w, d));
  const sent = sendDraft(w, d.id, fresh);
  assert.deepEqual(sent, { duplicate: false, advanced: true });
  assert.deepEqual(sendDraft(w, d.id, fresh), {
    duplicate: true,
    advanced: false,
  });
  const outbound = w.mail!.filter((m) => m.direction === "outbound");
  assert.equal(outbound.length, 1);
  assert.equal(w.tasks[0].status, "waiting");
  assert.equal(w.scenario!.waitingFor, undefined);
  assert.ok(w.documents.some((doc) => doc.id === outbound[0].documentId));
  deliverNext(w);
  assert.equal(nextAgentStep(w, "any")?.kind, "triage");
});

test("date changes are proposed from new mail and applied only by the user", () => {
  const w = makeScenarioWorkspace("01-start-date-change");
  applyTriage(
    w,
    result({ tasks: [], drafts: [] }),
    w.mail!.map((m) => m.id),
  );
  deliverNext(w);
  const update = w.mail!.find((m) => !m.triaged)!;
  const stale = {
    lastDay: "2026-10-16",
    startDay: "2026-11-02",
    reason: "Orbit moved the start date.",
  };
  applyTriage(
    w,
    result({
      tasks: [],
      dateProposal: {
        ...stale,
        evidence: quote(w.mail![0].documentId, "October 19"),
      },
    }),
    [update.id],
  );
  const proposal = () => w.dateProposal;
  assert.equal(proposal(), undefined, "old mail cannot propose a change");
  const page = w.documents.find((d) => d.id === update.documentId)!.pages[0];
  const words = page.match(/November 2[^\n.]*/)![0];
  applyTriage(
    w,
    result({
      tasks: [],
      dateProposal: { ...stale, evidence: quote(update.documentId, words) },
    }),
    [update.id],
  );
  assert.equal(proposal()?.startDay, "2026-11-02");
  assert.equal(w.profile.startDay, "2026-10-19", "nothing changes on its own");
  resolveDateProposal(w, true);
  assert.equal(w.profile.startDay, "2026-11-02");
  assert.equal(proposal(), undefined);
});
