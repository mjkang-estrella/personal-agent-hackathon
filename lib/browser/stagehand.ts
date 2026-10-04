import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateText,
  jsonSchema,
  Output,
  type ImagePart,
  type ModelMessage,
  type TextPart,
} from "ai";
import {
  localBrowser,
  Stagehand,
  type ClientLLM,
} from "@browserbasehq/stagehand";
import type Kernel from "@onkernel/sdk";

type GenerateParams = Parameters<ClientLLM["generate"]>[0];
type Part = { type: string; text?: string; data?: string; mimeType?: string };

// Stagehand v4 has no base-URL option, so route its model calls through the
// same Neon AI Gateway model as the rest of JobSwitch.
async function generate(params: GenerateParams) {
  const { model } = await import("../agent");
  const messages: ModelMessage[] = params.messages.map((m) => {
    const parts = (
      Array.isArray(m.content) ? m.content : [m.content]
    ) as Part[];
    const text = parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    if (m.role === "assistant") return { role: "assistant", content: text };
    return {
      role: "user",
      content: parts.flatMap((p): (TextPart | ImagePart)[] =>
        p.type === "text"
          ? [{ type: "text", text: p.text! }]
          : p.type === "image"
            ? [{ type: "image", image: p.data!, mediaType: p.mimeType }]
            : [],
      ),
    };
  });
  const format =
    "responseFormat" in params && params.responseFormat?.type === "json_schema"
      ? params.responseFormat
      : undefined;
  const result = await generateText({
    model,
    system: params.systemPrompt,
    messages,
    temperature: params.temperature,
    providerOptions: { openai: { reasoningEffort: "low" } },
    ...(format && {
      output: Output.object({
        schema: jsonSchema(format.schema as never),
        name: format.name,
        description: format.description,
      }),
    }),
  });
  const usage = {
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
    totalTokens: result.usage.totalTokens ?? 0,
  };
  return format
    ? {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: JSON.stringify(result.output) },
        ],
        outputFormat: "json_schema" as const,
        structuredContent: result.output as never,
        usage,
      }
    : {
        role: "assistant" as const,
        content: [{ type: "text" as const, text: result.text }],
        usage,
      };
}

const distDir = () =>
  dirname(fileURLToPath(import.meta.resolve("@browserbasehq/stagehand")));

// Stagehand v4 executes through a Chrome extension; mirror it onto the Kernel VM.
export async function attachStagehand(
  kernel: Kernel,
  session: { session_id: string; cdp_ws_url: string },
  allowedDomains: string[],
) {
  await kernel.browsers.fs.uploadZip(session.session_id, {
    dest_path: join(distDir(), "extension"),
    zip_file: createReadStream(
      join(distDir(), "assets/stagehand-extension.zip"),
    ),
  });
  const browser = await localBrowser.connect({ cdpUrl: session.cdp_ws_url });
  const stagehand = await Stagehand.create({
    browser,
    model: { generate } as unknown as ClientLLM,
    selfHeal: false, // Never let a failed approved action be re-inferred by the model.
    logging: { level: "off" },
  });
  // Confine every page, including popups and redirects, to the portal's domains.
  await browser.context.setDomainPolicy({ allowedDomains });
  return { stagehand, browser };
}
