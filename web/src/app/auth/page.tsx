"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

function AuthCallback() {
  const params = useSearchParams();
  const [code] = useState(() => params.get("code"));
  const { exchange, ready } = useAuth();
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    if (!code) return;
    window.history.replaceState({}, "", "/auth");
    exchange(code).then(() => router.replace("/")).catch((e: unknown) => setError(e instanceof Error ? e.message : "Sign in failed."));
  }, [code, ready, exchange, router]);

  const message = error || (!code ? "No sign-in code was provided." : "");
  return <main className="page-shell empty-state">{message ? <><h1>Couldn’t sign you in.</h1><p role="alert">{getFriendlyErrorMessage(message)}</p><Link href="/">Return home</Link></> : <p role="status">Signing you in…</p>}</main>;
}

export default function AuthPage() {
  return <Suspense fallback={<main className="page-shell">Signing you in…</main>}><AuthCallback /></Suspense>;
}
