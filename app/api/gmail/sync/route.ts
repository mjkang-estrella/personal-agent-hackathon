import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { syncGmail } from "@/lib/gmail/sync";
export const maxDuration = 300;
export async function POST() {
  try {
    await sameOrigin();
    return Response.json(await syncGmail(await sessionId()));
  } catch (e) {
    return Response.json({ error: publicError(e) }, { status: 400 });
  }
}
