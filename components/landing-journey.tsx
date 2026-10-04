"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Coffee,
  Sprout,
  Check,
  CalendarDays,
  Heart,
  FileText,
  GraduationCap,
} from "lucide-react";
import styles from "@/app/landing.module.css";
const moments = [
  {
    label: "Before leaving",
    icon: BriefcaseBusiness,
    title: "Leave with fewer loose ends.",
    copy: "You’ve got a new chapter to think about. Let’s give the old one a thoughtful ending.",
    note: "Start with what has a deadline.",
    items: [
      {
        icon: GraduationCap,
        title: "Explore your learning reimbursement",
        detail: "Check the policy, receipt, and eligibility.",
      },
      {
        icon: FileText,
        title: "Keep the documents you’ll need",
        detail: "Bring your benefits information together.",
      },
      {
        icon: CalendarDays,
        title: "Know what’s due before your last day",
        detail: "See the dates that shape your next steps.",
      },
    ],
  },
  {
    label: "Between jobs",
    icon: Coffee,
    title: "A little space. A clearer head.",
    copy: "Whether it’s a weekend or a few weeks, keep the essentials in view so you can enjoy the in-between.",
    note: "Make room for a breather, too.",
    items: [
      {
        icon: Heart,
        title: "Understand a possible coverage gap",
        detail: "Compare your old end date and new start date.",
      },
      {
        icon: FileText,
        title: "Keep track of open questions",
        detail: "See what still needs an answer from HR.",
      },
      {
        icon: Check,
        title: "Follow the progress of your claim",
        detail: "Submitted isn’t approved—and approved isn’t paid.",
      },
    ],
  },
  {
    label: "After starting",
    icon: Sprout,
    title: "Find your feet. Then your rhythm.",
    copy: "New names, new routines, a new coffee spot. Keep the practical details from getting lost in the excitement.",
    note: "One next step at a time.",
    items: [
      {
        icon: Heart,
        title: "Review your new benefits",
        detail: "Find the policy details and enrollment dates.",
      },
      {
        icon: BriefcaseBusiness,
        title: "Get your onboarding details together",
        detail: "Keep the paperwork on your transition board.",
      },
      {
        icon: GraduationCap,
        title: "Explore what’s available to you",
        detail: "Check allowances without assuming eligibility.",
      },
    ],
  },
];
export default function LandingJourney() {
  const [selected, setSelected] = useState(0);
  const moment = moments[selected];
  const Icon = moment.icon;
  return (
    <section className={styles.moments} aria-labelledby="moments-title">
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>WHEREVER YOU ARE IN THE MOVE</p>
        <h2 id="moments-title">
          One change.
          <br />
          <em>Support for every part.</em>
        </h2>
      </div>
      <div
        className={styles.momentTabs}
        aria-label="Choose your transition stage"
      >
        {moments.map((m, i) => (
          <button
            key={m.label}
            aria-pressed={i === selected}
            onClick={() => setSelected(i)}
          >
            <m.icon size={20} />
            {m.label}
          </button>
        ))}
      </div>
      <div className={styles.momentPanel} aria-live="polite">
        <div className={styles.momentStory}>
          <span className={styles.momentIllustration}>
            <Icon size={62} strokeWidth={1.2} />
            <Spark />
          </span>
          <h3>{moment.title}</h3>
          <p>{moment.copy}</p>
          <span className={styles.handNote}>{moment.note}</span>
          <Link href="/workspace" className={styles.textLink}>
            Explore your transition <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className={styles.momentChecklist}>
          <p>THINGS WE CAN HELP YOU THINK THROUGH</p>
          {moment.items.map((item) => (
            <div key={item.title}>
              <span>
                <item.icon size={22} strokeWidth={1.5} />
              </span>
              <div>
                <h4>{item.title}</h4>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
          <small>
            Illustrative examples. Your plan follows your documents.
          </small>
        </div>
      </div>
    </section>
  );
}
function Spark() {
  return (
    <span className={styles.momentSpark} aria-hidden="true">
      ✳
    </span>
  );
}
