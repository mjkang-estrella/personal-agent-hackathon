import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  FileText,
  ShieldCheck,
  Sparkles,
  MoveUpRight,
  Paperclip,
  BriefcaseBusiness,
  Coffee,
  Smile,
} from "lucide-react";
import LandingJourney from "@/components/landing-journey";
import styles from "./landing.module.css";

const features = [
  {
    number: "01",
    title: "Your benefits, decoded.",
    copy: "Make sense of both employers’ documents. See what changes, what needs checking, and where every answer comes from.",
    icon: FileText,
    tags: ["Employer policies", "Exact page references"],
  },
  {
    number: "02",
    title: "A plan for the in-between.",
    copy: "Before leaving, between jobs, after starting. Give every loose end a place—and every next step a little more clarity.",
    icon: ArrowLeftRight,
    tags: ["Three simple stages", "Dates in one place"],
  },
  {
    number: "03",
    title: "A little less back-and-forth.",
    copy: "Prepare your reimbursement, review the details, and follow its progress. You approve the action before anything is sent.",
    icon: ShieldCheck,
    tags: ["Review before sending", "Clear claim status"],
  },
];
const faqs = [
  [
    "What does JobSwitch help with?",
    "JobSwitch compares employer benefits documents and turns them into a transition plan. It helps you organize deadlines, understand evidence, and prepare an education reimbursement for review.",
  ],
  [
    "Can I try it without my own documents?",
    "Yes. The demo includes fictional Northstar and Orbit employer documents. Reimbursement submissions use a clearly labeled test HR portal and dedicated demo email inboxes.",
  ],
  [
    "Will it submit anything without asking me?",
    "No. Claims and email replies require your explicit approval of the exact content. If the content changes, it needs a fresh approval. Submitted, approved, and paid are separate states.",
  ],
  [
    "What happens to my documents?",
    "Documents are stored in your browser-linked workspace and sent to the model for analysis. Their contents are never used as public web search queries. This MVP workspace is tied to your browser, rather than a cross-device account.",
  ],
];
export default function Page() {
  return (
    <div className={styles.landing}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="JobSwitch home">
          <span>
            <ArrowLeftRight size={22} />
          </span>
          jobswitch
        </Link>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#your-transition">Your transition</a>
          <a href="#questions">Questions</a>
        </nav>
        <Link href="/workspace" className={styles.login}>
          Open workspace <ArrowUpRight size={17} />
        </Link>
      </header>
      <main id="main">
        <section className={styles.hero}>
          <div className={styles.heroSymbols} aria-hidden="true">
            <span>
              <BriefcaseBusiness size={24} />
            </span>
            <span>
              <ArrowRight size={18} />
            </span>
            <span>
              <Smile size={26} />
            </span>
          </div>
          <p className={styles.eyebrow}>BIG MOVE. FEWER LOOSE ENDS.</p>
          <h1>
            Your next chapter.
            <br />
            <span>Without the</span>{" "}
            <span className={styles.scribble}>
              paperwork.
              <svg viewBox="0 0 560 22" aria-hidden="true">
                <path d="M4 15C140 2 350 1 554 10M35 20C240 11 390 9 518 17" />
              </svg>
            </span>
          </h1>
          <p className={styles.intro}>
            New job? A fresh start? We’ll help you make sense of your benefits,
            <br className={styles.desktopBreak} /> organize the details, and
            take care of what comes next.
          </p>
          <div className={styles.actions}>
            <Link href="/workspace" className={styles.primary}>
              Explore the demo <ArrowUpRight size={20} />
            </Link>
            <a href="#how-it-works" className={styles.secondary}>
              See how it works <ArrowRight size={19} />
            </a>
          </div>
          <p className={styles.heroNote}>
            <ShieldCheck size={16} /> Your documents. Your decisions. A little
            more peace of mind.
          </p>
        </section>
        <section
          className={styles.heroVisual}
          aria-label="A calmer next chapter"
        >
          <img
            src="/images/next-chapter.jpg"
            alt="A professional enjoying a quiet moment at a sunlit home office"
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <div className={styles.photoCaption}>
            Make room for
            <br />
            <em>what’s next.</em>
          </div>
          <div className={styles.floatingCard}>
            <span className={styles.cardIcon}>
              <FileText size={22} />
            </span>
            <div>
              <small>ONE LESS THING TO FIGURE OUT</small>
              <strong>Your next steps, in one place.</strong>
              <p>
                Before leaving <ArrowRight size={12} /> After starting
              </p>
            </div>
            <span className={styles.check}>
              <Check size={17} />
            </span>
          </div>
          <span className={styles.photoLabel}>A FRESH START, WITH A PLAN.</span>
        </section>
        <div className={styles.promiseStrip}>
          <span>Grounded in your documents</span>
          <span>Built around your dates</span>
          <span>Always your call</span>
        </div>
        <section id="how-it-works" className={styles.features}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>LESS ADMIN. MORE POSSIBILITY.</p>
            <h2>
              A big life change.
              <br />
              <em>Made a little simpler.</em>
            </h2>
            <p>
              From the last day to the first hello,
              <br />a thoughtful assistant for everything in between.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {features.map(({ number, title, copy, icon: Icon, tags }) => (
              <article className={styles.feature} key={number}>
                <div className={styles.featureTop}>
                  <span>{number}</span>
                  <span className={styles.featureIcon}>
                    <Icon size={34} strokeWidth={1.3} />
                  </span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
                <div className={styles.featureExample} aria-hidden="true">
                  {number === "01" ? (
                    <>
                      <FileText size={18} />
                      <span>Policy page</span>
                      <ArrowRight size={15} />
                      <span className={styles.exampleChip}>
                        A clear next step
                      </span>
                    </>
                  ) : number === "02" ? (
                    <>
                      <span className={styles.exampleDot} />
                      <span>Last day</span>
                      <span className={styles.exampleLine} />
                      <Coffee size={18} />
                      <span className={styles.exampleLine} />
                      <span>First hello</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Prepared for you</span>
                      <span className={styles.exampleChip}>
                        You review <Check size={12} />
                      </span>
                    </>
                  )}
                </div>
                <div className={styles.featureTags}>
                  {tags.map((t) => (
                    <span key={t}>
                      <Check size={13} />
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        <LandingJourney />
        <section id="your-transition" className={styles.planSection}>
          <div className={styles.planCopy}>
            <p className={styles.eyebrow}>A CLEARER WAY FORWARD</p>
            <h2>
              Everything in order.
              <br />
              <em>You, moving on.</em>
            </h2>
            <p>
              Handbooks, deadlines, benefits, follow-ups. Bring the scattered
              pieces together in a plan that follows your transition.
            </p>
            <Link href="/workspace" className={styles.primary}>
              Find your next step <ArrowUpRight size={20} />
            </Link>
            <small>
              Explore with fictional employers and sample documents.
            </small>
          </div>
          <div className={styles.productVisual}>
            <div className={styles.miniHeader}>
              <span>
                <ArrowLeftRight size={17} /> Your transition
              </span>
              <span className={styles.demoBadge}>DEMO</span>
            </div>
            <div className={styles.miniJourney}>
              <span>Northstar Studio</span>
              <ArrowRight size={22} />
              <span>Orbit Labs</span>
            </div>
            <div className={styles.miniTabs}>
              <span>Before leaving</span>
              <span>Between jobs</span>
              <span>After starting</span>
            </div>
            <div className={styles.miniTask}>
              <div>
                <span className={styles.miniIcon}>
                  <FileText size={20} />
                </span>
                <span>
                  <strong>Review your learning reimbursement</strong>
                  <small>Check eligibility before your last day</small>
                </span>
              </div>
              <span className={styles.reviewBadge}>To review</span>
              <div className={styles.miniEvidence}>
                <Paperclip size={14} /> Northstar handbook · Page 2{" "}
                <ArrowUpRight size={14} />
              </div>
            </div>
            <div className={styles.miniRow}>
              <ShieldCheck size={19} />
              <span>Check your health coverage gap</span>
              <ArrowUpRight size={15} />
            </div>
            <div className={styles.miniRow}>
              <FileText size={19} />
              <span>Keep your retirement plan details</span>
              <ArrowUpRight size={15} />
            </div>
            <div className={styles.assistantNote}>
              <Sparkles size={19} />
              <p>
                A source for every recommendation.
                <br />
                <strong>A decision that stays yours.</strong>
              </p>
            </div>
          </div>
        </section>
        <section className={styles.controlSection}>
          <div className={styles.controlArt} aria-hidden="true">
            <div className={styles.paper}>
              <FileText size={30} />
              <span>Ready for your review</span>
              <div />
              <div />
              <div />
              <strong>
                You’re in control. <Check size={23} />
              </strong>
            </div>
            <span className={styles.seal}>
              <ShieldCheck size={46} strokeWidth={1.3} />
            </span>
          </div>
          <div>
            <p className={styles.eyebrow}>HELPFUL BY DESIGN</p>
            <h2>
              A helping hand.
              <br />
              <em>Not a leap of faith.</em>
            </h2>
            <p>
              See the exact policy page behind a recommendation. Know what’s
              confirmed and what still needs checking. Review the details before
              approving an action.
            </p>
            <a href="#questions" className={styles.textLink}>
              A few things worth knowing <ArrowRight size={19} />
            </a>
          </div>
        </section>
        <section id="questions" className={styles.faq}>
          <div>
            <p className={styles.eyebrow}>GOOD QUESTIONS</p>
            <h2>
              A little clarity
              <br />
              <em>before you begin.</em>
            </h2>
          </div>
          <div>
            {faqs.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalCta}>
          <span className={styles.ctaStar}>✳</span>
          <h2>
            Here’s to your
            <br />
            <em>next chapter.</em>
          </h2>
          <p>More looking forward. Less chasing loose ends.</p>
          <Link href="/workspace" className={styles.primary}>
            Let’s get you moving <MoveUpRight size={20} />
          </Link>
          <small>Try the fictional demo. Make yourself at home.</small>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link href="/" className={styles.logo}>
          <span>
            <ArrowLeftRight size={21} />
          </span>
          jobswitch
        </Link>
        <p>For the space between two jobs.</p>
        <a href="#questions">Privacy & how it works</a>
        <span>© {new Date().getFullYear()} JobSwitch</span>
      </footer>
    </div>
  );
}
