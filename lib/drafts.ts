import type { Draft, Workspace } from "./types";

// Client-safe. The approval string is this payload, so recipients, wording and
// attachment contents are all bound to the user's decision.
export function draftPayload(w: Workspace, d: Draft) {
  return {
    id: d.id,
    to: d.to.map((c) => c.address.toLowerCase()),
    subject: d.subject,
    body: d.body,
    inReplyTo: d.inReplyTo,
    attachments: d.attachmentIds.map((id) => {
      const doc = w.documents.find((x) => x.id === id);
      return { id, text: doc ? doc.pages.join("\n") : null };
    }),
  };
}

export function openDraft(w: Workspace, taskId: string) {
  return w.drafts?.find((d) => d.taskId === taskId && d.status === "draft");
}
