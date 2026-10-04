import { createHmac, timingSafeEqual } from "node:crypto";
import { sessionSigningSecret } from "../secrets";
import { MAX_FILE_BYTES } from "../document-import";
export function ticket(value: unknown) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", sessionSigningSecret())
      .update("cloud-file:" + payload)
      .digest("hex")
  );
}
export function readTicket(raw: string): unknown {
  if (raw.length > 16000) throw new Error("Please refresh your file list.");
  const [payload, sig, ...extra] = raw.split(".");
  const expected = createHmac("sha256", sessionSigningSecret())
    .update("cloud-file:" + payload)
    .digest("hex");
  if (
    extra.length ||
    !sig ||
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    throw new Error("Please refresh your file list.");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}
export function graphFilesUrl(raw: string) {
  const u = new URL(raw);
  if (
    u.origin !== "https://graph.microsoft.com" ||
    u.username ||
    u.password ||
    u.hash ||
    !/^\/v1\.0\/me\/drive\/(root\/children|items\/[^/]+\/children)$/.test(
      u.pathname,
    )
  )
    throw new Error("This file listing is unavailable.");
  return u.href;
}
export function downloadUrl(raw: string) {
  const u = new URL(raw);
  const host = u.hostname.toLowerCase();
  if (
    u.protocol !== "https:" ||
    u.port ||
    u.username ||
    u.password ||
    ![
      ".sharepoint.com",
      ".sharepoint-df.com",
      ".1drv.com",
      ".files.1drv.com",
      ".storage.live.com",
    ].some((s) => host.endsWith(s))
  )
    throw new Error(
      "This download location is unsupported. Download the file yourself and upload it instead.",
    );
  return u.href;
}
export async function limitedBytes(response: Response) {
  if (!response.ok || !response.body)
    throw new Error("This file could not be downloaded.");
  if (Number(response.headers.get("content-length")) > MAX_FILE_BYTES)
    throw new Error("Upload a file smaller than 4 MB.");
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_FILE_BYTES)
        throw new Error("Upload a file smaller than 4 MB.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
