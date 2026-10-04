import { z } from "zod";
import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { withWorkspaceLock, getWorkspace, WorkspaceBusyError } from "@/lib/db";
import {
  serviceSchema,
  calendarServiceSchema,
  configured,
} from "@/lib/connections/config";
import { connection, disconnect } from "@/lib/connections/store";
import { begin } from "@/lib/connections/oauth";
import { preview, createReminder, receipts } from "@/lib/connections/calendar";
export const maxDuration = 60;
type Context = { params: Promise<{ service: string }> };
export async function GET(_: Request, context: Context) {
  try {
    const service = serviceSchema.parse((await context.params).service),
      id = await sessionId();
    const c = await connection(id, service);
    return Response.json(
      {
        configured: configured(service),
        connected: c?.status === "connected",
        status: c?.status,
        email: c?.email,
        receipts: calendarServiceSchema.safeParse(service).success
          ? await receipts(id, calendarServiceSchema.parse(service))
          : [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Connection status unavailable." },
      { status: 503 },
    );
  }
}
export async function POST(request: Request, context: Context) {
  try {
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
      const calendar = calendarServiceSchema.parse(service);
      if (data.action === "preview") return preview(id, calendar, data.data);
      return createReminder(id, calendar, data.data);
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      { error: publicError(e) },
      { status: e instanceof WorkspaceBusyError ? 409 : 400 },
    );
  }
}
