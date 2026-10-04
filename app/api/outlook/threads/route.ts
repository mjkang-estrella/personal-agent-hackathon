import { requireUser, SignInRequired } from "@/lib/auth/server";
import { withWorkspaceLock } from "@/lib/db";
import { z } from "zod";
import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { senderAddress } from "@/lib/outlook/security";
import { listThreads } from "@/lib/outlook/sync";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await requireUser();
    await sameOrigin();
    const data = z
      .object({ sender: z.string().max(254) })
      .parse(await request.json());
    const sender = senderAddress(data.sender);
    if (!sender) throw new Error("Enter a valid HR email address.");
    const id = await sessionId();
    return Response.json(
      { threads: await withWorkspaceLock(id, () => listThreads(id, sender)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { error: publicError(e) },
      { status: e instanceof SignInRequired ? 401 : 400 },
    );
  }
}
