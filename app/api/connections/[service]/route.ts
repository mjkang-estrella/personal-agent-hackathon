import { requireUser, SignInRequired } from "@/lib/auth/server";
import { z } from "zod";
import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { withWorkspaceLock, getWorkspace, WorkspaceBusyError } from "@/lib/db";
import { serviceSchema, configured } from "@/lib/connections/config";
import { connection, disconnect } from "@/lib/connections/store";
import { begin } from "@/lib/connections/oauth";
import { preview, createReminder, receipts } from "@/lib/connections/calendar";
export const maxDuration = 60;
type Context = { params: Promise<{ service: string }> };
export async function GET(_: Request, context: Context) {
  try {
    await requireUser();
    const service = serviceSchema.parse((await context.params).service),
      id = await sessionId();
    const c = await connection(id, service);
    return Response.json(
      {
        configured: configured(service),
        connected: c?.status === "connected",
        status: c?.status,
        email: c?.email,
        receipts: await receipts(id, service),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof SignInRequired
            ? e.message
            : "Connection status unavailable.",
      },
      { status: e instanceof SignInRequired ? 401 : 503 },
    );
  }
}
export async function POST(request: Request, context: Context) {
  try {
    await requireUser();
    await sameOrigin();
    const service = serviceSchema.parse((await context.params).service),
      id = await sessionId();
    const data = z
      .object({
        action: z.enum(["connect", "disconnect", "preview", "create"]),
        data: z.unknown().optional(),
      })
      .strict()
      .parse(await request.json());
    const result = await withWorkspaceLock(id, async () => {
      const w = await getWorkspace(id);
      if (data.action === "disconnect") {
        await disconnect(id, service);
        return { disconnected: true };
      }
      if (w.demo)
        throw new Error(
          "Please start a personal workspace before connecting this service.",
        );
      if (data.action === "connect") return { url: await begin(id, service) };
      if (data.action === "preview") return preview(id, service, data.data);
      return createReminder(id, service, data.data);
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      { error: publicError(e) },
      {
        status:
          e instanceof SignInRequired
            ? 401
            : e instanceof WorkspaceBusyError
              ? 409
              : 400,
      },
    );
  }
}
