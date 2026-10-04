export const maxDuration = 300;
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  sessionId,
  newSessionId,
  sameOrigin,
  publicError,
} from "@/lib/session";
import { getWorkspace, mutate, activity } from "@/lib/db";
import { analyst, analysisSchema, context, research } from "@/lib/agent";
import {
  prepareClaim,
  submitClaim,
  demoHR,
  syncMail,
  sendCertificate,
} from "@/lib/services";
import { updateDates, validEvidence } from "@/lib/domain";
import { completionCertificate } from "@/lib/fixtures";
const schema = z.object({
  action: z.enum([
    "analyze",
    "prepare",
    "submit",
    "sync",
    "hr_request",
    "hr_approve",
    "certificate",
    "send_certificate",
    "dates",
    "profile",
    "complete",
    "research",
    "new_workspace",
  ]),
  mode: z.enum(["demo", "personal"]).optional(),
  approval: z.string().optional(),
  taskId: z.string().optional(),
  certificateId: z.string().optional(),
  lastDay: z.string().optional(),
  startDay: z.string().optional(),
  name: z.string().max(100).optional(),
  previousEmployer: z.string().max(100).optional(),
  nextEmployer: z.string().max(100).optional(),
  topic: z.enum(["coverage", "retirement", "enrollment"]).optional(),
});
export async function POST(request: Request) {
  try {
    await sameOrigin();
    const data = schema.parse(await request.json());
    const id = await sessionId();
    let w = await getWorkspace(id);
    switch (data.action) {
      case "new_workspace": {
        const next = await newSessionId();
        w = await getWorkspace(next);
        if (data.mode === "personal")
          w = await mutate(next, (s) => {
            s.demo = false;
            s.documents = [];
            s.tasks = [];
            s.activity = [];
            s.profile = {
              name: "Your name",
              previousEmployer: "Previous employer",
              nextEmployer: "New employer",
              lastDay: s.profile.lastDay,
              startDay: s.profile.startDay,
            };
            s.analysisSummary = "Add your handbooks and dates to begin.";
            activity(
              s,
              "Your personal workspace is ready",
              "Add your dates, both employer handbooks, and any supporting documents.",
            );
          });
        break;
      }
      case "analyze": {
        if (!w.documents.some((d) => d.kind === "policy"))
          throw new Error(
            "Upload your employer handbooks before running analysis.",
          );
        const snapshot = JSON.stringify({
          profile: w.profile,
          documents: w.documents,
        });
        const response = await analyst.generate(
          `Build 4-8 actionable transition tasks from these documents. Every evidence quote MUST be an exact substring of the page. Never invent deadlines, balances or eligibility. Use departure/start/enrollment rules only if explicitly supported by policy. enrollment means start+29 days only when a policy specifies 30 days inclusive. Amount is potential reimbursement or allowance, never guaranteed savings. Identify learning reimbursement when supported. Do not duplicate the same task.\n${context(w)}`,
          { structuredOutput: { schema: analysisSchema } },
        );
        const result = response.object;
        if (!result) throw new Error("No analysis returned.");
        const supported = result.tasks.filter((t) =>
          t.evidence.every((e) => validEvidence(e, w)),
        );
        if (!supported.length)
          throw new Error("No supported tasks were found.");
        w = await mutate(id, (s) => {
          if (
            JSON.stringify({ profile: s.profile, documents: s.documents }) !==
            snapshot
          )
            throw new Error(
              "Your documents changed during analysis. Please try again.",
            );
          const progressed = s.tasks.filter((t) => t.status !== "todo");
          s.tasks = [
            ...progressed,
            ...supported
              .filter(
                (t) =>
                  !progressed.some(
                    (p) => p.category === t.category && p.stage === t.stage,
                  ),
              )
              .map((t) => ({
                ...t,
                id: randomUUID(),
                status: "todo" as const,
              })),
          ];
          s.analyzedAt = new Date().toISOString();
          s.analysisSummary = result.summary;
          activity(
            s,
            "Your documents have been analyzed",
            `${supported.length} tasks grounded in verified document quotes. Model: gpt-6-luna.`,
          );
        });
        break;
      }
      case "prepare":
        w = await prepareClaim(id, data.taskId!);
        break;
      case "submit":
        w = await submitClaim(id, data.taskId!, data.approval || "");
        break;
      case "sync":
        w = await syncMail(id);
        break;
      case "hr_request":
      case "hr_approve":
        w = await demoHR(
          id,
          data.taskId!,
          data.action === "hr_request" ? "request" : "approve",
        );
        break;
      case "certificate":
        w = await mutate(id, (s) => {
          if (!s.demo)
            throw new Error("Only the demo supports sample certificates.");
          if (!s.documents.some((d) => d.id === "course-certificate"))
            s.documents.push(completionCertificate());
          activity(
            s,
            "Completion certificate added",
            "Loaded the matching fictional certificate.",
            "user",
          );
        });
        break;
      case "send_certificate":
        w = await sendCertificate(
          id,
          data.taskId!,
          data.certificateId!,
          data.approval || "",
        );
        break;
      case "dates":
        w = await mutate(id, (s) => {
          if (s.tasks.some((t) => t.status === "submitting"))
            throw new Error(
              "Please wait for the current submission to finish.",
            );
          updateDates(s, data.lastDay!, data.startDay!);
          activity(
            s,
            "Your transition dates changed",
            "Date-based deadlines updated. Review eligibility again before new submissions.",
            "user",
          );
        });
        break;
      case "profile":
        w = await mutate(id, (s) => {
          if (s.tasks.some((t) => t.status === "submitting"))
            throw new Error(
              "Please wait for the current submission to finish.",
            );
          for (const t of s.tasks) {
            if (t.status === "ready") {
              t.status = "todo";
              delete t.claim;
            }
          }
          if (data.name) s.profile.name = data.name;
          if (data.previousEmployer)
            s.profile.previousEmployer = data.previousEmployer;
          if (data.nextEmployer) s.profile.nextEmployer = data.nextEmployer;
          activity(
            s,
            "Profile updated",
            "Your transition workspace has been updated.",
            "user",
          );
        });
        break;
      case "complete":
        w = await mutate(id, (s) => {
          const t = s.tasks.find((t) => t.id === data.taskId);
          if (!t || t.claim)
            throw new Error(
              "This claim must be completed through HR confirmation.",
            );
          t.status = t.status === "done" ? "todo" : "done";
          activity(
            s,
            t.status === "done"
              ? "You marked a task complete"
              : "You reopened a task",
            t.title,
            "user",
          );
        });
        break;
      case "research": {
        const results = await research(data.topic || "coverage");
        w = await mutate(id, (s) => {
          s.resources = results;
          activity(
            s,
            "Official guidance found",
            `Exa found ${results.length} public sources. These explain options; they do not determine your eligibility.`,
          );
        });
        break;
      }
    }
    return Response.json(w);
  } catch (error) {
    return Response.json({ error: publicError(error) }, { status: 400 });
  }
}
