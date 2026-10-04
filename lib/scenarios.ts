import { randomUUID } from "node:crypto";
import manifest from "../demo-data/manifest.json";
import scenario01 from "../demo-data/scenarios/01-start-date-change/scenario.json";
import messages01 from "../demo-data/scenarios/01-start-date-change/messages.json";
import bundle01 from "../demo-data/scenarios/01-start-date-change/stages/acknowledged.json";
import scenario02 from "../demo-data/scenarios/02-background-check/scenario.json";
import messages02 from "../demo-data/scenarios/02-background-check/messages.json";
import bundle02 from "../demo-data/scenarios/02-background-check/stages/cleared.json";
import scenario03 from "../demo-data/scenarios/03-reopened-paperwork/scenario.json";
import messages03 from "../demo-data/scenarios/03-reopened-paperwork/messages.json";
import bundle03 from "../demo-data/scenarios/03-reopened-paperwork/stages/correction-accepted.json";
import scenario04 from "../demo-data/scenarios/04-equipment-return/scenario.json";
import messages04 from "../demo-data/scenarios/04-equipment-return/messages.json";
import bundle04 from "../demo-data/scenarios/04-equipment-return/stages/it-received.json";
import scenario05 from "../demo-data/scenarios/05-post-exit-expense/scenario.json";
import messages05 from "../demo-data/scenarios/05-post-exit-expense/messages.json";
import bundle05 from "../demo-data/scenarios/05-post-exit-expense/stages/approved-unpaid.json";
import scenario06 from "../demo-data/scenarios/06-coverage-gap/scenario.json";
import messages06 from "../demo-data/scenarios/06-coverage-gap/messages.json";
import bundle06 from "../demo-data/scenarios/06-coverage-gap/stages/new-eligibility-confirmed.json";
import scenario07 from "../demo-data/scenarios/07-payroll-access/scenario.json";
import messages07 from "../demo-data/scenarios/07-payroll-access/messages.json";
import bundle07 from "../demo-data/scenarios/07-payroll-access/stages/tax-followup.json";
import scenario08 from "../demo-data/scenarios/08-onboarding-coordination/scenario.json";
import messages08 from "../demo-data/scenarios/08-onboarding-coordination/messages.json";
import bundle08 from "../demo-data/scenarios/08-onboarding-coordination/stages/partial-completion.json";
import type {
  Contact,
  Document,
  MailMessage,
  Profile,
  ScenarioState,
  Workspace,
} from "./types";

interface RawStep {
  id: string;
  title: string;
  expected: string;
  mustNot: string;
  evidence: { sourceId: string; quote: string }[];
  releaseMessageIds: string[];
  releaseDocumentIds: string[];
  requiresUserApproval: boolean;
}
interface RawScenario {
  id: string;
  title: string;
  summary: string;
  initialClock: string;
  profile: Profile;
  steps: RawStep[];
}
interface RawMessage {
  id: string;
  date: string;
  subject: string;
  body: string;
  attachments: { id: string; title: string }[];
  inReplyTo: string | null;
  direction: "inbound" | "outbound";
  from: Contact;
  recipients: Contact[];
}
interface RawBundle {
  documents: Document[];
}
export interface ScenarioData {
  scenario: RawScenario;
  messages: RawMessage[];
  // The final cumulative stage bundle holds every document; steps release them.
  documents: Document[];
}

const library: ScenarioData[] = [
  [scenario01, messages01, bundle01],
  [scenario02, messages02, bundle02],
  [scenario03, messages03, bundle03],
  [scenario04, messages04, bundle04],
  [scenario05, messages05, bundle05],
  [scenario06, messages06, bundle06],
  [scenario07, messages07, bundle07],
  [scenario08, messages08, bundle08],
].map(([scenario, messages, bundle]) => ({
  scenario: scenario as unknown as RawScenario,
  messages: messages as unknown as RawMessage[],
  documents: (bundle as unknown as RawBundle).documents,
}));

export const scenarioIds = manifest.scenarios.map((s) => s.id);

export function scenarioData(id: string): ScenarioData {
  const data = library.find((d) => d.scenario.id === id);
  if (!data) throw new Error("Choose one of the practice cases.");
  return data;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const later = (a: string, b: string) =>
  Date.parse(a) >= Date.parse(b) ? a : b;

function selfContact(data: ScenarioData): Contact {
  const self = data.messages.find((m) => m.direction === "outbound")!.from;
  return { name: data.scenario.profile.name, address: self.address };
}

// The address book a person would already have: everyone in the case except
// themselves. Exposing a future correspondent's address does not leak content.
function contacts(data: ScenarioData): Contact[] {
  const self = selfContact(data);
  const found = new Map<string, Contact>();
  for (const m of data.messages)
    for (const c of [m.from, ...m.recipients])
      if (!same(c.address, self.address)) found.set(c.address.toLowerCase(), c);
  return [...found.values()];
}

function checkpoint(step: RawStep) {
  return { title: step.title, expected: step.expected, mustNot: step.mustNot };
}

function resolveId(state: ScenarioState, id: string | null) {
  return id ? state.aliases[id] || id : null;
}

function threadOf(w: Workspace, inReplyTo: string | null, fallback: string) {
  const parent = inReplyTo && w.mail?.find((m) => m.id === inReplyTo);
  return parent ? parent.threadId : fallback;
}

function releaseInbound(w: Workspace, data: ScenarioData, step: RawStep) {
  const state = w.scenario!;
  w.mail ??= [];
  for (const id of step.releaseMessageIds) {
    const raw = data.messages.find((m) => m.id === id)!;
    if (raw.direction !== "inbound" || w.mail.some((m) => m.id === id))
      continue;
    const inReplyTo = resolveId(state, raw.inReplyTo);
    const emailDoc = data.documents.find((d) => d.id === raw.id)!;
    w.documents.push({
      ...emailDoc,
      name: `Email · ${raw.subject}`,
      addedAt: raw.date,
    });
    for (const attachment of raw.attachments) {
      const doc = data.documents.find((d) => d.id === attachment.id);
      if (doc && !w.documents.some((d) => d.id === doc.id))
        w.documents.push({ ...doc, name: attachment.title, addedAt: raw.date });
    }
    w.mail.push({
      id: raw.id,
      threadId: threadOf(w, inReplyTo, raw.id),
      direction: "inbound",
      from: raw.from,
      to: raw.recipients,
      subject: raw.subject,
      body: raw.body,
      at: raw.date,
      inReplyTo,
      attachmentIds: raw.attachments.map((a) => a.id),
      documentId: raw.id,
      taskIds: [],
      triaged: false,
    });
    state.clock = later(raw.date, state.clock);
    w.activity.unshift({
      id: randomUUID(),
      at: new Date().toISOString(),
      title: `New email from ${raw.from.name}`,
      detail: `${raw.subject}${raw.attachments.length ? ` · ${raw.attachments.length} attachment` : ""}`,
      type: "mail",
    });
  }
  state.checkpoint = checkpoint(step);
}

function expectedOutbound(data: ScenarioData, step: RawStep) {
  const samples = step.releaseMessageIds
    .map((id) => data.messages.find((m) => m.id === id)!)
    .filter((m) => m.direction === "outbound");
  return {
    to: samples.flatMap((m) => m.recipients),
    attachments: samples.flatMap((m) => m.attachments),
  };
}

// The user's email stands in for the case's sample only when it reaches the
// same recipient with the same attachments, so a status update sent early can
// never count as a claim submission.
function satisfies(
  sent: MailMessage,
  expected: ReturnType<typeof expectedOutbound>,
) {
  return (
    sent.direction === "outbound" &&
    sent.to.some((to) =>
      expected.to.some((e) => same(e.address, to.address)),
    ) &&
    expected.attachments.every((a) => sent.attachmentIds.includes(a.id))
  );
}

// Stored on the workspace so the client never loads case data. Only the next
// recipient and required attachments are exposed, never future mail content.
function syncWaiting(state: ScenarioState, data: ScenarioData) {
  const step = data.scenario.steps[state.released];
  const expected = step?.requiresUserApproval
    ? expectedOutbound(data, step)
    : null;
  state.waitingFor = expected?.to[0];
  state.waitingAttachments = expected?.attachments.length
    ? expected.attachments.map((a) => a.title)
    : undefined;
}

// Called for every approved send. If the case expects this email next, the
// user's own approved email stands in for the sample.
export function acknowledgeOutbound(w: Workspace, sent: MailMessage) {
  const state = w.scenario;
  if (!state) return false;
  const data = scenarioData(state.id);
  const step = data.scenario.steps[state.released];
  if (!step?.requiresUserApproval) return false;
  if (!satisfies(sent, expectedOutbound(data, step))) return false;
  for (const id of step.releaseMessageIds) state.aliases[id] = sent.id;
  state.released++;
  state.checkpoint = checkpoint(step);
  syncWaiting(state, data);
  return true;
}

export function deliverNext(w: Workspace) {
  const state = w.scenario;
  if (!state) throw new Error("Only practice cases can deliver demo emails.");
  const data = scenarioData(state.id);
  let step = data.scenario.steps[state.released];
  if (step?.requiresUserApproval) {
    const expected = expectedOutbound(data, step);
    const sent = (w.mail || []).find((m) => satisfies(m, expected));
    if (!sent)
      throw new Error(
        `This case is waiting for your approved email to ${expected.to[0]?.name || "the employer"}${
          expected.attachments.length
            ? ` with ${expected.attachments.map((a) => a.title).join(", ")} attached`
            : ""
        }.`,
      );
    acknowledgeOutbound(w, sent);
    step = data.scenario.steps[state.released];
  }
  if (!step) throw new Error("No more emails in this practice case.");
  releaseInbound(w, data, step);
  state.released++;
  syncWaiting(state, data);
  return w;
}

export function makeScenarioWorkspace(id: string): Workspace {
  const data = scenarioData(id);
  const s = data.scenario;
  const w: Workspace = {
    profile: { ...s.profile },
    documents: [],
    tasks: [],
    activity: [
      {
        id: randomUUID(),
        at: new Date().toISOString(),
        title: "Practice case opened",
        detail: `${s.title}. Fictional people and employers; email is simulated inside JobSwitch.`,
        type: "system",
      },
    ],
    resources: [],
    demo: true,
    analyzedAt: null,
    analysisSummary: s.summary,
    agent: { enabled: true, pending: true },
    mail: [],
    drafts: [],
    scenario: {
      id: s.id,
      title: s.title,
      summary: s.summary,
      released: 0,
      total: s.steps.length,
      clock: s.initialClock,
      self: selfContact(data),
      contacts: contacts(data),
      aliases: {},
    },
  };
  return deliverNext(w);
}

export function replaceWorkspace(target: Workspace, next: Workspace) {
  for (const key of Object.keys(target)) delete (target as never)[key];
  Object.assign(target, next);
}
