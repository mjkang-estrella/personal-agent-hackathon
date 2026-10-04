import { sessionId, setWorkspaceCookie } from "@/lib/session";
import { ensurePersonalWorkspace } from "@/lib/auth/workspaces";
import { requireUser } from "@/lib/auth/server";
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    await sessionId();
    const personal = await ensurePersonalWorkspace(user.id);
    if (personal) await setWorkspaceCookie(personal);
    return Response.redirect(new URL("/workspace", request.url), 303);
  } catch {
    return Response.redirect(
      new URL("/sign-in?error=restore", request.url),
      303,
    );
  }
}
