import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/api.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { api, clearTokens, parseRecipe, saveTokens } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("normalizes structured and fenced recipe responses", () => {
  const parsed = parseRecipe('```json\n{"is_recipe":true,"title":"Soup","ingredients":["Salt",4],"steps":["Mix",{"instruction":"Cook","ingredients":["Salt",null]},{}]}\n```');
  assert.equal(parsed.isRecipe, true);
  assert.deepEqual(parsed.recipe.ingredients, ["Salt"]);
  assert.deepEqual(parsed.recipe.steps, ["Mix", { instruction: "Cook", ingredients: ["Salt"] }]);
  assert.throws(() => parseRecipe("not json"), /invalid data/);
  assert.throws(() => parseRecipe({ title: "Soup" }), /invalid data/);
});

test("refreshes and retries concurrent unauthorized requests once", async () => {
  const storage = new Map();
  globalThis.localStorage = {
    setItem: (key, value) => storage.set(key, value),
    getItem: (key) => storage.get(key) ?? null,
    removeItem: (key) => storage.delete(key),
  };
  globalThis.window = { dispatchEvent() {} };
  saveTokens("expired", "refresh");
  let refreshes = 0;
  const headers = [];
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/api/v1/auth/refresh")) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json({ accessToken: "new", refreshToken: "rotated" });
    }
    headers.push(options.headers.get("Authorization"));
    return options.headers.get("Authorization") === "Bearer expired"
      ? Response.json({ error: "Expired" }, { status: 401 })
      : Response.json({ ok: true });
  };
  const responses = await Promise.all([api("/api/v1/recipes"), api("/api/v1/recipes/history")]);
  assert.deepEqual(responses, [{ ok: true }, { ok: true }]);
  assert.equal(refreshes, 1);
  assert.equal(storage.get("auth_refresh_token"), "rotated");
  assert.deepEqual(headers, ["Bearer expired", "Bearer expired", "Bearer new", "Bearer new"]);
  clearTokens();
});
