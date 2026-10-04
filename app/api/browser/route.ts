import { z } from "zod";
import { sessionId } from "@/lib/session";
import { getWorkspace, withWorkspaceLock, WorkspaceBusyError } from "@/lib/db";
import { account, accounts } from "@/lib/browser/store";
import { publicAccount } from "@/lib/browser/security";
import {
  approveRun,
  browserConfigured,
  closeRun,
  connectAccount,
  deleteAccount,
  inspectRun,
  loginAccount,
  refreshAccount,
  resumeRun,
  startRun,
} from "@/lib/browser/service";

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
      "inspect",
      "resume",
      "close",
    ]),
    id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("start"),
    id: z.string().uuid(),
    goal: z.string().trim().min(5).max(2000),
    consent: z.literal(true),
  }),
  z.object({
    action: z.literal("approve"),
    id: z.string().uuid(),
    approval: z.string().uuid(),
  }),
]);
export async function GET() {
  try {
    if (!browserConfigured())
      return Response.json({ configured: false, accounts: [] }, { headers });
    return Response.json(
      {
        configured: true,
        accounts: (await accounts(await sessionId())).map(publicAccount),
      },
      { headers },
    );
  } catch {
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
    if (Buffer.byteLength(raw) > 16000)
      return Response.json(
        { error: "Request is too large." },
        { status: 413, headers },
      );
    const data = schema.parse(JSON.parse(raw));
    const workspace = await sessionId();
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
        case "start":
          return startRun(workspace, a, data.goal);
        case "inspect":
          return inspectRun(workspace, a);
        case "approve":
          return approveRun(workspace, a, data.approval);
        case "resume":
          return resumeRun(workspace, a);
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
    // Provider and validation errors may include passwords or page contents. Never echo them.
    const busy = e instanceof WorkspaceBusyError;
    return Response.json(
      {
        error: busy
          ? "Another step is running. Try again shortly."
          : "This step could not finish. Refresh the accounts, check the live browser if an action was running, and try again. No action is retried automatically.",
      },
      { status: busy ? 409 : 400, headers },
    );
  }
}
