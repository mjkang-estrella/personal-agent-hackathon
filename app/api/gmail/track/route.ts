import { requireUser, SignInRequired } from "@/lib/auth/server";
import { withWorkspaceLock, WorkspaceBusyError } from "@/lib/db";
import { z } from "zod";
import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { senderAddress } from "@/lib/gmail/security";
import { trackThread, untrackThread } from "@/lib/gmail/sync";
export async function POST(request: Request) {
  try {
    await requireUser();
    await sameOrigin();
    const data = z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("track"),
          taskId: z.string().min(1),
          threadId: z.string().regex(/^[a-f0-9]+$/i),
          sender: z.string().max(254),
          alreadySubmitted: z.literal(true),
        }),
        z.object({ action: z.literal("untrack"), taskId: z.string().min(1) }),
      ])
      .parse(await request.json());
    const id = await sessionId();
    if (data.action === "untrack")
      return Response.json(
        await withWorkspaceLock(id, () => untrackThread(id, data.taskId)),
      );
    const sender = senderAddress(data.sender);
    if (!sender) throw new Error("Enter a valid HR email address.");
    return Response.json(
      await withWorkspaceLock(id, () =>
        trackThread(id, data.taskId, data.threadId, sender),
      ),
    );
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
