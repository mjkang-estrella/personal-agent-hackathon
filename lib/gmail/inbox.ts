import type { Workspace, InboxSnapshot, InboxMessage } from "../types";
// Read saved evidence only. Viewing the inbox never fetches or classifies Gmail.
export function readImportedGmail(
  w: Workspace,
  messageId?: string,
): InboxSnapshot {
  const messages: InboxMessage[] = w.documents
    .flatMap((d) => {
      const source = d.emailSource;
      if (!source) return [];
      const task = w.tasks.find((t) => t.id === source.taskId);
      return [
        {
          ...source,
          preview: d.pages.join("\n").slice(0, 160),
          taskTitle: task?.title || "Archived transition task",
          body: d.pages.join("\n"),
        },
      ];
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return {
    provider: "gmail",
    connected: messages.length > 0 || w.tasks.some((t) => t.gmail),
    limited: false,
    messages: messageId ? [] : messages.map(({ body: _, ...m }) => m),
    message: messageId ? messages.find((m) => m.id === messageId) : undefined,
  };
}
