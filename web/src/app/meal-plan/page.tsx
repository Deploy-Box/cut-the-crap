"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { api, post } from "@/lib/api";
import type { MealPlan, SavedRecipe } from "@/lib/types";

const mealTypes = ["breakfast", "lunch", "dinner"] as const;
type MealType = typeof mealTypes[number];

export default function MealPlanPage() {
  const { user, ready, login } = useAuth();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [days, setDays] = useState(7);
  const [meals, setMeals] = useState<MealType[]>([...mealTypes]);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<MealPlan | null>(null);
  const [tab, setTab] = useState<"plan" | "groceries">("plan");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      api<{ entitlements: Record<string, { status: string }> }>("/api/v1/me/entitlements"),
      api<{ recipes: SavedRecipe[] }>("/api/v1/recipes"),
    ]).then(([entitlements, list]) => {
      if (active) {
        setIsPro(entitlements.entitlements.pro?.status === "active");
        setRecipes(list.recipes);
      }
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : "Could not load meal planning.");
    });
    return () => { active = false; };
  }, [user]);

  async function generate() {
    if (meals.length === 0) { setError("Choose at least one meal."); return; }
    setBusy(true);
    setError("");
    try {
      const response = await post<{ success: boolean; data: MealPlan; error?: string }>("/api/v1/meal-plan/generate", { selectedRecipeIds: selected, days, mealsPerDay: meals });
      if (!response.success || !response.data || !Array.isArray(response.data.days) || !Array.isArray(response.data.groceryList)) throw new Error(response.error ?? "The meal plan service returned invalid data.");
      setResult(response.data);
      setTab("plan");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not generate a meal plan."); }
    finally { setBusy(false); }
  }

  if (!ready) return <main className="page-shell">Loading…</main>;
  if (!user) return <main className="page-shell empty-state"><h1>Plan a little ahead.</h1><p>Sign in to use meal planning.</p><button className="button" onClick={() => void login().catch(() => setError("Could not start sign in."))}>Log in</button>{error && <p className="error" role="alert">{error}</p>}</main>;
  if (error && isPro === null) return <main className="page-shell"><p className="error" role="alert">{error}</p><Link href="/">Back to recipes</Link></main>;
  if (isPro === null) return <main className="page-shell">Loading meal planning…</main>;
  if (!isPro) return <main className="page-shell empty-state"><p className="eyebrow">A PRO FEATURE</p><h1>Make a plan. Make a list.</h1><p>Upgrade to generate meal plans and grocery lists from your saved recipes.</p><Link className="button" href="/upgrade">Upgrade to Pro</Link></main>;

  return <main className="page-shell">
    <div className="page-toolbar">{result ? <button className="text-button" onClick={() => setResult(null)}>← Change plan</button> : <Link className="back-link" href="/">← Back to recipes</Link>}</div>
    <p className="eyebrow"><span className="eyebrow-line" /> A LITTLE LESS PLANNING</p>
    <h1 className="page-title">{result ? "Your meal plan." : "Let’s plan the week."}</h1>
    {result ? <>
      <div className="chips"><button className="chip" aria-pressed={tab === "plan"} onClick={() => setTab("plan")}>Meal plan</button><button className="chip" aria-pressed={tab === "groceries"} onClick={() => setTab("groceries")}>Grocery list</button></div>
      {tab === "plan" ? result.days.map((day) => <section key={day.dayNumber} className="recipe-section"><h2>Day {day.dayNumber}</h2>{day.meals.map((meal, i) => <article className="card meal-card" key={i}><p className="eyebrow">{meal.mealType.toUpperCase()}{meal.source === "saved" ? " · SAVED" : ""}</p><h3>{meal.title}</h3><p>{meal.description}</p><p className="muted">{[meal.prepTime && `Prep: ${meal.prepTime}`, meal.cookTime && `Cook: ${meal.cookTime}`].filter(Boolean).join(" · ")}</p><details><summary>Ingredients and instructions</summary><ul>{meal.ingredients.map((item, j) => <li key={j}>{item}</li>)}</ul><ol>{meal.steps.map((step, j) => <li key={j}>{step}</li>)}</ol></details></article>)}</section>) :
        <section className="recipe-section"><h2>Grocery list</h2><ul className="list">{result.groceryList.map((item, i) => <li key={i} className="row"><label><input type="checkbox" /> {item.item} <span className="muted">· {item.category}</span></label><span>{item.quantity}</span></li>)}</ul></section>}
    </> : <div className="stack">
      <section><h2 className="section-title">How many days?</h2><div className="chips">{[1, 3, 5, 7].map((n) => <button key={n} className="chip" aria-pressed={days === n} onClick={() => setDays(n)}>{n} {n === 1 ? "day" : "days"}</button>)}</div></section>
      <section><h2 className="section-title">Meals per day</h2><div className="chips">{mealTypes.map((meal) => <button key={meal} className="chip" aria-pressed={meals.includes(meal)} onClick={() => setMeals((current) => current.includes(meal) ? current.filter((m) => m !== meal) : [...current, meal])}>{meal[0].toUpperCase() + meal.slice(1)}</button>)}</div></section>
      <section><h2 className="section-title">Include saved recipes</h2><p className="muted">Select up to 10 recipes, or let us generate everything.</p>{recipes.length === 0 ? <p className="muted">No saved recipes yet.</p> : <ul className="list">{recipes.map((recipe) => <li key={recipe.id}><label><input type="checkbox" checked={selected.includes(recipe.id)} disabled={!selected.includes(recipe.id) && selected.length >= 10} onChange={(e) => setSelected((current) => e.target.checked ? [...current, recipe.id] : current.filter((id) => id !== recipe.id))} /> {recipe.title}</label></li>)}</ul>}</section>
      {error && <p className="error" role="alert">{error}</p>}<button className="button" disabled={busy} onClick={generate}>{busy ? "Planning your meals…" : "Generate meal plan"}</button>
    </div>}
  </main>;
}
