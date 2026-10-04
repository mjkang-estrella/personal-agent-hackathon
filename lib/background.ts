import { randomUUID } from "node:crypto";
import { start } from "workflow/api";
import { monitorWorkspace } from "../workflows/monitor";
import { mutate, activity } from "./db";
import { isCurrentRun } from "./background-state";

export async function setBackground(id: string, enabled: boolean) {
  const generation = randomUUID();
  let w = await mutate(id, (s) => {
    s.background = {
      enabled,
      generation,
      status: enabled ? "starting" : "paused",
      startedAt: new Date().toISOString(),
    };
    activity(
      s,
      enabled ? "Background checks enabled" : "Background checks paused",
      enabled
        ? "Checks replies every five minutes, even when this page is closed. Submissions and emails still require approval."
        : "No new background checks will start.",
      "user",
    );
  });
  if (!enabled) return w;
  try {
    const run = await start(monitorWorkspace, [id, generation]);
    w = await mutate(id, (s) => {
      if (isCurrentRun(s, generation)) s.background!.runId = run.runId;
    });
    return w;
  } catch {
    return mutate(id, (s) => {
      if (!isCurrentRun(s, generation)) return;
      s.background!.enabled = false;
      s.background!.status = "attention";
      s.background!.error =
        "Background checks could not start. Try enabling them again.";
    });
  }
}
