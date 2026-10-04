import { createHash } from "node:crypto";
import { z } from "zod";
import type { BrowserIntent, StagehandAction } from "./types";

export const intentSchema = z.object({
  goal: z.string().trim().min(5).max(2000),
  outcome: z.string().trim().min(3).max(300).nullable(),
  fields: z
    .array(
      z.object({
        name: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
        label: z.string().trim().min(1).max(120),
        value: z.string().max(2000),
      }),
    )
    .max(30)
    .refine((f) => new Set(f.map((x) => x.name)).size === f.length),
  files: z
    .array(
      z.object({
        documentId: z.string().min(1).max(100),
        name: z.string().trim().min(1).max(200),
      }),
    )
    .max(5),
});

// Canonical hash of what the user confirmed. Any change needs a new confirmation.
export function intentHash(intent: BrowserIntent) {
  const canonical = {
    goal: intent.goal,
    outcome: intent.outcome,
    fields: [...intent.fields]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => [f.name, f.label, f.value]),
    files: [...intent.files]
      .sort((a, b) => a.documentId.localeCompare(b.documentId))
      .map((f) => [f.documentId, f.name]),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

// Every method Stagehand v4 can replay. Anything else pauses.
const METHODS = new Set([
  "click",
  "fill",
  "type",
  "press",
  "scrollTo",
  "nextChunk",
  "prevChunk",
  "selectOptionFromDropdown",
]);
const KEYS = new Set([
  "Enter",
  "Tab",
  "Escape",
  "ArrowDown",
  "ArrowUp",
  "Space",
]);
const CONSEQUENTIAL =
  /\b(submit|send|pay|payment|purchase|buy|order|checkout|confirm|delete|remove|cancel|withdraw|transfer|e-?sign|sign and|accept|agree|authori[sz]e|enrol|enroll|elect|finali[sz]e|terminate|place)\b/i;
const PRIVACY_CHOICE =
  /cookie.*\b(reject|decline|necessary only|essential only)\b|\b(reject|decline)\b.*cookie/i;
const SEARCH = /\b(search|filter|find)\b/i;

export type Decision =
  { kind: "auto" } | { kind: "outcome" } | { kind: "pause"; reason: string };

// Portals often split one value across inputs (hour/minute, month/day/year,
// phone parts). A piece of a confirmed value is still that confirmed value.
const fromConfirmed = (arg: string, value: string) =>
  arg === value ||
  (arg.trim().length > 0 &&
    value.split(/[\s:/.,-]+/).some((part) => part === arg.trim()));

const variable = (arg: string) => /^%([a-z][a-z0-9_]{0,39})%$/.exec(arg)?.[1];

// Decide whether a proposed action fits the confirmed intent. Page content and
// the planner are untrusted, so the outcome requires both the planner's claim
// and an unused outcome slot; keyword matches alone can only pause.
export function reviewAction(
  action: StagehandAction,
  intent: BrowserIntent,
  plannerSaysOutcome: boolean,
  outcomeTaken: boolean,
): Decision {
  const method = action.method || "click";
  const args = action.arguments ?? [];
  if (!METHODS.has(method))
    return {
      kind: "pause",
      reason: `The portal needs an unsupported action (${method}).`,
    };
  if (
    method === "fill" ||
    method === "type" ||
    method === "selectOptionFromDropdown"
  ) {
    if (args.length !== 1)
      return { kind: "pause", reason: "The proposed entry was ambiguous." };
    const name = variable(args[0]);
    const confirmed = name
      ? intent.fields.some((f) => f.name === name)
      : intent.fields.some((f) => fromConfirmed(args[0], f.value)) ||
        (method !== "selectOptionFromDropdown" &&
          SEARCH.test(action.description) &&
          args[0].length <= 100);
    if (!confirmed)
      return {
        kind: "pause",
        reason: `The portal asks for a value you haven't confirmed: ${action.description} → "${args[0].slice(0, 80)}"`,
      };
    return { kind: "auto" };
  }
  if (method === "press" && !KEYS.has(args[0] ?? ""))
    return { kind: "pause", reason: "The agent proposed an unsupported key." };
  if (method !== "click" && method !== "press") return { kind: "auto" };
  if (PRIVACY_CHOICE.test(action.description)) return { kind: "auto" };
  const consequential =
    plannerSaysOutcome || CONSEQUENTIAL.test(action.description);
  if (!consequential) return { kind: "auto" };
  if (plannerSaysOutcome && intent.outcome && !outcomeTaken)
    return { kind: "outcome" };
  return {
    kind: "pause",
    reason: outcomeTaken
      ? `The confirmed outcome was already attempted. This step needs your decision: ${action.description}`
      : `This step may have consequences you haven't confirmed: ${action.description}`,
  };
}

export const variablesFor = (intent: BrowserIntent) =>
  Object.fromEntries(
    intent.fields.map((f) => [
      f.name,
      { value: f.value, description: f.label },
    ]),
  );
