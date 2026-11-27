"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { CheckoutStatus } from "@/components/checkout-status";
import { api } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import type { SavedRecipe } from "@/lib/types";

export default function AccountPage() {
  const { user, ready, login, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedRecipe[]>([]);
  const [history, setHistory] = useState<SavedRecipe[]>([]);
  const [tab, setTab] = useState<"saved" | "history">("saved");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      api<{ recipes: SavedRecipe[] }>("/api/v1/recipes"),
      api<{ recipes: SavedRecipe[] }>("/api/v1/recipes/history"),
    ]).then(([a, b]) => {
      if (active) { setSaved(a.recipes); setHistory(b.recipes); }
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : "Could not load recipes.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  async function removeAccount() {
    setDeleting(true);
    setError("");
    try { await deleteAccount(); router.replace("/"); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete your account."); setDeleting(false); }
  }

  if (!ready) return <main className="page-shell">Loading account…</main>;
  if (!user) return <main className="page-shell empty-state"><h1>Sign in to see your recipes.</h1><p>Your saved recipes and recent history live here.</p><button className="button" onClick={() => void login().catch(() => setError("Could not start sign in."))}>Log in</button>{error && <p className="error" role="alert">{getFriendlyErrorMessage(error)}</p>}</main>;
  const recipes = tab === "saved" ? saved : history;
  return <main className="page-shell">
    <h1 className="page-title">Hello, {user.name || user.email}.</h1>
    <p className="muted">{user.email}</p>
    <CheckoutStatus />
    <div className="chips"><button className="chip" aria-pressed={tab === "saved"} onClick={() => setTab("saved")}>Saved</button><button className="chip" aria-pressed={tab === "history"} onClick={() => setTab("history")}>History</button></div>
    {error && <p className="error" role="alert">{getFriendlyErrorMessage(error)}</p>}
    {loading ? <p className="muted">Loading recipes…</p> : recipes.length === 0 ? <p className="muted">{tab === "saved" ? "No saved recipes yet." : "No recent recipes yet."}</p> :
      <ul className="list">{recipes.map((recipe) => <li key={recipe.id} className="row"><Link href={`/result?${tab === "saved" ? "savedRecipeId" : "historyRecipeId"}=${encodeURIComponent(recipe.id)}`}>{recipe.title}</Link><span className="muted">{recipe.createdAt ? new Date(recipe.createdAt).toLocaleDateString() : ""}</span></li>)}</ul>}
    <section className="account-actions"><h2 className="section-title">Account</h2><div className="chips"><Link className="button button-secondary button-small" href="/upgrade">Upgrade to Pro</Link><Link className="button button-secondary button-small" href="/customer-center">Manage subscription</Link><button className="button button-secondary button-small" onClick={() => void logout().catch(() => setError("You were signed out locally, but the sign-out request failed."))}>Log out</button></div></section>
    <section className="account-actions"><h2>Delete account</h2><p className="muted">Permanently delete your account and saved recipes.</p>
      {confirming ? <div className="chips"><button className="button button-small" disabled={deleting} onClick={removeAccount}>{deleting ? "Deleting…" : "Yes, delete my account"}</button><button className="button button-secondary button-small" onClick={() => setConfirming(false)}>Cancel</button></div> : <button className="text-button" onClick={() => setConfirming(true)}>Delete account</button>}
    </section>
  </main>;
}
