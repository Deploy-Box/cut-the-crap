"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { useAuth } from "./auth-provider";

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "cut-the-crap-theme";

export function SiteHeader() {
  const { user, ready, login, error } = useAuth();
  const [loginError, setLoginError] = useState("");
  const notice = loginError || error;
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme: Theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setDismissedNotice(notice), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function toggleTheme() {
    const currentTheme: Theme = document.documentElement.dataset.theme === "dark"
      ? "dark"
      : document.documentElement.dataset.theme === "light" ? "light"
        : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return <>
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label="Cut The Crap home">cut the crap<span>.</span></Link>
      <nav aria-label="Main navigation">
        <button
          className="theme-toggle"
          type="button"
          aria-label="Toggle light and dark mode"
          title="Toggle light and dark mode"
          onClick={toggleTheme}
        >
          <svg className="theme-icon theme-icon-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </svg>
          <svg className="theme-icon theme-icon-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
          </svg>
        </button>
        {user ? <Link href="/account">My recipes</Link> : ready ? (
          <button className="button button-small" onClick={() => { setDismissedNotice(null); setLoginError(""); void login().catch(() => setLoginError("Could not start sign in. Please try again.")); }}>Log in</button>
        ) : <span className="muted">Loading…</span>}
      </nav>
    </header>
    {notice && dismissedNotice !== notice && <p className="site-notice" role="alert">{getFriendlyErrorMessage(notice)}</p>}
  </>;
}
