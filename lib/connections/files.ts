import { z } from "zod";
import { fileServiceSchema, type FileService } from "./config";
import { access, connection, type Connection } from "./store";
import {
  ticket,
  readTicket,
  graphFilesUrl,
  downloadUrl,
  limitedBytes,
} from "./file-security";
import {
  categorySchema,
  extractDocument,
  appendDocument,
} from "../document-import";
import { getWorkspace, mutate } from "../db";
const fileId = z
  .string()
  .min(1)
  .max(300)
  .regex(/^[a-zA-Z0-9_!-]+$/);
const bindingSchema = z.object({
  workspace: z.string(),
  service: fileServiceSchema,
  generation: z.string(),
  account: z.string(),
  expires: z.number(),
});
const pickSchema = bindingSchema
  .extend({
    type: z.literal("file"),
    id: fileId,
    name: z.string().max(500),
    version: z.string().min(1).max(500),
    mime: z.string(),
    size: z.number().nonnegative(),
  })
  .strict();
const cursorSchema = bindingSchema
  .extend({
    type: z.literal("cursor"),
    cursor: z.string().max(10000),
    folder: fileId.optional(),
  })
  .strict();
export type CloudFile = {
  id: string;
  name: string;
  folder: boolean;
  size: number;
  supported: boolean;
  selection?: string;
};
const googleFields =
  "id,name,mimeType,size,version,trashed,capabilities(canDownload)";
const graphFields = "id,name,size,eTag,file,folder,remoteItem,deleted";
function bound(id: string, service: FileService, c: Connection) {
  return {
    workspace: id,
    service,
    generation: c.generation,
    account: c.account_id,
    expires: Date.now() + 10 * 60_000,
  };
}
function check(
  b: z.infer<typeof bindingSchema>,
  id: string,
  service: FileService,
  c: Connection,
) {
  if (
    b.workspace !== id ||
    b.service !== service ||
    b.generation !== c.generation ||
    b.account !== c.account_id ||
    b.expires < Date.now() ||
    b.expires > Date.now() + 10 * 60_000
  )
    throw new Error("Please refresh your file list after reconnecting.");
}
async function provider(url: string, token: string) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new Error(
      "This file service is unavailable. Reconnect or try again.",
    );
  return r;
}
function normalize(service: FileService, raw: Record<string, any>) {
  const google = service === "google-drive";
  const id = fileId.parse(raw.id),
    name = z.string().min(1).max(500).parse(raw.name),
    folder = google
      ? raw.mimeType === "application/vnd.google-apps.folder"
      : !!raw.folder;
  const mime = google
    ? String(raw.mimeType || "")
    : String(raw.file?.mimeType || "");
  const version = String(google ? raw.version || "" : raw.eTag || "");
  const size = Number(raw.size || 0);
  const supported =
    !folder &&
    !raw.trashed &&
    !raw.deleted &&
    !raw.remoteItem &&
    raw.capabilities?.canDownload !== false &&
    Number.isFinite(size) &&
    size <= 4 * 1024 * 1024 &&
    !!version &&
    ((google && mime === "application/vnd.google-apps.document") ||
      (/\.(pdf|txt|md)$/i.test(name) &&
        !mime.startsWith("application/vnd.google-apps.")));
  return { id, name, folder, size, mime, version, supported };
}
export async function listFiles(
  id: string,
  service: FileService,
  input: unknown,
) {
  const query = z
    .object({
      folder: fileId.optional(),
      cursor: z.string().max(16000).optional(),
    })
    .strict()
    .parse(input || {});
  const { token, connection: c } = await access(id, service);
  let folder = query.folder,
    cursor = "";
  if (query.cursor) {
    const b = cursorSchema.parse(readTicket(query.cursor));
    check(b, id, service, c);
    folder = b.folder;
    cursor = b.cursor;
  }
  let url: string;
  if (service === "google-drive") {
    const u = new URL("https://www.googleapis.com/drive/v3/files");
    u.search = new URLSearchParams({
      q: `trashed = false and '${folder || "root"}' in parents`,
      fields: `nextPageToken,files(${googleFields})`,
      pageSize: "50",
      orderBy: "folder,name",
      ...(cursor ? { pageToken: cursor } : {}),
    }).toString();
    url = u.href;
  } else
    url = cursor
      ? graphFilesUrl(cursor)
      : `https://graph.microsoft.com/v1.0/me/drive/${folder ? "items/" + encodeURIComponent(folder) : "root"}/children?$select=${graphFields}&$top=50`;
  const data = await (await provider(url, token)).json();
  const raw = z
    .array(z.record(z.string(), z.any()))
    .max(200)
    .parse(service === "google-drive" ? data.files : data.value);
  const files: CloudFile[] = raw
    .filter((r) => !r.remoteItem && !r.deleted && !r.trashed)
    .map((r) => {
      const f = normalize(service, r);
      return {
        id: f.id,
        name: f.name,
        folder: f.folder,
        size: f.size,
        supported: f.supported,
        ...(f.supported
          ? {
              selection: ticket({
                ...bound(id, service, c),
                type: "file",
                id: f.id,
                name: f.name,
                version: f.version,
                mime: f.mime,
                size: f.size,
              }),
            }
          : {}),
      };
    });
  const next =
    service === "google-drive" ? data.nextPageToken : data["@odata.nextLink"];
  if (next && service === "microsoft-drive") graphFilesUrl(next);
  return {
    files,
    folder,
    cursor: next
      ? ticket({
          ...bound(id, service, c),
          type: "cursor",
          cursor: String(next),
          folder,
        })
      : undefined,
  };
}
async function metadata(service: FileService, id: string, token: string) {
  const google = service === "google-drive";
  const url = google
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=${googleFields}`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(id)}?$select=${graphFields}`;
  return normalize(service, await (await provider(url, token)).json());
}
async function content(
  service: FileService,
  file: z.infer<typeof pickSchema>,
  token: string,
) {
  if (service === "google-drive") {
    const suffix =
      file.mime === "application/vnd.google-apps.document"
        ? "/export?mimeType=application%2Fpdf"
        : "?alt=media";
    return limitedBytes(
      await provider(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}${suffix}`,
        token,
      ),
    );
  }
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(file.id)}/content`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    },
  );
  if (response.ok) return limitedBytes(response);
  if (response.status !== 302 || !response.headers.get("location"))
    throw new Error("This file could not be downloaded.");
  // The verified provider supplies this short-lived URL. Never forward OAuth credentials.
  let url = downloadUrl(response.headers.get("location")!);
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    if (r.ok) return limitedBytes(r);
    if (
      ![301, 302, 303, 307, 308].includes(r.status) ||
      !r.headers.get("location")
    )
      break;
    url = downloadUrl(new URL(r.headers.get("location")!, url).href);
  }
  throw new Error("This file could not be downloaded.");
}
// Caller holds the workspace lock through token refresh, download and import.
export async function importFile(
  id: string,
  service: FileService,
  value: unknown,
) {
  const input = categorySchema
    .extend({ selection: z.string().max(16000), confirmed: z.literal(true) })
    .strict()
    .parse(value);
  const selected = pickSchema.parse(readTicket(input.selection)),
    c = await connection(id, service);
  if (!c || c.status !== "connected")
    throw new Error("Please connect your file service first.");
  check(selected, id, service, c);
  const w = await getWorkspace(id);
  if (w.demo)
    throw new Error(
      "Please start a personal workspace before importing documents.",
    );
  if (
    w.documents.some(
      (d) =>
        d.cloudSource?.service === service &&
        d.cloudSource.account === c.account_id &&
        d.cloudSource.fileId === selected.id &&
        d.cloudSource.version === selected.version,
    )
  )
    return w;
  if (w.documents.length >= 20)
    throw new Error("Upload limit reached: 20 documents per workspace.");
  const { token } = await access(id, service);
  const verify = (f: Awaited<ReturnType<typeof metadata>>) => {
    if (
      !f.supported ||
      f.version !== selected.version ||
      f.name !== selected.name ||
      f.mime !== selected.mime ||
      f.size !== selected.size
    )
      throw new Error(
        "This file changed. Refresh the list and select it again.",
      );
  };
  verify(await metadata(service, selected.id, token));
  const bytes = await content(service, selected, token);
  verify(await metadata(service, selected.id, token));
  const name =
    selected.mime === "application/vnd.google-apps.document"
      ? selected.name + ".pdf"
      : selected.name;
  const pages = await extractDocument(name, bytes);
  return mutate(id, (s) =>
    appendDocument(s, {
      name,
      pages,
      employer: input.employer,
      kind: input.kind,
      cloudSource: {
        service,
        account: c.account_id,
        fileId: selected.id,
        version: selected.version,
      },
    }),
  );
}
