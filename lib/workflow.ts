import { createHash, randomUUID } from "node:crypto";
import { analyst, analysisSchema, context } from "./agent";
import { activity, getWorkspace, mutate } from "./db";
import { validEvidence } from "./domain";
import { MODEL_LABEL } from "./model-config";
import { nextAgentStep } from "./automation";
import { prepareClaim, syncMail } from "./services";
import type { Workspace } from "./types";

export function workflowInput(w: Workspace) {
  const serialized = JSON.stringify(
    { profile: w.profile, documents: w.documents },
    (_key, value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
          )
        : value,
  );
  return createHash("sha256").update(serialized).digest("hex");
}

export async function analyzeWorkspace(id: string) {
  const w = await getWorkspace(id);
  if (!w.documents.some((d) => d.kind === "policy"))
    throw new Error("Upload your employer handbooks before running analysis.");
  const input = workflowInput(w);
  const response = await analyst.generate(
    `Build 4-8 actionable transition tasks from these documents. Every evidence quote MUST be an exact substring of the page. Never invent deadlines, balances or eligibility. Use departure/start/enrollment rules only if explicitly supported by policy. enrollment means start+29 days only when a policy specifies 30 days inclusive. Amount is potential reimbursement or allowance, never guaranteed savings. Identify learning reimbursement when supported. Do not duplicate the same task.\n${context(w)}`,
    { structuredOutput: { schema: analysisSchema } },
  );
  const result = response.object;
  if (!result) throw new Error("No analysis returned.");
  const supported = result.tasks.filter(
    (t) =>
      t.evidence.length > 0 && t.evidence.every((e) => validEvidence(e, w)),
  );
  if (!supported.length) throw new Error("No supported tasks were found.");
  return mutate(id, (s) => {
    if (workflowInput(s) !== input)
      throw new Error(
        "Your documents changed during analysis. Please try again.",
      );
    // Analysis output has no decision options, so keep evidence-backed choices.
    const progressed = s.tasks.filter(
      (t) =>
        t.status !== "todo" ||
        (t.decision &&
          [
            ...t.evidence,
            ...t.decision.options.flatMap((o) => o.evidence || []),
          ].every((e) => validEvidence(e, s))),
    );
    s.tasks = [
      ...progressed,
      ...supported
        .filter(
          (t) =>
            !progressed.some(
              (p) => p.category === t.category && p.stage === t.stage,
            ),
        )
        .map((t) => ({ ...t, id: randomUUID(), status: "todo" as const })),
    ];
    s.analyzedAt = new Date().toISOString();
    s.analysisSummary = result.summary;
    s.agent = {
      ...s.agent,
      enabled: s.agent?.enabled ?? true,
      analyzedInput: input,
      preparedInputs: {},
      pending: true,
    };
    activity(
      s,
      "Your documents have been analyzed",
      `${supported.length} tasks grounded in verified document quotes. Model: ${MODEL_LABEL}.`,
    );
  });
}

// Called under the same workspace lock as manual actions. One bounded step per request.
export async function advanceAgent(id: string) {
  let w = await getWorkspace(id);
  const input = workflowInput(w);
  const step = nextAgentStep(w, input);
  if (!step) {
    if (w.agent?.pending === false) return w;
    return mutate(id, (s) => {
      s.agent = {
        ...s.agent,
        enabled: s.agent?.enabled ?? true,
        phase: "idle",
        pending: false,
      };
    });
  }
  await mutate(id, (s) => {
    s.agent = { ...s.agent, enabled: true, phase: step.kind, pending: true };
  });
  try {
    if (step.kind === "analyze") w = await analyzeWorkspace(id);
    if (step.kind === "triage") {
      const { triageMail } = await import("./triage");
      w = await triageMail(id);
    }
    if (step.kind === "prepare") {
      w = await prepareClaim(id, step.taskId);
      w = await mutate(id, (s) => {
        s.agent!.preparedInputs = {
          ...s.agent!.preparedInputs,
          [step.taskId]: input,
        };
      });
    }
    if (step.kind === "sync") {
      w = await syncMail(id);
      w = await mutate(id, (s) => {
        s.agent!.lastSyncedAt = new Date().toISOString();
      });
    }
    return mutate(id, (s) => {
      s.agent!.phase = "idle";
      s.agent!.pending = !!nextAgentStep(s, workflowInput(s));
      s.agent!.lastRunAt = new Date().toISOString();
    });
  } catch {
    // Provider errors may contain private inputs or credentials. Persist only fixed copy.
    return mutate(id, (s) => {
      s.agent!.phase = "idle";
      s.agent!.pending = false;
      s.agent!.error =
        "The agent could not finish this step. Your progress is saved. Retry when you’re ready.";
      activity(
        s,
        "Agent needs a retry",
        "Automatic work stopped. No claim or email was sent by the agent loop.",
        "system",
      );
    });
  }
}
