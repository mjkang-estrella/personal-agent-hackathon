import { randomUUID } from "node:crypto";
import { z } from "zod";
import { activity } from "./db";
import { queueAgent } from "./automation";
import type { Document, Workspace } from "./types";
export const categorySchema = z.object({
  employer: z.enum(["previous", "next", "personal"]),
  kind: z.enum(["policy", "receipt", "certificate", "other"]),
});
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export async function extractDocument(
  name: string,
  bytes: Uint8Array,
): Promise<string[]> {
  if (bytes.byteLength > MAX_FILE_BYTES)
    throw new Error("Upload a file smaller than 4 MB.");
  let pages: string[];
  if (/\.pdf$/i.test(name)) {
    const { CanvasFactory, getData } = await import("pdf-parse/worker");
    const { PDFParse } = await import("pdf-parse");
    PDFParse.setWorker(getData());
    const parser = new PDFParse({ CanvasFactory, data: bytes });
    try {
      const result = await parser.getText();
      if (result.total > 40)
        throw new Error("Upload a document with 40 pages or fewer.");
      pages = result.pages.map((p) => p.text);
    } finally {
      await parser.destroy();
    }
  } else if (/\.(txt|md)$/i.test(name))
    pages = [new TextDecoder("utf-8", { fatal: true }).decode(bytes)];
  else throw new Error("Choose a PDF, TXT, or Markdown file.");
  if (pages.join("").trim().length < 20)
    throw new Error(
      "No readable text found. Upload a text-based PDF or TXT file.",
    );
  if (pages.join("").length > 120000)
    throw new Error(
      "Upload a shorter document (under 120,000 text characters).",
    );
  return pages;
}
export function appendDocument(
  s: Workspace,
  input: Pick<Document, "name" | "pages" | "employer" | "kind" | "cloudSource">,
) {
  if (s.tasks.some((t) => t.status === "submitting"))
    throw new Error("Please wait for the current submission to finish.");
  const source = input.cloudSource;
  if (
    source &&
    s.documents.some(
      (d) =>
        d.cloudSource?.service === source.service &&
        d.cloudSource.account === source.account &&
        d.cloudSource.fileId === source.fileId &&
        d.cloudSource.version === source.version,
    )
  )
    throw new Error("This file version is already imported.");
  if (s.documents.length >= 20)
    throw new Error("Upload limit reached: 20 documents per workspace.");
  if (
    s.documents.reduce((n, d) => n + d.pages.join("").length, 0) +
      input.pages.join("").length >
    250000
  )
    throw new Error("Upload limit reached for this workspace.");
  s.documents.push({
    ...input,
    id: randomUUID(),
    addedAt: new Date().toISOString(),
  });
  for (const t of s.tasks)
    if (t.status === "ready") {
      t.status = "todo";
      delete t.claim;
      t.nextAction = "New document added. Review the claim again.";
    }
  s.demo = false;
  queueAgent(s);
  activity(
    s,
    "Document added",
    `${input.name} · ${input.pages.length} page${input.pages.length === 1 ? "" : "s"}. Your agent will update the board automatically.`,
    "user",
  );
}
