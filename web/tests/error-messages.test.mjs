import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/error-messages.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { getFriendlyErrorMessage } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("turns network failures into a connection-specific message", () => {
  assert.match(getFriendlyErrorMessage(new TypeError("Failed to fetch")), /internet wandered off/i);
});

test("turns request timeouts into a timeout-specific message", () => {
  assert.match(getFriendlyErrorMessage(new DOMException("The operation timed out", "TimeoutError")), /slow-roasted dinner/i);
});

test("turns rate limits into a kitchen-capacity message", () => {
  assert.match(getFriendlyErrorMessage("Request failed (429)."), /kitchen is swamped/i);
});

test("turns server failures into a recipe-engine message", () => {
  assert.match(getFriendlyErrorMessage("Request failed (503)."), /dropped its spatula/i);
});

test("turns invalid recipe responses into a recipe-specific message", () => {
  assert.match(getFriendlyErrorMessage("The recipe service returned invalid data."), /translator got tangled/i);
});

test("turns missing resources into a link-specific message", () => {
  assert.match(getFriendlyErrorMessage("Request failed (404)."), /hiding behind the fridge/i);
});

test("keeps Pro-tier details while adding a playful prompt", () => {
  const message = getFriendlyErrorMessage("Free accounts can save up to 5 recipes.");
  assert.match(message, /Pro-only pantry/i);
  assert.match(message, /save up to 5 recipes/i);
});

test("turns invalid recipe URLs into a useful hint", () => {
  assert.match(getFriendlyErrorMessage("Please provide a valid recipe URL."), /not quite cookable/i);
});

test("keeps actionable unknown error details with a humorous lead-in", () => {
  assert.equal(
    getFriendlyErrorMessage(new Error("Could not delete your account.")),
    "The kitchen hit a snag: Could not delete your account.",
  );
});
