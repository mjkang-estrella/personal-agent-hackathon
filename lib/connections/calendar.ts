import { randomUUID } from "node:crypto";
import { pool, getWorkspace, activity, mutate } from "../db";
import {
  reminderInput,
  previewSchema,
  signature,
  validatePreview,
  taskContext,
  nextDate,
  eventPayload,
  type ReminderPreview,
} from "../calendar-state";
import { connection, access } from "./store";
import type { CalendarService } from "./config";
import { z } from "zod";
export async function receipts(id: string, service: CalendarService) {
  const r = await pool.query(
    "SELECT task_id,payload,status,external_id,created_at FROM jobswitch_calendar_events WHERE workspace_id=$1 AND service=$2 ORDER BY created_at DESC",
    [id, service],
  );
  return r.rows.map((r) => ({
    taskId: r.task_id,
    title: r.payload.title,
    date: r.payload.date,
    email: r.payload.email,
    status: r.status === "pending" ? "unknown" : r.status,
  }));
}
export async function preview(
  id: string,
  service: CalendarService,
  value: unknown,
) {
  const input = reminderInput.parse(value),
    w = await getWorkspace(id),
    c = await connection(id, service);
  if (w.demo)
    throw new Error(
      "Please start a personal workspace before using your calendar.",
    );
  const t = w.tasks.find((t) => t.id === input.taskId);
  if (!t || !c || c.status !== "connected")
    throw new Error("Choose a task and connect your calendar first.");
  nextDate(input.date);
  const p: ReminderPreview = {
    ...input,
    service,
    account: c.account_id,
    email: c.email,
    generation: c.generation,
    context: taskContext(t),
    expires: Date.now() + 10 * 60_000,
  };
  return { preview: p, signature: signature(id, p) };
}
export const approvalSchema = z
  .object({
    preview: previewSchema,
    signature: z.string().length(64),
    approved: z.literal(true),
  })
  .strict();
export async function createReminder(
  id: string,
  service: CalendarService,
  value: unknown,
) {
  const { preview: p, signature: sig } = approvalSchema.parse(value);
  if (p.service !== service)
    throw new Error("Choose the calendar shown in your preview.");
  const w = await getWorkspace(id),
    c = await connection(id, service),
    t = w.tasks.find((t) => t.id === p.taskId);
  if (w.demo || !t || !c || c.status !== "connected")
    throw new Error("Choose a task and connect your calendar first.");
  validatePreview(id, p, sig, t, c);
  const previous = (
    await pool.query(
      "SELECT * FROM jobswitch_calendar_events WHERE workspace_id=$1 AND service=$2 AND task_id=$3",
      [id, service, p.taskId],
    )
  ).rows[0];
  if (
    previous &&
    ["title", "date", "timeZone", "account"].some(
      (key) => previous.payload[key] !== p[key as keyof ReminderPreview],
    )
  )
    throw new Error(
      "This task already has a calendar request. Check its existing entry before making changes manually.",
    );
  if (previous)
    return {
      status: previous.status === "pending" ? "unknown" : previous.status,
      existing: true,
    };
  const { token } = await access(id, service),
    requestId = randomUUID();
  const saved = await pool.query(
    "INSERT INTO jobswitch_calendar_events(workspace_id,service,task_id,request_id,account_id,payload,status) VALUES($1,$2,$3,$4,$5,$6,'pending') ON CONFLICT DO NOTHING RETURNING request_id",
    [id, service, p.taskId, requestId, c.account_id, JSON.stringify(p)],
  );
  if (!saved.rowCount) return { status: "unknown", existing: true };
  // Reserve before the external write. An ambiguous response is NEVER resubmitted.
  // A stable Google ID / Graph transactionId also guards provider-side retries.
  let status = "unknown",
    externalId: string | null = null;
  try {
    const r = await fetch(
      service === "google-calendar"
        ? "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        : "https://graph.microsoft.com/v1.0/me/calendar/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload(service, p, requestId)),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (r.ok) {
      const data = await r.json();
      if (typeof data.id === "string" && data.id) {
        status = "created";
        externalId = data.id;
      }
    } else if (
      r.status >= 400 &&
      r.status < 500 &&
      ![408, 409, 429].includes(r.status)
    )
      status = "failed";
  } catch {
    /* Network ambiguity remains unknown; the reservation survives. */
  }
  await pool.query(
    "UPDATE jobswitch_calendar_events SET status=$4,external_id=$5 WHERE workspace_id=$1 AND service=$2 AND task_id=$3",
    [id, service, p.taskId, status, externalId],
  );
  await mutate(id, (s) =>
    activity(
      s,
      status === "created"
        ? "Calendar reminder added"
        : status === "failed"
          ? "Calendar rejected the reminder"
          : "Check your calendar",
      status === "created"
        ? `${p.title} · ${p.date}. No attendees or alerts were added.`
        : "JobSwitch will not repeat this request. Check your calendar before creating a reminder manually.",
      "user",
    ),
  );
  return { status, existing: false };
}
