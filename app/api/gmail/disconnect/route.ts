import { sameOrigin, sessionId, publicError } from "@/lib/session";
import { disconnect } from "@/lib/gmail/oauth";
export async function POST() {
  try {
    await sameOrigin();
    return Response.json(await disconnect(await sessionId()));
  } catch (e) {
    return Response.json({ error: publicError(e) }, { status: 400 });
  }
}
