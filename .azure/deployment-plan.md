# Azure deployment plan

Status: Ready for Validation

## Target

- Subscription: `deploy-box-sub-prod`
- Subscription ID: `3d5d1ab2-b17f-4c99-9bf1-db4fe0ad882e`
- Static Web App: `swa-cutthecrap-web-prod`, Free tier, `eastus2`
- New resource group: `rg-cutthecrap-web-prod`
- Website: `ctc-web.deploy-box.com`
- Backend: `https://cutthecrap.deploy-box.com`
- DNS: existing `deploy-box.com` Azure DNS zone in `deploy-box-rg-prod`
- Terraform state: existing `deployboxsaprod` / `deploy-box-iac-storage`, separate key `cut-the-crap/terraform.tfstate`
- Existing production site: unchanged
- Deployment: future GitHub Actions only; no local apply or deployment

## Work

- [x] Inspect Hazard Hero's Terraform, deployment workflow, and DNS pattern.
- [x] Prepare AzureRM Terraform for the resource group, Free Static Web App, CNAME, and custom domain.
- [x] Add a static export build and GitHub Actions workflow following Hazard Hero's OIDC/token deployment pattern.
- [x] Prepare the approved additive production backend CORS configuration.
- [x] Run local Terraform, Compose, workflow YAML, and web build checks; leave deployment to GitHub Actions.

## Risks

- The backend must allow the new website origin through CORS.
- `NEXT_PUBLIC_*` values are compiled into the static export.
- The backend status endpoint returned an empty response from this machine; extraction, auth, and billing cannot currently be verified live.
- GitHub Actions needs Azure OIDC variables and access to the state backend and Static Web App deployment token.
- The GitHub `main` environment also needs both public Stripe price IDs. The deployment workflow runs on relevant pushes to `main` and on manual dispatch.
- The existing Stripe customer portal returns users to the old production frontend.
- The CORS update takes effect only after a future backend deployment.
- Terraform validation was local only; a remote-state plan and live deployment were not run.

## Validation checks

- [x] Terraform format and `validate` with backend disabled.
- [x] Static export, standalone build, lint, type-check, and website tests.
- [x] Compose CORS default and production override; workflow YAML parses.
- [ ] Terraform remote backend access, plan, and state inspection using the production GitHub OIDC identity.
- [ ] Confirm GitHub OIDC federation and permissions for state, resource group, DNS, and deployment token.
- [ ] Verify custom domain, API, WorkOS, and Stripe flows after the future deployment.

## Validation proof

- `terraform -chdir=terraform init -backend=false -input=false`, `terraform -chdir=terraform fmt -check -recursive`, and `terraform -chdir=terraform validate` succeeded with Terraform 1.12.2 and AzureRM 5.15.0. GitHub Actions uses Terraform 1.16.x.
- `STATIC_EXPORT=true npm run build` produced the static routes, including `auth/index.html` and `result/index.html`; a normal `npm run build` produced the standalone server. Both use Node 22; the Dockerfile also uses Node 22 in both stages.
- Website lint, type-check, and two tests passed. `docker compose config --no-env-resolution` confirmed the original default origin, production override, and development origin.
- Azure reports `East US 2` as a supported Static Web App location. The preflight script was not run: it selects the global Azure subscription if given one and does not use this repository's backend config or tfvars. The remote plan and identity permissions remain unverified.
- The `ctc-web` hostname has no existing DNS records. The subscription currently has two Free Static Web Apps; Microsoft documents a limit of 10 per subscription.
- Azure resource creation, DNS updates, and frontend deployment are deferred to a future GitHub Actions run.
