import { createHmac, timingSafeEqual } from "node:crypto";

export function signedWorkspace(id: string, secret: string) {
  return `${id}.${createHmac("sha256", secret).update(id).digest("hex")}`;
}
export function verifiedWorkspace(raw: string | undefined, secret: string) {
  if (!raw) return undefined;
  const [id, signature, extra] = raw.split(".");
  if (
    extra !== undefined ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      id,
    ) ||
    !/^[0-9a-f]{64}$/.test(signature || "")
  )
    return undefined;
  const expected = signedWorkspace(id, secret).split(".")[1];
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ? id
    : undefined;
}
