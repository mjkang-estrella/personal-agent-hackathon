import { requireUser } from "@/lib/auth/server";
import { setBackground } from "@/lib/background";
export const maxDuration = 300;
import { z } from "zod";
import {
  sessionId,
  newSessionId,
  sameOrigin,
  publicError,
} from "@/lib/session";
import {
  getWorkspace,
  mutate,
  activity,
  withWorkspaceLock,
  WorkspaceBusyError,
} from "@/lib/db";
import { research } from "@/lib/agent";
import {
  prepareClaim,
  submitClaim,
  demoHR,
  syncMail,
  sendCertificate,
} from "@/lib/services";
import { chooseOption, updateDates } from "@/lib/domain";
import { completionCertificate } from "@/lib/fixtures";
import { advanceAgent, analyzeWorkspace, workflowInput } from "@/lib/workflow";
import { queueAgent } from "@/lib/automation";
import {
  deliverNext,
  makeScenarioWorkspace,
  replaceWorkspace,
  scenarioIds,
} from "@/lib/scenarios";
import {
  dismissDraft,
  resolveDateProposal,
  saveDraft,
  sendDraft,
} from "@/lib/mail-agent";
const schema = z.object({
  action: z.enum([
    "scenario_next",
    "draft_save",
    "draft_send",
    "draft_dismiss",
    "draft_request",
    "date_proposal",
    "advance",
    "agent_pause",
    "agent_resume",
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
    "decide",
    "research",
    "new_workspace",
  ]),
  mode: z.enum(["demo", "personal", "scenario"]).optional(),
  scenarioId: z
    .string()
    .refine((id) => scenarioIds.includes(id))
    .optional(),
  draftId: z.string().max(80).optional(),
  subject: z.string().max(200).optional(),
  body: z.string().max(4000).optional(),
  apply: z.boolean().optional(),
  approval: z.string().optional(),
  taskId: z.string().optional(),
  optionId: z.string().max(80).optional(),
  to: z.string().max(200).optional(),
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
    return await withWorkspaceLock(id, async () => {
      let w = await getWorkspace(id);
      switch (data.action) {
        case "new_workspace": {
          if (data.mode === "personal") await requireUser();
          const { disconnect } = await import("@/lib/gmail/oauth");
          const { gmailConfigured } = await import("@/lib/gmail/security");
          if (gmailConfigured()) await disconnect(id);
          const outlook = await import("@/lib/outlook/oauth");
          await outlook.disconnect(id);
          const connections = await import("@/lib/connections/store");
          await connections.disconnect(id);
          if (w.background?.enabled) await setBackground(id, false);
          if (data.mode === "scenario" && !data.scenarioId)
            throw new Error("Choose one of the practice cases.");
          const next = await newSessionId();
          w = await getWorkspace(next);
          if (data.mode === "scenario")
            w = await mutate(next, (s) =>
              replaceWorkspace(s, makeScenarioWorkspace(data.scenarioId!)),
            );
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
        case "advance":
          w = await advanceAgent(id);
          break;
        case "scenario_next":
          w = await mutate(id, (s) => {
            deliverNext(s);
            queueAgent(s);
          });
          break;
        case "draft_save":
          w = await mutate(id, (s) => {
            saveDraft(
              s,
              data.draftId || "",
              data.subject || "",
              data.body || "",
            );
          });
          break;
        case "draft_send":
          // Edits made in the review panel are saved and sent in one step; the
          // approval must already describe the edited email.
          w = await mutate(id, (s) => {
            const d = s.drafts?.find((x) => x.id === data.draftId);
            if (
              d?.status === "draft" &&
              data.subject !== undefined &&
              data.body !== undefined &&
              (data.subject.trim() !== d.subject || data.body.trim() !== d.body)
            )
              saveDraft(s, d.id, data.subject, data.body);
            sendDraft(s, data.draftId || "", data.approval || "");
          });
          break;
        case "draft_dismiss":
          w = await mutate(id, (s) => dismissDraft(s, data.draftId || ""));
          break;
        case "draft_request": {
          const { draftForTask } = await import("@/lib/triage");
          w = await draftForTask(id, data.taskId || "", data.to);
          break;
        }
        case "date_proposal":
          w = await mutate(id, (s) => {
            resolveDateProposal(s, data.apply === true);
            queueAgent(s);
          });
          break;
        case "agent_pause":
        case "agent_resume":
          w = await mutate(id, (s) => {
            queueAgent(s);
            s.agent!.enabled = data.action === "agent_resume";
            activity(
              s,
              s.agent!.enabled ? "Agent resumed" : "Agent paused",
              "Document analysis, claim preparation, and inbox checks. Sending still requires your approval.",
              "user",
            );
          });
          break;
        case "analyze":
          w = await analyzeWorkspace(id);
          break;
        case "prepare":
          w = await prepareClaim(id, data.taskId!);
          w = await mutate(id, (s) => {
            queueAgent(s);
            s.agent!.preparedInputs = {
              ...s.agent!.preparedInputs,
              [data.taskId!]: workflowInput(s),
            };
          });
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
            queueAgent(s);
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
            queueAgent(s);
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
            queueAgent(s);
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
            if (t.history)
              t.history.push({
                at: s.scenario?.clock || new Date().toISOString(),
                status: t.status,
                note:
                  t.status === "done"
                    ? "You marked this complete"
                    : "You reopened this task",
              });
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
        case "decide":
          w = await mutate(id, (s) => {
            const { task, option } = chooseOption(
              s,
              data.taskId || "",
              data.optionId || "",
              s.scenario?.clock,
            );
            activity(
              s,
              "You made a decision",
              `${task.title}: ${option.label}`,
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
    });
  } catch (error) {
    return Response.json(
      { error: publicError(error) },
      { status: error instanceof WorkspaceBusyError ? 409 : 400 },
    );
  }
}
