import { cookies } from "next/headers";
import { z } from "zod";
import { verifiedWorkspace } from "@/lib/auth/workspace-cookie";
import { sessionSigningSecret } from "@/lib/secrets";
import {
  authConfigured,
  authServer,
  currentUser,
  requireUser,
  SignInRequired,
} from "@/lib/auth/server";
import {
  accountWorkspace,
  ownedWorkspaces,
  workspaceOwner,
} from "@/lib/auth/workspaces";
import {
  publicError,
  sameOrigin,
  sessionId,
  setWorkspaceCookie,
} from "@/lib/session";

const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const user = await currentUser();
    if (!user)
      return Response.json(
        { configured: authConfigured(), user: null, workspaces: [] },
        { headers },
      );
    const activeWorkspace = await sessionId();
    return Response.json(
      {
        configured: true,
        user,
        activeWorkspace,
        workspaces: await ownedWorkspaces(user.id),
      },
      { headers },
    );
  } catch (error) {
    return Response.json(
      { error: publicError(error) },
      { status: 503, headers },
    );
  }
}

export async function POST(request: Request) {
  try {
    await sameOrigin();
    const data = z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("sign_out") }),
        z.object({
          action: z.literal("switch"),
          workspaceId: z.string().uuid(),
        }),
        z.object({ action: z.literal("demo") }),
      ])
      .parse(await request.json());
    if (data.action === "sign_out") {
      if (authConfigured()) {
        const result = await authServer().signOut();
        if (result.error)
          throw new Error(
            "Your sign-out could not be completed. Please try again.",
          );
      }
      (await cookies()).delete("jobswitch_session");
    } else if (data.action === "demo") {
      if (await currentUser())
        throw new Error("Please sign out before opening an anonymous demo.");
      // Escape an expired account cookie without resetting an existing guest demo.
      const c = await cookies();
      const id = verifiedWorkspace(
        c.get("jobswitch_session")?.value,
        sessionSigningSecret(),
      );
      if (id && (await workspaceOwner(id))) c.delete("jobswitch_session");
    } else {
      const user = await requireUser();
      if ((await workspaceOwner(data.workspaceId)) !== user.id)
        throw new SignInRequired();
      await setWorkspaceCookie(
        await accountWorkspace(user.id, data.workspaceId),
      );
    }
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return Response.json(
      { error: publicError(error) },
      { status: error instanceof SignInRequired ? 401 : 400, headers },
    );
  }
}
