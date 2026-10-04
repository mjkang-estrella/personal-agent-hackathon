import { cookies, headers } from "next/headers";
import { sessionSigningSecret } from "./secrets";
import { currentUser, SignInRequired } from "./auth/server";
import { accountWorkspace, workspaceOwner } from "./auth/workspaces";
import { signedWorkspace, verifiedWorkspace } from "./auth/workspace-cookie";

export async function sessionId() {
  const c = await cookies();
  const candidate = verifiedWorkspace(
    c.get("jobswitch_session")?.value,
    sessionSigningSecret(),
  );
  const user = await currentUser();
  if (user) {
    const id = await accountWorkspace(user.id, candidate);
    if (id !== candidate) await setWorkspaceCookie(id);
    return id;
  }
  if (candidate) {
    // A previously valid guest cookie cannot access an adopted workspace.
    if (await workspaceOwner(candidate)) throw new SignInRequired();
    return candidate;
  }
  return await newSessionId();
}

export async function setWorkspaceCookie(id: string) {
  const c = await cookies();
  c.set("jobswitch_session", signedWorkspace(id, sessionSigningSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: (await headers()).get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (origin && new URL(origin).host !== host)
    throw new Error("Request origin does not match.");
}
export function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (
    /^(Please|This|Your|Choose|Upload|Enter|Prepare|Resolve|The new|No |Cannot|Already|Claim |Only |Document |Task |Workspace )/.test(
      message,
    ) &&
    message.length < 250
  )
    return message;
  return "The service could not complete this step. Your progress is saved. Please try again.";
}

export async function newSessionId() {
  const user = await currentUser();
  const id = user
    ? await accountWorkspace(user.id, undefined, true)
    : crypto.randomUUID();
  await setWorkspaceCookie(id);
  return id;
}
