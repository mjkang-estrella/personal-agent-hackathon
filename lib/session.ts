import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sessionSigningSecret } from "./secrets";
const sign = (id: string) =>
  createHmac("sha256", sessionSigningSecret()).update(id).digest("hex");
export async function sessionId() {
  const c = await cookies();
  const raw = c.get("jobswitch_session")?.value;
  let id: string;
  if (raw) {
    const [value, sig] = raw.split(".");
    const expected = sign(value);
    if (
      /^[0-9a-f-]{36}$/.test(value) &&
      sig?.length === expected.length &&
      timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      return value;
  }
  id = crypto.randomUUID();
  c.set("jobswitch_session", `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: (await headers()).get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
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
  const c = await cookies();
  const id = crypto.randomUUID();
  c.set("jobswitch_session", `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: (await headers()).get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}
