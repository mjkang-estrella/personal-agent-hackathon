import { requireUser, SignInRequired } from "@/lib/auth/server";
import { sameOrigin, sessionId, publicError } from "@/lib/session";
import { getWorkspace } from "@/lib/db";
import { beginConnect } from "@/lib/gmail/oauth";
export async function POST() {
  try {
    await requireUser();
    await sameOrigin();
    const id = await sessionId();
    const w = await getWorkspace(id);
    if (w.demo)
      throw new Error(
        "Please start a personal workspace before connecting Gmail.",
      );
    return Response.json({ url: await beginConnect(id) });
  } catch (e) {
    return Response.json(
      { error: publicError(e) },
      { status: e instanceof SignInRequired ? 401 : 400 },
    );
  }
}
