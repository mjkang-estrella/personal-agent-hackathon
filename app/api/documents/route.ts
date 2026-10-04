import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { mutate, withWorkspaceLock } from "@/lib/db";
import {
  categorySchema,
  extractDocument,
  appendDocument,
  MAX_FILE_BYTES,
} from "@/lib/document-import";
export async function POST(request: Request) {
  try {
    await sameOrigin();
    const id = await sessionId();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Choose a PDF or text file.");
    if (file.size > MAX_FILE_BYTES)
      throw new Error("Upload a file smaller than 4 MB.");
    const category = categorySchema.parse({
      employer: form.get("employer") || "personal",
      kind: form.get("kind") || "other",
    });
    const pages = await extractDocument(
      file.name,
      new Uint8Array(await file.arrayBuffer()),
    );
    return Response.json(
      await withWorkspaceLock(id, () =>
        mutate(id, (s) =>
          appendDocument(s, { ...category, name: file.name, pages }),
        ),
      ),
    );
  } catch (e) {
    return Response.json({ error: publicError(e) }, { status: 400 });
  }
}
