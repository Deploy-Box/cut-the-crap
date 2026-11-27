"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { post } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

export default function CustomerCenter() {
  const { user, ready, login } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    if (!user) { await login().catch(() => setError("Could not start sign in.")); return; }
    setBusy(true);
    setError("");
    try {
      const { url } = await post<{ url: string }>("/api/v1/billing/web/create-portal-session", {});
      if (!url) throw new Error("Subscription management did not return a URL.");
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open subscription management.");
      setBusy(false);
    }
  }

  return <main className="page-shell"><div className="page-toolbar"><Link href="/account" className="back-link">← Account</Link></div>
    <h1 className="page-title">Manage subscription.</h1><p className="lead">View your billing details or make changes in the Stripe customer portal.</p>
    {error && <p className="error" role="alert">{getFriendlyErrorMessage(error)}</p>}
    <button className="button" disabled={!ready || busy} onClick={openPortal}>{busy ? "Opening…" : user ? "Open subscription portal" : "Log in to continue"}</button>
  </main>;
}
