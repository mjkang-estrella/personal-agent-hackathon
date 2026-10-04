import { requireUser, SignInRequired } from "@/lib/auth/server";
import { z } from "zod";
import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { senderAddress } from "@/lib/gmail/security";
import { listThreads } from "@/lib/gmail/sync";
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
    return Response.json(
      { threads: await listThreads(await sessionId(), sender) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { error: publicError(e) },
      { status: e instanceof SignInRequired ? 401 : 400 },
    );
  }
}
