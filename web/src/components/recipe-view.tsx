"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/types";

export function RecipeView({ recipe, sourceUrl }: { recipe: Recipe; sourceUrl?: string }) {
  const [showIngredients, setShowIngredients] = useState(false);
  const metadata = [
    ["Prep", recipe.prep_time], ["Cook", recipe.cook_time], ["Cool", recipe.cool_time],
    ["Chill", recipe.chill_time], ["Rest", recipe.rest_time], ["Marinate", recipe.marinate_time],
    ["Soak", recipe.soak_time], ["Total", recipe.total_time], ["Servings", recipe.servings],
  ].filter(([, value]) => value);
  let safeSource: string | null = null;
  try {
    const url = new URL(sourceUrl ?? "");
    if (url.protocol === "http:" || url.protocol === "https:") safeSource = url.href;
  } catch { /* No valid source link. */ }

  return <article className="recipe">
    <p className="eyebrow"><span className="eyebrow-line" /> THE GOOD PART</p>
    <h1>{recipe.title}</h1>
    {recipe.description && <p className="lead">{recipe.description}</p>}
    {safeSource && <a className="source-link" href={safeSource} target="_blank" rel="noopener noreferrer">View original recipe ↗</a>}
    {metadata.length > 0 && <dl className="recipe-meta">{metadata.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {recipe.ingredients.length > 0 && <section className="recipe-section"><h2>Ingredients <span>{String(recipe.ingredients.length).padStart(2, "0")}</span></h2>
      <ul className="ingredient-list">{recipe.ingredients.map((item, i) => <li key={i}><label><input type="checkbox" /><span>{item}</span></label></li>)}</ul>
    </section>}
    {recipe.steps.length > 0 && <section className="recipe-section"><div className="section-heading"><h2>Instructions <span>{String(recipe.steps.length).padStart(2, "0")}</span></h2><label className="toggle"><input type="checkbox" checked={showIngredients} onChange={(e) => setShowIngredients(e.target.checked)} /> Show step ingredients</label></div>
      <ol className="steps">{recipe.steps.map((step, i) => <li key={i}><span className="step-number">{String(i + 1).padStart(2, "0")}</span><div>{typeof step === "string" ? step : step.instruction}{showIngredients && typeof step !== "string" && step.ingredients && <ul>{step.ingredients.map((ingredient, j) => <li key={j}>{ingredient}</li>)}</ul>}</div></li>)}</ol>
    </section>}
    {recipe.notes && recipe.notes.length > 0 && <section className="recipe-section"><h2>Notes</h2><ul>{recipe.notes.map((note, i) => <li key={i}>{note}</li>)}</ul></section>}
  </article>;
}
