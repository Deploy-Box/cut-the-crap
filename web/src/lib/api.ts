import type { Recipe, SavedRecipeDetail } from "./types";

const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000").replace(/\/$/, "");
const ACCESS_KEY = "auth_access_token";
const REFRESH_KEY = "auth_refresh_token";
let refreshInFlight: Promise<string> | null = null;

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

function messageFromBody(body: unknown): { message?: string; code?: string } {
  if (!body || typeof body !== "object") return {};
  const data = body as Record<string, unknown>;
  if (typeof data.error === "object" && data.error !== null) {
    const error = data.error as Record<string, unknown>;
    return {
      message: typeof error.message === "string" ? error.message : undefined,
      code: typeof error.code === "string" ? error.code : undefined,
    };
  }
  return {
    message: typeof data.message === "string" ? data.message :
      typeof data.detail === "string" ? data.detail :
      typeof data.error === "string" ? data.error : undefined,
  };
}

export function saveTokens(accessToken: string, refreshToken?: string | null) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function hasRefreshToken() {
  return !!localStorage.getItem(REFRESH_KEY);
}

async function rawRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const token = localStorage.getItem(ACCESS_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(60000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = messageFromBody(body);
    throw new ApiError(error.message ?? `Request failed (${response.status}).`, response.status, error.code);
  }
  return body as T;
}

export async function refreshSession(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) throw new ApiError("Please sign in again.", 401);
      const tokens = await rawRequest<{ accessToken: string; refreshToken?: string }>("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      saveTokens(tokens.accessToken, tokens.refreshToken ?? refreshToken);
      return tokens.accessToken;
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || path.startsWith("/api/v1/auth/") || !hasRefreshToken()) throw error;
    try {
      await refreshSession();
    } catch (refreshError) {
      clearTokens();
      window.dispatchEvent(new Event("auth-expired"));
      throw refreshError;
    }
    return rawRequest<T>(path, options);
  }
}

export function post<T>(path: string, data: unknown): Promise<T> {
  return api<T>(path, { method: "POST", body: JSON.stringify(data) });
}

export function recipePayload(recipe: Recipe, sourceUrl?: string) {
  return {
    title: recipe.title, description: recipe.description, sourceUrl,
    prepTime: recipe.prep_time, cookTime: recipe.cook_time, coolTime: recipe.cool_time,
    chillTime: recipe.chill_time, restTime: recipe.rest_time, marinateTime: recipe.marinate_time,
    soakTime: recipe.soak_time, totalTime: recipe.total_time, servings: recipe.servings,
    ingredients: recipe.ingredients, steps: recipe.steps, notes: recipe.notes ?? [],
  };
}

export function fromSavedRecipe(r: SavedRecipeDetail): Recipe {
  return {
    title: r.title, description: r.description, prep_time: r.prepTime, cook_time: r.cookTime,
    cool_time: r.coolTime, chill_time: r.chillTime, rest_time: r.restTime,
    marinate_time: r.marinateTime, soak_time: r.soakTime, total_time: r.totalTime,
    servings: r.servings, ingredients: r.ingredients, steps: r.steps, notes: r.notes,
  };
}

export function parseRecipe(data: unknown): { isRecipe: boolean; recipe: Recipe } {
  let value = data;
  if (typeof value === "string") {
    try { value = JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); }
    catch { throw new Error("The recipe service returned invalid data."); }
  }
  if (!value || typeof value !== "object") throw new Error("The recipe service returned invalid data.");
  const raw = value as Record<string, unknown>;
  if (typeof raw.is_recipe !== "boolean" || typeof raw.title !== "string") throw new Error("The recipe service returned invalid data.");
  const strings = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const steps = Array.isArray(raw.steps) ? raw.steps.flatMap((step): Recipe["steps"] => {
    if (typeof step === "string") return step.trim() ? [step] : [];
    if (step && typeof step === "object" && typeof step.instruction === "string") {
      return [{ instruction: step.instruction, ingredients: strings(step.ingredients) }];
    }
    return [];
  }) : [];
  const text = (key: string) => typeof raw[key] === "string" ? raw[key] as string : undefined;
  return {
    isRecipe: raw.is_recipe,
    recipe: {
      title: raw.title, description: text("description"), prep_time: text("prep_time"),
      cook_time: text("cook_time"), cool_time: text("cool_time"), chill_time: text("chill_time"),
      rest_time: text("rest_time"), marinate_time: text("marinate_time"), soak_time: text("soak_time"),
      total_time: text("total_time"), servings: text("servings"), ingredients: strings(raw.ingredients),
      steps, notes: strings(raw.notes),
    },
  };
}
