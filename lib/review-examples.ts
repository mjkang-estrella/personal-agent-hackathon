import type { DecisionOption, Evidence, Task, Workspace } from "./types";
import { validEvidence } from "./domain";

const option = (
  id: string,
  label: string,
  detail: string,
  nextStep: string,
): DecisionOption => ({ id, label, detail, nextStep });

// Preferences to practice with, never invented plan terms or benefit elections.
export function reviewExamples(): Task[] {
  const definitions: {
    id: string;
    title: string;
    category: Task["category"];
    question: string;
    why: string;
    evidence: Evidence;
    missing: string[];
    options: DecisionOption[];
  }[] = [
    {
      id: "health-priority",
      title: "Set your health-plan comparison priority",
      category: "health",
      question: "What matters most when comparing health plans?",
      why: "There is no best plan for everyone. Choose what you want to compare first; actual plan details still need confirmation.",
      evidence: {
        documentId: "orbit-policy",
        page: 1,
        quote:
          "Review plan costs, networks, and dependent details before making an election.",
      },
      missing: [
        "Plan premiums, out-of-pocket costs, and provider networks from Orbit HR.",
      ],
      options: [
        option(
          "doctors",
          "Keeping my doctors",
          "Start with the provider network.",
          "Get Orbit’s provider directories and check your doctors before choosing a plan.",
        ),
        option(
          "costs",
          "Understanding total costs",
          "Compare premiums and possible out-of-pocket spending.",
          "Request Orbit’s plan cost summaries and compare premiums, deductibles, and out-of-pocket limits.",
        ),
        option(
          "compare",
          "Compare everything first",
          "Keep costs and networks side by side.",
          "Request Orbit’s plan summaries and provider directories before making an election.",
        ),
      ],
    },
    {
      id: "dependents",
      title: "Plan your dependent coverage questions",
      category: "health",
      question: "Whose coverage do you want to check?",
      why: "This sets your checklist only. HR must verify eligibility and coverage dates for each person.",
      evidence: {
        documentId: "orbit-policy",
        page: 1,
        quote: "HR must confirm employee and dependent eligibility.",
      },
      missing: [
        "HR confirmation of individual eligibility and coverage dates.",
      ],
      options: [
        option(
          "self",
          "Just me",
          "Focus the checklist on employee coverage.",
          "Confirm your own eligibility and coverage start date with Orbit HR.",
        ),
        option(
          "family",
          "Me and my dependents",
          "Include the people you may want to cover.",
          "Ask HR about dependent eligibility, required documents, costs, and coverage dates. Use the secure portal for personal documents.",
        ),
        option(
          "unsure",
          "I’m still deciding",
          "Gather details before choosing who to enroll.",
          "Request employee-only and dependent coverage details from Orbit HR.",
        ),
      ],
    },
    {
      id: "onboarding-prep",
      title: "Choose your next onboarding step",
      category: "onboarding",
      question: "How would you like to prepare for day one?",
      why: "Choose the next step that fits where you are. Identity documents belong in the designated secure portal.",
      evidence: {
        documentId: "orbit-policy",
        page: 2,
        quote:
          "Do not email identity documents; use the designated secure HR portal.",
      },
      missing: [
        "Your individual onboarding invitation and its requested document list.",
      ],
      options: [
        option(
          "invitation",
          "Find my invitation",
          "Start with the instructions sent to you.",
          "Find your Orbit onboarding invitation and check its document list and secure portal link.",
        ),
        option(
          "checklist",
          "Make a document checklist",
          "Use the invitation to organize what you need.",
          "Read your individual invitation and list its requested documents; upload them only through the designated secure HR portal.",
        ),
        option(
          "access",
          "Check portal access",
          "Confirm that you can sign in before day one.",
          "Open the designated secure HR portal from your invitation. If you cannot sign in, ask Orbit HR for access help.",
        ),
      ],
    },
    {
      id: "equipment-prep",
      title: "Plan your home-office request",
      category: "onboarding",
      question: "What would you like to check for your home office?",
      why: "This records a preference, not a purchase or reimbursement request. Eligible equipment and manager approval are still unknown.",
      evidence: {
        documentId: "orbit-policy",
        page: 2,
        quote:
          "Save itemized receipts and ask HR about eligible equipment before purchasing.",
      },
      missing: [
        "Eligible equipment and manager approval; no purchase or reimbursement is approved.",
      ],
      options: [
        option(
          "monitor",
          "Ask about a monitor",
          "Check whether a display would be eligible.",
          "Ask Orbit HR whether a monitor is eligible and request manager approval before buying.",
        ),
        option(
          "desk",
          "Ask about a desk or chair",
          "Check whether workspace furniture is eligible.",
          "Ask Orbit HR whether a desk or chair is eligible and request manager approval before buying.",
        ),
        option(
          "wait",
          "Wait until I know what is provided",
          "Check the employer’s equipment list first.",
          "Ask Orbit what equipment it provides before deciding whether to request anything else.",
        ),
      ],
    },
  ];
  return definitions.map((d) => ({
    id: `review-example-${d.id}`,
    title: d.title,
    description: d.why,
    stage: "after",
    category: d.category,
    status: "todo",
    deadline: null,
    deadlineRule: "unknown",
    amount: null,
    evidence: [d.evidence],
    missing: d.missing,
    nextAction: "Review the options and record your preference.",
    decision: { question: d.question, why: d.why, options: d.options },
  }));
}

export function isReviewExample(task: Task) {
  return task.id.startsWith("review-example-");
}

// Explicit replay resets only these four local practice choices, never claims.
export function loadReviewExamples(w: Workspace) {
  if (!w.demo || w.scenario)
    throw new Error("Only the fictional demo supports these review examples.");
  const examples = reviewExamples();
  if (!examples.every((t) => t.evidence.every((e) => validEvidence(e, w))))
    throw new Error(
      "Your demo policies changed. Open a fresh demo in Workspace settings to try these examples.",
    );
  w.tasks = [
    ...w.tasks.filter((t) => !examples.some((e) => e.id === t.id)),
    ...examples,
  ];
}
