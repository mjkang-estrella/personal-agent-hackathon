import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { authConfigured, currentUser } from "@/lib/auth/server";
import { GoogleSignIn, TryDemo } from "@/components/account-controls";
import "./sign-in.css";
export const metadata = { title: "Sign in — JobSwitch" };
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  let user = null;
  try {
    user = await currentUser();
  } catch {
    /* Present retry UI without leaking provider errors. */
  }
  return (
    <main className="signin-page">
      <Link className="signin-brand" href="/">
        jobswitch<span>®</span>
      </Link>
      <div className="signin-layout">
        <section className="signin-story">
          <span className="signin-eyebrow">ONE LESS THING TO START OVER</span>
          <h1>
            Your next chapter.
            <br />
            <em>Right where you left it.</em>
          </h1>
          <p>
            Keep your documents, decisions, and next steps together as you move
            between jobs.
          </p>
          <ul>
            <li>
              <Check size={18} /> Pick up on any device
            </li>
            <li>
              <Check size={18} /> Keep your current workspace progress
            </li>
            <li>
              <Check size={18} /> Connect your inbox only when you choose
            </li>
          </ul>
        </section>
        <section className="signin-card" aria-label="Sign in">
          <ShieldCheck className="signin-shield" size={28} />
          <h2>{user ? "You’re signed in" : "Make this workspace yours"}</h2>
          <p>
            {user
              ? `Continue as ${user.email}.`
              : "Sign in or create your account with Google. Your first sign-in saves this browser’s existing workspace to your account."}
          </p>
          {error && (
            <p role="alert" className="account-error">
              {error === "restore"
                ? "You’re signed in, but your workspace could not be restored. Please try again."
                : "Google sign-in was cancelled or could not finish. Please try again."}
            </p>
          )}
          {user ? (
            <Link className="primary" href="/workspace">
              Open my workspace
            </Link>
          ) : (
            <GoogleSignIn configured={authConfigured()} />
          )}
          <p className="signin-privacy">
            We use your Google name and email to identify your account. Signing
            in does not give JobSwitch access to Gmail.
          </p>
          {!user && (
            <div className="signin-demo">
              <TryDemo />
              <small>Fictional documents. No account required.</small>
            </div>
          )}
        </section>
      </div>
      <Link className="signin-back" href="/">
        <ArrowLeft size={16} /> Back to JobSwitch
      </Link>
    </main>
  );
}
