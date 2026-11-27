export function getFriendlyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();

  if (/failed to fetch|fetch failed|networkerror|network request failed|load failed/.test(normalized)) {
    return "The internet wandered off to forage. Check your connection and try again.";
  }
  if (/timeout|timed out|aborterror|aborted/.test(normalized)) {
    return "This is taking longer than a slow-roasted dinner. Give it another try.";
  }
  if (/\b429\b|rate.?limit|too many requests/.test(normalized)) {
    return "The kitchen is swamped. Give us a minute, then try again.";
  }
  if (/\b5\d{2}\b|internal server error|server error|service unavailable/.test(normalized)) {
    return "Our recipe engine dropped its spatula. Try again in a bit.";
  }
  if (/\b401\b|unauthorized|not authenticated|session expired/.test(normalized)) {
    return "Your sign-in wandered off. Log in again and we'll get back to the recipe.";
  }
  if (/free accounts|upgrade to pro|pro feature/.test(normalized)) {
    return `This kitchen has a Pro-only pantry: ${message}`;
  }
  if (/\b403\b|forbidden/.test(normalized)) {
    return `That kitchen door is locked: ${message}`;
  }
  if (/invalid data|malformed|could not parse|unexpected token/.test(normalized)) {
    return "Our recipe translator got tangled in its apron. Try that link again.";
  }
  if (/valid (http|recipe) url|invalid url/.test(normalized)) {
    return "That link is not quite cookable. Try a full http:// or https:// recipe URL.";
  }
  if (/not a recipe|isn't a recipe|is not a recipe/.test(normalized)) {
    return "That page is all preamble and no recipe. Try another link.";
  }
  if (/not configured/.test(normalized)) {
    return "That plan hasn't made it onto the menu yet. Please try again later.";
  }
  if (/\b404\b|not found|doesn't exist/.test(normalized)) {
    return "We couldn't find it. It may be hiding behind the fridge. Check the link and try again.";
  }
  if (/sign.?in|log.?in/.test(normalized)) {
    return "The sign-in gremlins are at it again. Please try logging in once more.";
  }
  if (message) return `The kitchen hit a snag: ${message}`;
  return "Something went sideways in the kitchen. Try again.";
}
