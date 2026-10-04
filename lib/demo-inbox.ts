import type { InboxMessage, InboxSnapshot, Workspace } from "./types";

const samples = [
  {
    id: "learning",
    subject: "Your learning reimbursement: ready to submit",
    from: "Northstar People Team <people@northstar.example>",
    at: "2026-10-02T16:00:00Z",
    documentId: "hr-confirmation",
    page: 1,
    taskId: "learning",
    intro:
      "Here is the confirmation for your Product Strategy Fundamentals course.",
    quote:
      "We confirm Product Strategy Fundamentals was pre-approved as job-related professional development and completed September 28, 2026. Your remaining 2026 learning allowance is $1,000. No repayment obligation applies to this course. Please submit your $850 receipt before your October 16 last day. We can open the claim with your receipt and request the completion certificate during review. This is permission to submit, not final reimbursement approval.",
  },
  {
    id: "welcome",
    subject: "Welcome to Orbit — getting ready for your first day",
    from: "Orbit People Team <people@orbit.example>",
    at: "2026-10-02T14:00:00Z",
    documentId: "orbit-policy",
    page: 2,
    taskId: "onboarding",
    intro:
      "Welcome! Here is the getting-started guidance from the benefits guide. Your individual invitation still needs to confirm the exact documents to provide.",
    quote:
      "Complete your onboarding profile and provide the documents requested in your individual onboarding invitation by your first working day. Do not email identity documents; use the designated secure HR portal.",
  },
  {
    id: "coverage",
    subject: "Before you leave: check your health coverage dates",
    from: "Northstar Benefits <benefits@northstar.example>",
    at: "2026-10-01T17:00:00Z",
    documentId: "northstar-policy",
    page: 1,
    taskId: "coverage",
    intro:
      "As you plan your transition, please review this section of the Northstar handbook. Your individual coverage arrangements still need confirmation.",
    quote:
      "Health and dental coverage ends at 11:59 p.m. on the employee’s last working day. HR will provide continuation options separately. Ask HR to confirm the exact end date for your dependents and any available continuation options. This document does not determine eligibility for external programs.",
  },
  {
    id: "retirement",
    subject: "Keep your retirement plan details before access ends",
    from: "Northstar People Team <people@northstar.example>",
    at: "2026-10-01T15:00:00Z",
    documentId: "northstar-policy",
    page: 3,
    taskId: "retirement",
    intro:
      "A reminder from the offboarding handbook to help you keep your plan information handy. This is not a recommendation to move your savings.",
    quote:
      "Download your retirement plan statement and save the plan administrator’s contact details before your last working day. Your personal vesting, balances, available options, and any distribution deadlines must be verified with the plan administrator. This handbook does not establish your individual eligibility.",
  },
];

// Derived on read so existing demos get the same mail as new demos. These
// messages never enter claim processing, practice triage, or an external inbox.
export function demoMessages(w: Workspace): InboxMessage[] {
  if (!w.demo || w.scenario) return [];
  return samples.flatMap((sample) => {
    const doc = w.documents.find((d) => d.id === sample.documentId);
    if (!doc?.pages[sample.page - 1]?.includes(sample.quote)) return [];
    const task =
      w.tasks.find((t) => t.id === sample.taskId) ||
      w.tasks.find((t) =>
        t.evidence.some(
          (e) =>
            e.documentId === sample.documentId &&
            e.page === sample.page &&
            sample.quote.includes(e.quote),
        ),
      );
    return [
      {
        id: `demo-email-${sample.id}`,
        from: sample.from,
        to: "Alex Morgan <alex@demo.example>",
        subject: sample.subject,
        at: sample.at,
        preview: sample.quote.slice(0, 180),
        body: `Hi Alex,\n\n${sample.intro}\n\n${sample.quote}\n\nPeople Team\n\nFictional demo email. No email was sent.`,
        direction: "inbound" as const,
        demo: true,
        taskId: task?.id,
        taskTitle: task?.title,
        source: { documentId: doc.id, page: sample.page, quote: sample.quote },
      },
    ];
  });
}

export async function readDemoInbox(
  w: Workspace,
  readLive: (messageId?: string) => Promise<InboxSnapshot>,
  messageId?: string,
): Promise<InboxSnapshot> {
  const messages = demoMessages(w);
  if (messageId?.startsWith("demo-email-")) {
    return {
      provider: "demo",
      connected: false,
      limited: false,
      messages: [],
      message: messages.find((m) => m.id === messageId),
    };
  }
  // Keep the live reader's authorization and error behavior for live details.
  if (messageId) return readLive(messageId);
  let live: InboxSnapshot;
  try {
    live = await readLive();
  } catch {
    live = {
      connected: false,
      limited: false,
      messages: [],
      warning:
        "Live HR replies could not be checked. You can still browse the sample emails. Refresh to try again.",
    };
  }
  return {
    ...live,
    provider: "demo",
    messages: [
      ...live.messages,
      ...messages.map(({ body: _, ...m }) => m),
    ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
  };
}
