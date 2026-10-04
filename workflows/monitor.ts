import { sleep } from "workflow";

export async function monitorWorkspace(id: string, generation: string) {
  "use workflow";
  // Bounded monitoring window; the UI offers renewal rather than an invisible infinite bill.
  for (let cycle = 0; cycle < 2016; cycle++) {
    const result = await checkWorkspace(id, generation);
    if (!result.active) return;
    await sleep(result.delay);
  }
  await finishMonitoring(id, generation);
}

export async function checkWorkspace(id: string, generation: string) {
  "use step";
  const { mutate, pool, activity, withWorkspaceLock, WorkspaceBusyError } =
    await import("../lib/db");
  const { isCurrentRun, staleSubmission, recoverSubmission, POLL_MS } =
    await import("../lib/background-state");
  try {
    return await withWorkspaceLock(id, async () => {
      const existing = await pool.query(
        "SELECT data FROM jobswitch_workspaces WHERE id=$1",
        [id],
      );
      const w = existing.rows[0]?.data;
      if (!w) return { active: false, delay: POLL_MS };
      if (!isCurrentRun(w, generation))
        return { active: false, delay: POLL_MS };
      if (
        Date.now() - Date.parse(w.background!.startedAt) >=
        7 * 24 * 60 * 60_000
      ) {
        await mutate(id, (s) => {
          if (!isCurrentRun(s, generation)) return;
          s.background!.enabled = false;
          s.background!.status = "paused";
          activity(
            s,
            "Background monitoring window ended",
            "Enable checks again to continue.",
            "system",
          );
        });
        return { active: false, delay: POLL_MS };
      }
      try {
        for (const t of w.tasks.filter((t: import("../lib/types").Task) =>
          staleSubmission(t),
        )) {
          const r = await pool.query(
            "SELECT status FROM jobswitch_claims WHERE workspace_id=$1 AND task_id=$2",
            [id, t.id],
          );
          await mutate(id, (s) => {
            if (!isCurrentRun(s, generation)) return;
            const current = s.tasks.find((x) => x.id === t.id);
            if (!current || !staleSubmission(current)) return;
            recoverSubmission(current, r.rows[0]?.status === "submitted");
            activity(
              s,
              "Interrupted submission recovered",
              current.nextAction,
              "system",
            );
          });
        }
        if (w.inbox && w.hrInbox) {
          const { syncMail } = await import("../lib/services");
          await syncMail(id, generation);
        }
        if (w.tasks.some((t: import("../lib/types").Task) => t.gmail)) {
          const { syncGmail } = await import("../lib/gmail/sync");
          await syncGmail(id, generation);
        }
        const state = await mutate(id, (s) => {
          if (!isCurrentRun(s, generation)) return;
          s.background!.status = "running";
          s.background!.lastCheckedAt = new Date().toISOString();
          s.background!.failures = 0;
          s.background!.error = undefined;
        });
        return { active: isCurrentRun(state, generation), delay: POLL_MS };
      } catch {
        const state = await mutate(id, (s) => {
          if (!isCurrentRun(s, generation)) return;
          const bg = s.background!;
          bg.failures = (bg.failures || 0) + 1;
          bg.error = "A background check failed. Retrying automatically.";
          bg.status = "retrying";
          if (bg.failures >= 5) {
            bg.enabled = false;
            bg.status = "attention";
            bg.error =
              "Background checks paused after repeated failures. Check your connection and resume.";
            activity(s, "Background checks need attention", bg.error, "system");
          }
        });
        return {
          active: isCurrentRun(state, generation),
          delay: Math.min(
            POLL_MS * 2 ** (state.background?.failures || 0),
            60 * 60_000,
          ),
        };
      }
    });
  } catch (error) {
    // A foreground step owns the workspace. Defer without recording a provider failure.
    if (error instanceof WorkspaceBusyError)
      return { active: true, delay: 15000 };
    throw error;
  }
}

export async function finishMonitoring(id: string, generation: string) {
  "use step";
  const { mutate, activity } = await import("../lib/db");
  const { isCurrentRun } = await import("../lib/background-state");
  await mutate(id, (s) => {
    if (!isCurrentRun(s, generation)) return;
    s.background!.enabled = false;
    s.background!.status = "paused";
    activity(
      s,
      "Background monitoring window ended",
      "The seven-day monitoring window ended. Enable checks again to continue.",
      "system",
    );
  });
}
