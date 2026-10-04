"use client";
import { useState } from "react";
import type { Workspace } from "@/lib/types";
export default function BackgroundControls({
  w,
  onUpdate,
}: {
  w: Workspace;
  onUpdate: (w: Workspace) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle(enabled: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      onUpdate(data);
    } catch {
      setError("Could not update background checks. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const bg = w.background;
  const stalled =
    bg?.enabled &&
    Date.now() - Date.parse(bg.lastCheckedAt || bg.startedAt) > 90 * 60_000;
  return (
    <section className="settings-card" aria-label="Background agent">
      <h2>Keep an eye on my transition</h2>
      <p className="muted">
        Check for HR replies every five minutes for seven days, even when this
        page is closed. Submissions and outgoing emails still need your
        approval.
      </p>
      <p role="status">
        {bg?.enabled
          ? bg.status === "starting"
            ? "Starting background checks…"
            : bg.status === "retrying"
              ? "Retrying a failed check"
              : "Background checks are on"
          : "Background checks are paused"}
      </p>
      {bg?.lastCheckedAt && (
        <p className="muted">
          Last checked: {new Date(bg.lastCheckedAt).toLocaleString()}
        </p>
      )}
      {(error || bg?.error || stalled) && (
        <p role="alert">
          {error ||
            bg?.error ||
            "No recent check was recorded. Restart monitoring to recover."}
        </p>
      )}
      <button
        type="button"
        className="primary"
        disabled={busy}
        onClick={() => toggle(!bg?.enabled)}
      >
        {busy
          ? "Updating…"
          : bg?.enabled
            ? "Pause background checks"
            : "Enable background checks"}
      </button>
      {bg?.enabled && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => toggle(true)}
        >
          Restart checks
        </button>
      )}
    </section>
  );
}
