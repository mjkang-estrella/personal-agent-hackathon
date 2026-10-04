import Link from "next/link";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
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
      <div className="signin-layout">
        <Link className="signin-brand" href="/" aria-label="JobSwitch home">
          <span className="signin-brand-icon">
            <ArrowLeftRight size={19} aria-hidden="true" />
          </span>
          JobSwitch
        </Link>
        <section className="signin-card" aria-labelledby="signin-title">
          <h1 id="signin-title">
            {user ? "You’re signed in" : "Sign in to JobSwitch"}
          </h1>
          <p className="signin-intro">
            {user
              ? `Continue as ${user.email}.`
              : "Your next chapter, all in one place."}
          </p>
          {error && (
            <p role="alert" className="account-error">
              {error === "restore"
                ? "You’re signed in, but your workspace could not be restored. Please try again."
                : "Google sign-in was cancelled or could not finish. Please try again."}
            </p>
          )}
          {user ? (
            <Link className="signin-continue" href="/workspace">
              Open my workspace
            </Link>
          ) : (
            <>
              <GoogleSignIn configured={authConfigured()} />
              <p className="signin-signup">
                New here? The same button creates your account.
              </p>
            </>
          )}
          <p className="signin-privacy">
            Signing in doesn’t grant access to your inbox.
          </p>
          {!user && (
            <div className="signin-demo">
              <TryDemo />
              <small>Fictional documents. No account needed.</small>
            </div>
          )}
        </section>
        <Link className="signin-back" href="/">
          <ArrowLeft size={14} aria-hidden="true" /> Back to JobSwitch
        </Link>
      </div>
    </main>
  );
}
