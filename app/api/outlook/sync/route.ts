import { withWorkspaceLock, WorkspaceBusyError } from "@/lib/db";
import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { syncOutlook } from "@/lib/outlook/sync";
export const maxDuration = 300;
export async function POST() {
  try {
    await sameOrigin();
    const id = await sessionId();
    return Response.json(await withWorkspaceLock(id, () => syncOutlook(id)));
  } catch (e) {
    return Response.json(
      { error: publicError(e) },
      { status: e instanceof WorkspaceBusyError ? 409 : 400 },
    );
  }
}
