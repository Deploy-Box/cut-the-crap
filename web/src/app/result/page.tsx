"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { RecipeView } from "@/components/recipe-view";
import { api, fromSavedRecipe, parseRecipe, post, recipePayload } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import type { Recipe, SavedRecipeDetail } from "@/lib/types";

function ResultContent() {
  const params = useSearchParams();
  const { user, ready, login } = useAuth();
  const source = params.get("url") ?? "";
  const savedId = params.get("savedRecipeId");
  const historyId = params.get("historyRecipeId");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [sourceUrl, setSourceUrl] = useState(source);
  const [notRecipe, setNotRecipe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(!!savedId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    async function load() {
      try {
        if (savedId || historyId) {
          const path = savedId ? `/api/v1/recipes/${encodeURIComponent(savedId)}` : `/api/v1/recipes/history/${encodeURIComponent(historyId!)}`;
          const result = await api<{ recipe: SavedRecipeDetail }>(path);
          setRecipe(fromSavedRecipe(result.recipe));
          setSourceUrl(result.recipe.sourceUrl ?? "");
        } else if (source) {
          const parsed = new URL(source);
          if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Please provide a valid recipe URL.");
          const result = await post<{ success: boolean; data: unknown; error?: string }>("/api/v1/chatgpt/parse-url", { url: source });
          if (!result.success) throw new Error(result.error ?? "Could not extract a recipe from that page.");
          const value = parseRecipe(result.data);
          setNotRecipe(!value.isRecipe);
          if (value.isRecipe) {
            setRecipe(value.recipe);
            if (user) {
              post("/api/v1/recipes/history", recipePayload(value.recipe, source)).catch(() => setNotice("Recipe extracted, but could not be added to your history."));
            }
          }
        } else {
          throw new Error("There is no recipe to display. Start with a recipe URL.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load this recipe.");
      } finally { setLoading(false); }
    }
    void load();
  }, [ready, savedId, historyId, source, user]);

  async function save() {
    if (!recipe || saving) return;
    setSaving(true);
    setError("");
    try {
      await post("/api/v1/recipes", recipePayload(recipe, sourceUrl || undefined));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your recipe.");
    } finally { setSaving(false); }
  }

  return <main className="page-shell">
    <div className="page-toolbar"><Link href="/" className="back-link">← Another recipe</Link>
      {recipe && (user ? <button className="button button-small" disabled={saved || saving} onClick={save}>{saved ? "Saved ✓" : saving ? "Saving…" : "Save recipe"}</button> :
        <button className="text-button" onClick={() => void login().catch(() => setError("Could not start sign in."))}>Log in to save</button>)}
    </div>
    {loading && <div className="empty-state" role="status"><h1>Finding the actual recipe…</h1><p>Skipping the life story and getting to the good part.</p></div>}
    {error && <p className="error" role="alert">{getFriendlyErrorMessage(error)} {error.includes("Free accounts") && <Link href="/upgrade">Upgrade to Pro</Link>}</p>}
    {notice && <p className="notice" role="status">{getFriendlyErrorMessage(notice)}</p>}
    {!loading && notRecipe && <div className="empty-state"><h1>{getFriendlyErrorMessage("This page is not a recipe.")}</h1><p>Try a link with an ingredient list and cooking steps.</p><Link className="button" href="/">Try another URL</Link></div>}
    {recipe && <RecipeView recipe={recipe} sourceUrl={sourceUrl} />}
  </main>;
}

export default function ResultPage() {
  return <Suspense fallback={<main className="page-shell">Loading recipe…</main>}><ResultContent /></Suspense>;
}
