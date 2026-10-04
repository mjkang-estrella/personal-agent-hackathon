import type { Workspace, Document, Task } from "./types";
import { randomUUID } from "node:crypto";
export function makeWorkspace(): Workspace {
  const now = new Date().toISOString();
  const documents: Document[] = [
    {
      id: "northstar-policy",
      name: "Northstar · Benefits handbook",
      employer: "previous",
      kind: "policy",
      addedAt: now,
      pages: [
        "NORTHSTAR STUDIO — 2026 EMPLOYEE BENEFITS\nFictional policy for the JobSwitch demo.\nHealth and dental coverage ends at 11:59 p.m. on the employee’s last working day. HR will provide continuation options separately. Ask HR to confirm the exact end date for your dependents and any available continuation options. This document does not determine eligibility for external programs.",
        "LEARNING & DEVELOPMENT\nEmployees may request reimbursement of up to $1,500 per calendar year for pre-approved, job-related courses completed before their last working day. Claims must be submitted no later than the last working day. Include an itemized receipt and course completion certificate. HR must confirm prior approval, remaining annual allowance, and any repayment obligations before a claim is prepared. Incomplete claims may receive a request for additional documentation.",
        "RETIREMENT & OFFBOARDING\nDownload your retirement plan statement and save the plan administrator’s contact details before your last working day. Your personal vesting, balances, available options, and any distribution deadlines must be verified with the plan administrator. This handbook does not establish your individual eligibility. After you leave, your vested 401(k) balance may stay in the Northstar plan or be rolled over to another eligible plan or an IRA at a financial institution you choose. Northstar does not recommend a destination or provider. Return your laptop and access badge on your last working day. An HR receipt confirms return.",
      ],
    },
    {
      id: "orbit-policy",
      name: "Orbit · Your benefits guide",
      employer: "next",
      kind: "policy",
      addedAt: now,
      pages: [
        "ORBIT LABS — WELCOME & BENEFITS 2026\nFictional policy for the JobSwitch demo.\nFor eligible employees, health coverage begins on the first day of the month following their start date. HR must confirm employee and dependent eligibility. Submit your health plan election within 30 calendar days of starting, counting the start date as day one. Review plan costs, networks, and dependent details before making an election.",
        "GETTING STARTED\nComplete your onboarding profile and provide the documents requested in your individual onboarding invitation by your first working day. Do not email identity documents; use the designated secure HR portal. New employees can request a home office equipment allowance of up to $600, subject to manager approval. Save itemized receipts and ask HR about eligible equipment before purchasing.",
        "RETIREMENT\nRetirement plan enrollment is available after starting employment. Contact the plan administrator for eligibility, contribution options, match terms, and enrollment timing. The Orbit 401(k) plan accepts rollovers from eligible prior employer plans once you are enrolled. No individual investment or rollover recommendation is included in this guide.",
      ],
    },
    {
      id: "course-receipt",
      name: "Product strategy · Course receipt",
      employer: "personal",
      kind: "receipt",
      addedAt: now,
      pages: [
        "FICTIONAL RECEIPT — DEMO ONLY\nReceipt: EDU-2026-1042\nStudent: Alex Morgan\nProvider: Design Academy\nCourse: Product Strategy Fundamentals\nPaid: $850.00 USD\nPayment date: September 10, 2026\nCourse completed: September 28, 2026. This receipt is not a completion certificate.",
      ],
    },
    {
      id: "hr-confirmation",
      name: "Northstar HR · Learning allowance",
      employer: "previous",
      kind: "other",
      addedAt: now,
      pages: [
        "FICTIONAL HR EMAIL — DEMO ONLY\nFrom: Northstar People Team\nTo: Alex Morgan\nOctober 2, 2026\nWe confirm Product Strategy Fundamentals was pre-approved as job-related professional development and completed September 28, 2026. Your remaining 2026 learning allowance is $1,000. No repayment obligation applies to this course. Please submit your $850 receipt before your October 16 last day. We can open the claim with your receipt and request the completion certificate during review. This is permission to submit, not final reimbursement approval.",
      ],
    },
  ];
  const tasks: Task[] = [
    {
      id: "learning",
      title: "Claim your learning reimbursement",
      description:
        "Your $850 course may qualify before you leave. Northstar HR has confirmed prior approval and your remaining allowance.",
      stage: "before",
      category: "money",
      status: "todo",
      deadline: "2026-10-16",
      deadlineRule: "departure",
      amount: 850,
      evidence: [
        {
          documentId: "northstar-policy",
          page: 2,
          quote: "Claims must be submitted no later than the last working day.",
        },
        {
          documentId: "hr-confirmation",
          page: 1,
          quote:
            "We can open the claim with your receipt and request the completion certificate during review.",
        },
      ],
      missing: [],
      nextAction: "Review receipt and prepare your claim.",
    },
    {
      id: "retirement",
      title: "Save your retirement plan details",
      description:
        "Keep your latest statement and administrator contact details before company access ends.",
      stage: "before",
      category: "retirement",
      status: "todo",
      deadline: "2026-10-16",
      deadlineRule: "departure",
      amount: null,
      evidence: [
        {
          documentId: "northstar-policy",
          page: 3,
          quote:
            "Download your retirement plan statement and save the plan administrator’s contact details before your last working day.",
        },
      ],
      missing: [
        "Personal vesting and plan options require administrator confirmation.",
      ],
      nextAction: "Download your statement; confirm your individual options.",
    },
    {
      id: "rollover",
      title: "Decide where your Northstar 401(k) goes",
      description:
        "Your old plan balance can stay put or move. This is a personal choice about fees, investments, and convenience, so your agent lays out the options without picking one.",
      stage: "between",
      category: "retirement",
      status: "todo",
      deadline: null,
      deadlineRule: "unknown",
      amount: null,
      evidence: [
        {
          documentId: "northstar-policy",
          page: 3,
          quote: "Northstar does not recommend a destination or provider.",
        },
        {
          documentId: "orbit-policy",
          page: 3,
          quote:
            "No individual investment or rollover recommendation is included in this guide.",
        },
      ],
      missing: [
        "Your vested balance and any distribution deadlines, from the Northstar plan administrator.",
      ],
      nextAction: "Choose a destination for your 401(k).",
      decision: {
        question: "Where should your Northstar 401(k) go?",
        why: "Your agent has no preference here. It depends on fees, investment choices, and how you like to manage your accounts.",
        options: [
          {
            id: "stay",
            label: "Leave it in the Northstar plan",
            detail: "Nothing moves now. You can still roll it over later.",
            nextStep:
              "Save the Northstar plan administrator’s contact details and keep your statement.",
            evidence: {
              documentId: "northstar-policy",
              page: 3,
              quote:
                "your vested 401(k) balance may stay in the Northstar plan",
            },
          },
          {
            id: "orbit",
            label: "Move it into the Orbit 401(k)",
            detail:
              "Keeps your retirement savings in one workplace plan. Available once you’re enrolled at Orbit.",
            nextStep:
              "Enroll in the Orbit 401(k), then ask both plan administrators for rollover forms.",
            evidence: {
              documentId: "orbit-policy",
              page: 3,
              quote:
                "The Orbit 401(k) plan accepts rollovers from eligible prior employer plans once you are enrolled.",
            },
          },
          {
            id: "ira",
            label: "Roll it into an IRA at a bank or brokerage you pick",
            detail:
              "You choose the institution. Neither handbook covers its fees or investments, so compare those yourself.",
            nextStep:
              "Pick your bank or brokerage, open the IRA, then request a direct rollover from Northstar’s plan administrator.",
            evidence: {
              documentId: "northstar-policy",
              page: 3,
              quote: "an IRA at a financial institution you choose",
            },
          },
        ],
      },
    },
    {
      id: "coverage",
      title: "Check the gap in health coverage",
      description:
        "Northstar coverage ends on your last day. Orbit coverage starts the following month, subject to eligibility. Confirm how you’ll cover the time between.",
      stage: "between",
      category: "health",
      status: "todo",
      deadline: null,
      deadlineRule: "unknown",
      amount: null,
      evidence: [
        {
          documentId: "northstar-policy",
          page: 1,
          quote:
            "Health and dental coverage ends at 11:59 p.m. on the employee’s last working day.",
        },
        {
          documentId: "orbit-policy",
          page: 1,
          quote:
            "For eligible employees, health coverage begins on the first day of the month following their start date.",
        },
      ],
      missing: [
        "HR confirmation of employee and dependent eligibility.",
        "Your preferred option for any gap in coverage.",
      ],
      nextAction: "Compare the policy dates and ask HR about your options.",
    },
    {
      id: "enrollment",
      title: "Choose your new health benefits",
      description:
        "Review the plans and submit your election within Orbit’s 30-day enrollment window.",
      stage: "after",
      category: "health",
      status: "todo",
      deadline: "2026-11-17",
      deadlineRule: "enrollment",
      amount: null,
      evidence: [
        {
          documentId: "orbit-policy",
          page: 1,
          quote:
            "Submit your health plan election within 30 calendar days of starting, counting the start date as day one.",
        },
      ],
      missing: ["Your plan election and dependent information."],
      nextAction: "Review networks and costs before making a choice.",
    },
    {
      id: "onboarding",
      title: "Get your onboarding paperwork ready",
      description:
        "Complete your profile and use the secure HR portal for your requested documents.",
      stage: "after",
      category: "onboarding",
      status: "todo",
      deadline: "2026-10-19",
      deadlineRule: "start",
      amount: null,
      evidence: [
        {
          documentId: "orbit-policy",
          page: 2,
          quote:
            "Complete your onboarding profile and provide the documents requested in your individual onboarding invitation by your first working day.",
        },
      ],
      missing: ["Your individual onboarding invitation."],
      nextAction: "Check the invitation for your exact document list.",
    },
    {
      id: "equipment",
      title: "Explore your home office allowance",
      description:
        "Orbit offers up to $600 toward eligible home office equipment. Get approval before you buy.",
      stage: "after",
      category: "money",
      status: "todo",
      deadline: null,
      deadlineRule: "unknown",
      amount: 600,
      evidence: [
        {
          documentId: "orbit-policy",
          page: 2,
          quote:
            "New employees can request a home office equipment allowance of up to $600, subject to manager approval.",
        },
      ],
      missing: ["Manager approval and confirmation of eligible equipment."],
      nextAction: "Ask your manager what equipment is eligible.",
    },
  ];
  return {
    profile: {
      name: "Alex Morgan",
      previousEmployer: "Northstar Studio",
      nextEmployer: "Orbit Labs",
      lastDay: "2026-10-16",
      startDay: "2026-10-19",
    },
    documents,
    tasks,
    activity: [
      {
        id: randomUUID(),
        at: now,
        title: "Your transition workspace is ready",
        detail:
          "Loaded fictional handbooks, a course receipt, and an HR confirmation. Run the agent to analyze them live.",
        type: "system",
      },
    ],
    resources: [],
    demo: true,
    analyzedAt: null,
    analysisSummary: "A little planning now. A smoother start next.",
  };
}
export function completionCertificate(): Document {
  return {
    id: "course-certificate",
    name: "Product strategy · Completion certificate",
    employer: "personal",
    kind: "certificate",
    addedAt: new Date().toISOString(),
    pages: [
      "FICTIONAL COMPLETION CERTIFICATE — DEMO ONLY\nDesign Academy certifies that Alex Morgan completed Product Strategy Fundamentals on September 28, 2026. Certificate ID: CERT-2026-1042.",
    ],
  };
}
