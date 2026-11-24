"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./auth-provider";

export function SiteHeader() {
  const { user, ready, login, error } = useAuth();
  const [loginError, setLoginError] = useState("");

  return <>
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label="Cut The Crap home">cut the crap<span>.</span></Link>
      <nav aria-label="Main navigation">
        <Link href="/meal-plan">Meal plan</Link>
        {user ? <Link href="/account">My recipes</Link> : ready ? (
          <button className="button button-small" onClick={() => void login().catch(() => setLoginError("Could not start sign in. Please try again."))}>Log in</button>
        ) : <span className="muted">Loading…</span>}
      </nav>
    </header>
    {(error || loginError) && <p className="site-notice" role="alert">{loginError || error}</p>}
  </>;
}
