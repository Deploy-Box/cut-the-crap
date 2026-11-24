# Cut The Crap

Paste a recipe URL, get just the recipe — no life stories, no ads, no pop-ups.

## Project Structure

```
frontend/      – Expo mobile app and current web deployment
web/           – standalone Next.js website (prepared alongside the current deployment)
backend/       – FastAPI application
database/      – PostgreSQL migrations and scripts
```

For the standalone website, see [`web/README.md`](./web/README.md).

## Mobile App (Expo)

### Prerequisites

- Node.js ≥ 20
- A running FastAPI backend, locally or deployed

### Getting started

```bash
cd frontend
npm install
```

Copy `frontend/.env.example` to `frontend/.env` and set the backend URL:

```
EXPO_PUBLIC_API_BASE=http://localhost:8000
```

> **Tip:** On a physical device use your machine's LAN IP instead of `localhost`.

### Running

```bash
npx expo start          # starts the Expo dev server
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
npx expo start --web    # legacy Expo web build during migration
```

Use an Expo development build for native modules such as in-app purchases.

## Legal & Compliance

Cut The Crap operates in a defensible legal position. A full analysis is available in [`LEGAL_FINDINGS.md`](./LEGAL_FINDINGS.md). Key points:

- **Recipe facts are not copyrightable.** Ingredient lists and basic cooking instructions are factual/functional data excluded from copyright protection under U.S. law (17 U.S.C. § 102(b)).
- **AI rewriting creates transformative output.** The system prompt instructs OpenAI to rephrase all text — no verbatim copying from source pages.
- **robots.txt compliance.** The scraper checks and respects `robots.txt` disallow directives before fetching any page, with a 1-hour cache per domain.
- **Honest User-Agent.** Requests identify as `CutTheCrap/1.0 (Recipe Extraction)` — no browser spoofing.
- **Source attribution.** Every saved recipe stores and displays the original `source_url` as a tappable link.
- **OpenAI API compliance.** Sending publicly available, primarily uncopyrightable recipe content for transformation aligns with OpenAI's current Terms of Use and Usage Policies. See [`LEGAL_FINDINGS.md` § 4](./LEGAL_FINDINGS.md#4-terms-of-service-violations) for the full analysis.
- **DMCA process.** Content owners can request recipe removal via the contact information in the app's Terms of Service.

This is not legal advice. Consult a qualified attorney for formal guidance.
