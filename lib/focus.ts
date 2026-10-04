import { z } from "zod";
import type { InboxMessage, Workspace } from "./types";

export const focusInput = z.object({
  view: z.enum(["plan", "task", "document", "message", "inbox", "activity"]),
  taskId: z.string().max(80).optional(),
  documentId: z.string().max(200).optional(),
  page: z.number().int().positive().optional(),
  messageId: z.string().max(1000).optional(),
});
export type FocusInput = z.infer<typeof focusInput>;
export interface WorkspaceFocus {
  view: FocusInput["view"];
  id?: string;
  page?: number;
  label: string;
}

// Model-supplied ids are untrusted: only targets in this workspace resolve.
export function resolveFocus(
  w: Workspace,
  input: FocusInput,
  messages: InboxMessage[] = [],
): { focus: WorkspaceFocus } | { error: string } {
  switch (input.view) {
    case "task": {
      const task = w.tasks.find((t) => t.id === input.taskId);
      if (!task) return { error: "That task is not in this workspace." };
      return { focus: { view: "task", id: task.id, label: task.title } };
    }
    case "document": {
      const doc = w.documents.find((d) => d.id === input.documentId);
      if (!doc) return { error: "That document is not in this workspace." };
      const page = Math.min(input.page || 1, doc.pages.length);
      return {
        focus: { view: "document", id: doc.id, page, label: doc.name },
      };
    }
    case "message": {
      const message = messages.find((m) => m.id === input.messageId);
      if (!message) return { error: "That email is not in this workspace." };
      return {
        focus: { view: "message", id: message.id, label: message.subject },
      };
    }
    case "plan":
      return { focus: { view: "plan", label: "Your plan" } };
    case "inbox":
      return { focus: { view: "inbox", label: "Inbox" } };
    case "activity":
      return { focus: { view: "activity", label: "Agent activity" } };
  }
}
