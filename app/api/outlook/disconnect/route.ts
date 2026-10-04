import { requireUser, SignInRequired } from "@/lib/auth/server";
import { withWorkspaceLock, WorkspaceBusyError } from "@/lib/db";
import { sameOrigin, sessionId, publicError } from "@/lib/session";
import { disconnect } from "@/lib/outlook/oauth";
export async function POST() {
  try {
    await requireUser();
    await sameOrigin();
    const id = await sessionId();
    return Response.json(await withWorkspaceLock(id, () => disconnect(id)));
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
