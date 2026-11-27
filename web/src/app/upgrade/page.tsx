"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { post } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

const plans = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY,
};

export default function UpgradePage() {
  const { user, ready, login } = useAuth();
  const [selected, setSelected] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    if (!user) { await login().catch(() => setError("Could not start sign in.")); return; }
    const priceId = plans[selected];
    if (!priceId) { setError("This plan is not configured. Please try again later."); return; }
    setBusy(true);
    setError("");
    try {
      const { url } = await post<{ url: string }>("/api/v1/billing/web/create-checkout-session", {
        priceId,
        successUrl: `${window.location.origin}/account?checkout=success`,
        cancelUrl: `${window.location.origin}/upgrade`,
      });
      if (!url) throw new Error("Checkout did not return a URL.");
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return <main className="page-shell"><div className="page-toolbar"><Link href="/" className="back-link">← Back to recipes</Link></div>
    <h1 className="page-title">Upgrade to Pro.</h1>
    <p className="lead">More recipes, fewer limits. Choose your plan at checkout.</p>
    <ul className="feature-list"><li>Unlimited saved recipes</li><li>No ads, ever</li></ul>
    <fieldset className="plan-options"><legend>Choose a plan</legend>
      {(["monthly", "yearly"] as const).map((plan) => <label key={plan} className="card row"><span><input type="radio" name="plan" value={plan} checked={selected === plan} onChange={() => setSelected(plan)} /> {plan === "monthly" ? "Monthly" : "Yearly"}</span><span className="muted">See price at checkout →</span></label>)}
    </fieldset>
    {error && <p className="error" role="alert">{getFriendlyErrorMessage(error)}</p>}
    <button className="button" disabled={!ready || busy} onClick={checkout}>{busy ? "Opening checkout…" : user ? "Continue to checkout" : "Log in to continue"}</button>
    <p className="disclaimer">Subscription pricing and renewal terms are shown in Stripe Checkout.</p>
  </main>;
}
