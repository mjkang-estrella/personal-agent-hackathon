import { z } from "zod";
import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { withWorkspaceLock, getWorkspace, WorkspaceBusyError } from "@/lib/db";
import { fileServiceSchema } from "@/lib/connections/config";
import { listFiles, importFile } from "@/lib/connections/files";
export const maxDuration = 60;
export async function POST(
  request: Request,
  context: { params: Promise<{ service: string }> },
) {
  try {
    await sameOrigin();
    const id = await sessionId(),
      service = fileServiceSchema.parse((await context.params).service);
    const input = z
      .object({
        action: z.enum(["list", "import"]),
        data: z.unknown().optional(),
      })
      .strict()
      .parse(await request.json());
    const result = await withWorkspaceLock(id, async () => {
      if ((await getWorkspace(id)).demo)
        throw new Error(
          "Please start a personal workspace before connecting documents.",
        );
      return input.action === "list"
        ? listFiles(id, service, input.data)
        : importFile(id, service, input.data);
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      { error: publicError(e) },
      { status: e instanceof WorkspaceBusyError ? 409 : 400 },
    );
  }
}
