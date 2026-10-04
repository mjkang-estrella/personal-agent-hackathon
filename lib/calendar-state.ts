import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";
import type { Task } from "./types";
import { sessionSigningSecret } from "./secrets";
import {
  calendarServiceSchema,
  type CalendarService,
} from "./connections/config";
export const reminderInput = z
  .object({
    taskId: z.string().min(1).max(200),
    title: z.string().trim().min(1).max(160),
    timeZone: z
      .string()
      .min(1)
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Choose a valid timezone."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();
export const previewSchema = reminderInput
  .extend({
    service: calendarServiceSchema,
    account: z.string(),
    email: z.string(),
    generation: z.string().uuid(),
    context: z.string(),
    expires: z.number().int(),
  })
  .strict();
export type ReminderPreview = z.infer<typeof previewSchema>;
export const taskContext = (t: Task) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        dateReview: t.dateReview || false,
      }),
    )
    .digest("hex");
export function nextDate(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(value.getTime()) ||
    value.toISOString().slice(0, 10) !== date
  )
    throw new Error("Enter a valid reminder date.");
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}
export function signature(id: string, p: ReminderPreview) {
  return createHmac("sha256", sessionSigningSecret())
    .update(JSON.stringify(["calendar-approval", id, previewSchema.parse(p)]))
    .digest("hex");
}
export function validatePreview(
  id: string,
  p: ReminderPreview,
  sig: string,
  task: Task,
  connection: { generation: string; account_id: string; email: string },
  now = Date.now(),
) {
  nextDate(p.date);
  const expected = signature(id, p);
  if (
    !/^[a-f0-9]{64}$/.test(sig) ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ||
    p.expires < now ||
    p.expires > now + 10 * 60_000 ||
    p.context !== taskContext(task) ||
    p.taskId !== task.id ||
    p.generation !== connection.generation ||
    p.account !== connection.account_id ||
    p.email !== connection.email
  )
    throw new Error(
      "Your reminder or connection changed. Preview it again before approving.",
    );
}
export function eventPayload(
  service: CalendarService,
  p: ReminderPreview,
  requestId: string,
) {
  const end = nextDate(p.date);
  if (service === "google-calendar")
    return {
      id: requestId.replaceAll("-", ""),
      summary: p.title,
      start: { date: p.date },
      end: { date: end },
      visibility: "private",
      transparency: "transparent",
      reminders: { useDefault: false },
      description:
        "JobSwitch task reminder. Check the task for current source evidence.",
    };
  return {
    transactionId: requestId,
    subject: p.title,
    start: { dateTime: p.date + "T00:00:00", timeZone: p.timeZone },
    end: { dateTime: end + "T00:00:00", timeZone: p.timeZone },
    isAllDay: true,
    sensitivity: "private",
    showAs: "free",
    isReminderOn: false,
    body: {
      contentType: "text",
      content:
        "JobSwitch task reminder. Check the task for current source evidence.",
    },
  };
}
