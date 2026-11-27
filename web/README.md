# Cut The Crap web

Standalone Next.js website. The Expo app in `frontend/` and its current deployment remain unchanged until the website is ready to replace it.

## Local development

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE` to the FastAPI origin. Configure the Stripe price IDs if testing checkout.
2. Run `npm ci` and `npm run dev` from this directory. The site listens on `http://localhost:3000`.
3. Configure the backend's `CORS_ORIGIN` to allow that origin, and start the backend with a reachable database. WorkOS, extraction, and billing require their backend credentials and services.

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` to validate the website.

## Deployment preparation

The included Dockerfile builds the website independently and listens on port 3000. `NEXT_PUBLIC_*` values are compiled into the browser bundle, so pass them as Docker build arguments; never put secrets in them. An empty `NEXT_PUBLIC_API_BASE` uses same-origin `/api` routes, suitable for a reverse proxy that routes `/api` to FastAPI.

For Azure Static Web Apps, set `STATIC_EXPORT=true` when running `npm run build`. The static files are written to `out/`, including directory-style routes and `staticwebapp.config.json`. Without `STATIC_EXPORT=true`, the build retains the standalone output used by the Dockerfile. The static site must use an absolute `NEXT_PUBLIC_API_BASE`; there is no `/api` proxy.

The `.github/workflows/web-deploy.yml` deployment runs checks and Terraform, builds the site, then uploads the static output to the Free Static Web App at `https://ctc-web.deploy-box.com`. It runs on relevant pushes to `main` or manually on `main`. Before enabling a deployment, configure the GitHub `main` environment:

- Set `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` for Azure OIDC. Grant the identity access to the Terraform state container, the target subscription/resource group, the DNS zone, and Static Web App deployment tokens. Terraform's Azure AD state backend uses the manually provisioned `ctctfstateprod` account and `tfstate` container; it requires a storage data-plane role such as Storage Blob Data Contributor, not just subscription Contributor.
- The production price IDs are read from Key Vault as `ctc-prod-stripe-price-pro-monthly` and `ctc-prod-stripe-price-pro-yearly`. They are public in the generated site, not secrets. The backend CD workflow reads the corresponding production Stripe secret key and webhook secret from Key Vault.
- Ensure the pinned reusable Terraform workflow in `Deploy-Box/deploy-box-platform` is accessible to this repository. It uses `terraform/config/backend-main.conf` and `terraform/tfvars/main.tfvars`.

Terraform prepares the `kv-cutthecrap-prod` app vault with RBAC and purge protection; it does not manage Key Vault secret values in Terraform state. Key Vault usage is billed separately. During bootstrap both workflows continue to use `kv-kalebwbishop-apps` for app settings, and the backend always uses it for shared `core-*` VM credentials. The GitHub identity must be able to read whichever vault is in use.

After Terraform creates the new vault, an authorized operator must grant the deployment identity **Key Vault Secrets User** on that vault, copy the production `ctc-*` entries from the old vault (excluding `ctc-dev-*` and `ctc-test-*`), and verify the copies. This requires separate secret-write access for the operator; the deployment identity stays read-only. Do not copy secret values into Terraform, Git, logs, or a public browser variable. Then set the GitHub `main` environment variable `CTC_APP_KEY_VAULT_READY` to `true` and rerun the workflows. Until this switch, or if the original vault denies access, deployment may fail; no silent fallback to the old vault occurs after the switch. Purge protection cannot be disabled after it is enabled.

The workflow builds against `https://cutthecrap.deploy-box.com`. The prepared backend CD change adds the new origin to production CORS only when that backend is next deployed; it does not change the live backend now. The backend's Stripe customer portal return URL remains the existing production frontend, so returning from the portal will currently land on the old site. Verify WorkOS and Stripe configuration and both websites' behavior before directing users to the new domain.

Before switching traffic, verify backend CORS, the WorkOS callback and allowed web origin, Stripe price IDs and return URLs, and the proxy routing for `/api`. Test extraction, sign-in, session refresh, saved recipes, and Stripe against a non-production environment. This app deliberately does not modify the existing deployment or Expo build.

The existing Expo web app uses `auth_access_token` and `auth_refresh_token` in browser local storage; this website uses the same keys to retain existing sessions when served on the same origin. On a different origin, users will need to sign in again.
