// Live end-to-end check of the browser agent: real Kernel browser, Stagehand
// and Neon AI Gateway against httpbin's public sample form, with fictional data.
// The database is an in-memory stand-in; nothing is written to Postgres.
import { mock } from "node:test";
import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import {
  draftRun,
  confirmRun,
  advanceRun,
  allowStep,
} from "../lib/browser/runner";
import { closeRun, kernel } from "../lib/browser/service";
import type { BrowserAccount } from "../lib/browser/types";

const workspace = randomUUID();
const accounts = new Map<string, BrowserAccount>();
const fakeWorkspace = {
  profile: {
    name: "Ada Test",
    previousEmployer: "Northstar",
    nextEmployer: "Orbit",
    lastDay: "2026-10-30",
    startDay: "2026-11-09",
  },
  documents: [],
  tasks: [],
  activity: [],
  resources: [],
  demo: true,
  analyzedAt: null,
  analysisSummary: "",
};
mock.method(pool, "query", async (sql: string, v: unknown[] = []) => {
  if (sql.includes("FROM jobswitch_workspaces"))
    return { rows: [{ data: structuredClone(fakeWorkspace) }], rowCount: 1 };
  if (sql.startsWith("SELECT data FROM jobswitch_browser_accounts")) {
    const a = accounts.get(v[1] as string);
    return {
      rows: a ? [{ data: structuredClone(a) }] : [],
      rowCount: a ? 1 : 0,
    };
  }
  if (sql.includes("UPDATE jobswitch_browser_accounts")) {
    const cur = accounts.get(v[1] as string);
    const fenced = sql.includes("data->'run'->>'id'");
    if (
      !cur ||
      (fenced && (cur.run?.id !== v[3] || cur.run?.status !== "running"))
    )
      return { rows: [], rowCount: 0 };
    accounts.set(v[1] as string, JSON.parse(v[2] as string));
    return { rows: [{ id: v[1] }], rowCount: 1 };
  }
  throw new Error("Unexpected query in smoke test: " + sql.slice(0, 60));
});

const k = kernel();
const profile = `jobswitch-smoke-${randomUUID()}`;
await k.profiles.create({ name: profile });
const id = randomUUID();
accounts.set(id, {
  id,
  label: "httpbin sample form",
  url: "https://httpbin.org/forms/post",
  profile,
  status: "connected",
});
const get = () => structuredClone(accounts.get(id)!);
const t0 = Date.now();
const lap = (s: string) =>
  console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`);
try {
  await draftRun(
    workspace,
    get(),
    "Place a small pizza order for pickup on this test form for customer Ada Test, phone 555-0100, email ada@example.com, with bacon, delivery time 18:00 and the comment 'Fictional smoke test'.",
  );
  const draft = get().run!;
  lap(`draft: outcome=${JSON.stringify(draft.intent.outcome)}`);
  for (const f of draft.intent.fields)
    console.log(`   ${f.name} (${f.label}) = ${JSON.stringify(f.value)}`);
  const missing = draft.intent.fields.filter((f) => !f.value.trim());
  if (missing.length)
    throw new Error(
      "Draft left values empty: " + missing.map((f) => f.name).join(", "),
    );
  await confirmRun(workspace, get(), draft.intent, draft.intentHash);
  lap("confirmed; running");
  let allowed = 0;
  for (let i = 0; i < 8 && get().run!.status === "running"; i++) {
    await advanceRun(workspace, id);
    const r = get().run!;
    lap(`advance ${i + 1}: status=${r.status} steps=${r.steps}`);
    // Play the user's part: allow a waiting non-consequential step (at most twice).
    if (
      r.status === "paused" &&
      r.pending &&
      !r.pending.consequential &&
      allowed < 2
    ) {
      lap(
        `user allows: ${r.pending.action.description} -> ${JSON.stringify(r.pending.action.arguments)}`,
      );
      allowed++;
      await allowStep(workspace, get());
    }
  }
  const r = get().run!;
  console.log("history:");
  for (const h of r.history) console.log(`   [${h.kind}] ${h.description}`);
  console.log("status:", r.status, "| outcome:", JSON.stringify(r.outcome));
  console.log("message:", r.message);
  if (r.question) console.log("question:", r.question);
  const outcomes = r.history.filter((h) => h.kind === "outcome").length;
  console.log(
    outcomes === 1
      ? "PASS outcome attempted exactly once"
      : `CHECK outcome attempts: ${outcomes}`,
  );
} finally {
  const a = accounts.get(id);
  if (a)
    await closeRun(workspace, a).catch((e) =>
      console.log("close failed", e?.message),
    );
  await k.profiles.delete(profile).catch(() => {});
  lap("cleaned up browser and profile");
}
