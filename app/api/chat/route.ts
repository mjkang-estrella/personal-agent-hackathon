export const maxDuration = 300;
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { toAISdkStream } from "@mastra/ai-sdk";
import { chatAgent } from "@/lib/agent";
import { sessionId, sameOrigin } from "@/lib/session";
import { getWorkspace } from "@/lib/db";
export async function POST(req: Request) {
  try {
    await sameOrigin();
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length > 60)
      return Response.json(
        { error: "Start a new conversation to continue." },
        { status: 400 },
      );
    const id = await sessionId();
    const w = await getWorkspace(id);
    const input = messages
      .slice(-20)
      .map(
        (m: { role: string; parts?: { type: string; text?: string }[] }) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: (m.parts || [])
            .filter((p) => p.type === "text")
            .map((p) => p.text || "")
            .join("\n")
            .slice(0, 8000),
        }),
      );
    const result = await chatAgent(w, id).stream(
      input.map((m) => `${m.role}: ${m.content}`).join("\n\n"),
      { maxSteps: 4 },
    );
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.merge(
          toAISdkStream(result, {
            from: "agent",
            version: "v7",
            sendReasoning: false,
          }),
        );
      },
      onError: () => "The assistant could not respond. Please try again.",
    });
    return createUIMessageStreamResponse({ stream });
  } catch {
    return Response.json(
      { error: "The assistant could not connect. Please try again." },
      { status: 503 },
    );
  }
}
