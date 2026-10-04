import { sessionId } from "@/lib/session";
import { getWorkspace } from "@/lib/db";
export async function GET() {
  const w = await getWorkspace(await sessionId());
  const text =
    `# JobSwitch transition plan\n\n${w.profile.name}: ${w.profile.previousEmployer} → ${w.profile.nextEmployer}\nLast day: ${w.profile.lastDay}. Start: ${w.profile.startDay}.\n\n` +
    w.tasks
      .map(
        (t) =>
          `## ${t.title}\nStatus: ${t.status}\nDeadline: ${t.deadline || "Needs confirmation"}\n${t.description}\nNext: ${t.nextAction}\n${t.evidence.map((e) => `Source: ${w.documents.find((d) => d.id === e.documentId)?.name}, p. ${e.page}\n> ${e.quote}`).join("\n")}\n`,
      )
      .join("\n");
  return new Response(text, {
    headers: {
      "content-type": "text/markdown",
      "content-disposition": 'attachment; filename="jobswitch-plan.md"',
    },
  });
}
