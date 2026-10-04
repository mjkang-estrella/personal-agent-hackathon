"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Account = {
  configured: boolean;
  user: { id: string; name: string; email: string } | null;
  activeWorkspace?: string;
  workspaces: {
    id: string;
    demo: boolean;
    previousEmployer: string;
    nextEmployer: string;
  }[];
};

export function GoogleSignIn({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/auth/callback`,
        errorCallbackURL: `${window.location.origin}/sign-in?error=google`,
      });
      if (result.error) throw new Error();
    } catch {
      setError("Google sign-in could not start. Please try again.");
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="account-google"
        aria-busy={busy}
        disabled={!configured || busy}
        onClick={signIn}
      >
        <Image
          src="/brand/google-g.png"
          width={20}
          height={20}
          alt=""
          unoptimized
        />
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {!configured && (
        <p role="status">
          Sign-in is unavailable on this site right now. Try the demo below.
        </p>
      )}
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function TryDemo() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="text-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/account", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "demo" }),
            });
            if (!r.ok) throw new Error();
            window.location.assign("/workspace");
          } catch {
            setError("The demo could not open. Please try again.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening demo…" : "Try the demo"} <ArrowRight size={16} />
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

export default function AccountControls({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/account")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = await r.json();
        if (!cancelled) setAccount(data);
      })
      .catch(() => {
        if (!cancelled)
          setError("Account status is unavailable. Reload to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function action(data: object) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error();
      window.location.assign(
        "action" in data && data.action === "sign_out"
          ? "/sign-in"
          : "/workspace",
      );
    } catch {
      setError("Your account could not be updated. Please try again.");
      setBusy(false);
    }
  }
  if (compact)
    return (
      <div className="account-nav">
        {account?.user ? (
          <a href="/workspace?account=1" title={account.user.email}>
            <UserRound size={16} /> My account
          </a>
        ) : (
          <a href="/sign-in">
            <UserRound size={16} /> Sign in
          </a>
        )}
      </div>
    );
  return (
    <section className="settings-card account-card" aria-label="Your account">
      <h2>
        <ShieldCheck size={20} /> Your account
      </h2>
      {!account && !error && <p role="status">Checking your account…</p>}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      {account?.user ? (
        <>
          <strong>{account.user.name}</strong>
          <p className="account-email">{account.user.email}</p>
          <p>
            Your documents and progress are saved to your account. Sign in with
            the same Google account on another device to continue.
          </p>
          {account.workspaces.length > 1 && (
            <label>
              Saved workspaces
              <select
                aria-label="Saved workspaces"
                value={account.activeWorkspace}
                disabled={busy}
                onChange={(e) =>
                  action({ action: "switch", workspaceId: e.target.value })
                }
              >
                {account.workspaces.map((w, index) => (
                  <option key={w.id} value={w.id}>
                    {w.demo ? "Demo" : "Personal"} · {w.previousEmployer} →{" "}
                    {w.nextEmployer} ({account.workspaces.length - index})
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className="secondary"
            disabled={busy}
            onClick={() => action({ action: "sign_out" })}
          >
            <LogOut size={16} /> {busy ? "Updating account…" : "Sign out"}
          </button>
        </>
      ) : (
        account && (
          <>
            <p>
              Keep your progress across devices. Sign in before adding personal
              documents or connecting Gmail.
            </p>
            <a className="primary" href="/sign-in">
              Sign in with Google <ArrowRight size={16} />
            </a>
            <p className="muted">
              Google sign-in does not grant access to your inbox. Gmail is a
              separate, optional connection.
            </p>
          </>
        )
      )}
    </section>
  );
}
