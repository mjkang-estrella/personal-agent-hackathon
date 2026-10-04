import { randomUUID } from "node:crypto";
import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { mutate, getWorkspace, activity, withWorkspaceLock } from "@/lib/db";
import { queueAgent } from "@/lib/automation";
export async function POST(request: Request) {
  try {
    await sameOrigin();
    const id = await sessionId();
    const w = await getWorkspace(id);
    if (w.documents.length >= 20)
      throw new Error("Upload limit reached: 20 documents per workspace.");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Choose a PDF or text file.");
    if (file.size > 4 * 1024 * 1024)
      throw new Error("Upload a file smaller than 4 MB.");
    let pages: string[];
    if (file.name.toLowerCase().endsWith(".pdf")) {
      const { CanvasFactory, getData } = await import("pdf-parse/worker");
      const { PDFParse } = await import("pdf-parse");
      PDFParse.setWorker(getData());
      const parser = new PDFParse({
        CanvasFactory,
        data: new Uint8Array(await file.arrayBuffer()),
      });
      try {
        const result = await parser.getText();
        if (result.total > 40)
          throw new Error("Upload a document with 40 pages or fewer.");
        pages = result.pages.map((p) => p.text);
      } finally {
        await parser.destroy();
      }
    } else if (/\.(txt|md)$/i.test(file.name)) pages = [await file.text()];
    else throw new Error("Choose a PDF, TXT, or Markdown file.");
    if (pages.join("").trim().length < 20)
      throw new Error(
        "No readable text found. Upload a text-based PDF or TXT file.",
      );
    if (pages.join("").length > 120000)
      throw new Error(
        "Upload a shorter document (under 120,000 text characters).",
      );
    const employer = String(form.get("employer") || "personal");
    const kind = String(form.get("kind") || "other");
    if (
      !["previous", "next", "personal"].includes(employer) ||
      !["policy", "receipt", "certificate", "other"].includes(kind)
    )
      throw new Error("Choose a valid document category.");
    return Response.json(
      await withWorkspaceLock(id, () =>
        mutate(id, (s) => {
          if (s.tasks.some((t) => t.status === "submitting"))
            throw new Error(
              "Please wait for the current submission to finish.",
            );
          if (s.documents.length >= 20)
            throw new Error(
              "Upload limit reached: 20 documents per workspace.",
            );
          if (
            s.documents.reduce((n, d) => n + d.pages.join("").length, 0) +
              pages.join("").length >
            250000
          )
            throw new Error("Upload limit reached for this workspace.");
          s.documents.push({
            id: randomUUID(),
            name: file.name,
            employer: employer as "personal",
            kind: kind as "other",
            pages,
            addedAt: new Date().toISOString(),
          });
          for (const t of s.tasks) {
            if (t.status === "ready") {
              t.status = "todo";
              delete t.claim;
              t.nextAction = "New document added. Review the claim again.";
            }
          }
          s.demo = false;
          queueAgent(s);
          activity(
            s,
            "Document added",
            `${file.name} · ${pages.length} page${pages.length === 1 ? "" : "s"}. Your agent will update the board automatically.`,
            "user",
          );
        }),
      ),
    );
  } catch (e) {
    return Response.json({ error: publicError(e) }, { status: 400 });
  }
}
