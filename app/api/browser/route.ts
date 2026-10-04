import { z } from "zod";
import { sessionId } from "@/lib/session";
import { requireUser, SignInRequired } from "@/lib/auth/server";
import { getWorkspace, withWorkspaceLock, WorkspaceBusyError } from "@/lib/db";
import { account, accounts } from "@/lib/browser/store";
import { publicAccount } from "@/lib/browser/security";
import {
  browserConfigured,
  closeRun,
  connectAccount,
  deleteAccount,
  loginAccount,
  refreshAccount,
} from "@/lib/browser/service";
import {
  advanceRun,
  confirmRun,
  draftRun,
  allowStep,
  pauseRun,
  resumeRun,
} from "@/lib/browser/runner";
import { intentSchema } from "@/lib/browser/intent";

export const maxDuration = 180;
const headers = { "Cache-Control": "no-store" };
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("connect"),
      label: z.string().trim().min(1).max(80),
      url: z.string().url().max(2000),
      username: z.string().max(320).optional(),
      password: z.string().max(2000).optional(),
      consent: z.literal(true),
    })
    .refine((v) => !!v.username === !!v.password),
  z.object({
    action: z.enum([
      "refresh",
      "login",
      "delete",
      "advance",
      "pause",
      "resume",
      "allow",
      "close",
    ]),
    id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("draft"),
    id: z.string().uuid(),
    goal: z.string().trim().min(5).max(2000),
    consent: z.literal(true),
  }),
  z.object({
    action: z.literal("confirm"),
    id: z.string().uuid(),
    intent: intentSchema,
    intentHash: z.string().regex(/^[0-9a-f]{64}$/),
  }),
]);
export async function GET() {
  try {
    // Saved portal access is personal: require a verified account, as for
    // uploads and inbox connectors.
    await requireUser();
    if (!browserConfigured())
      return Response.json({ configured: false, accounts: [] }, { headers });
    return Response.json(
      {
        configured: true,
        accounts: (await accounts(await sessionId())).map(publicAccount),
      },
      { headers },
    );
  } catch (e) {
    if (e instanceof SignInRequired)
      return Response.json({ error: e.message }, { status: 401, headers });
    return Response.json(
      {
        error:
          "Connected accounts are unavailable. Check configuration and the browser-account migration.",
      },
      { status: 503, headers },
    );
  }
}
export async function POST(request: Request) {
  try {
    // Require an explicit exact origin for credential-bearing requests, including scheme.
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json(
        { error: "Request origin does not match." },
        { status: 403, headers },
      );
    if (!browserConfigured())
      return Response.json(
        { error: "Browser connections are not configured yet." },
        { status: 503, headers },
      );
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 64000)
      return Response.json(
        { error: "Request is too large." },
        { status: 413, headers },
      );
    const data = schema.parse(JSON.parse(raw));
    await requireUser();
    const workspace = await sessionId();
    if (data.action === "advance") {
      // A per-account lock keeps long browser steps from blocking the
      // workspace. Pause, close and new plans still win through fenced saves.
      await account(workspace, data.id);
      await withWorkspaceLock(`browser:${data.id}`, () =>
        advanceRun(workspace, data.id),
      );
    } else
      await withWorkspaceLock(workspace, async () => {
        await getWorkspace(workspace);
        if (data.action === "connect") return connectAccount(workspace, data);
        const a = await account(workspace, data.id);
        if (a.status === "deleting" && data.action !== "delete")
          throw new Error("Account is disconnected.");
        switch (data.action) {
          case "refresh":
            return refreshAccount(workspace, a);
          case "login":
            return loginAccount(workspace, a);
          case "delete":
            return deleteAccount(workspace, a);
          case "draft":
            if ((await refreshAccount(workspace, a)).status !== "connected")
              throw new Error("Finish signing in first.");
            return draftRun(workspace, a, data.goal);
          case "confirm":
            return confirmRun(workspace, a, data.intent, data.intentHash);
          case "pause":
            return pauseRun(workspace, a);
          case "resume":
            return resumeRun(workspace, a);
          case "allow":
            return allowStep(workspace, a);
          case "close":
            return closeRun(workspace, a);
        }
      });
    return Response.json(
      {
        configured: true,
        accounts: (await accounts(workspace)).map(publicAccount),
      },
      { headers },
    );
  } catch (e) {
    if (e instanceof SignInRequired)
      return Response.json({ error: e.message }, { status: 401, headers });
    // Provider and validation errors may include passwords or page contents. Never echo them.
    const busy = e instanceof WorkspaceBusyError;
    return Response.json(
      {
        error: busy
          ? "Another step is running. Try again shortly."
          : "This step could not finish. Refresh the accounts, check the live browser if a task was running, and try again. Outcomes are never retried automatically.",
      },
      { status: busy ? 409 : 400, headers },
    );
  }
}
