# Azure deployment plan

Status: Ready for Validation

## Target

- Subscription: `deploy-box-sub-prod`
- Subscription ID: `3d5d1ab2-b17f-4c99-9bf1-db4fe0ad882e`
- Static Web App: `swa-cutthecrap-web-prod`, Free tier, `eastus2`
- Existing resource group: `rg-cutthecrap-prod`
- Website: `ctc-web.deploy-box.com`
- Backend: `https://cutthecrap.deploy-box.com`
- DNS: existing `deploy-box.com` Azure DNS zone in `deploy-box-rg-prod`
- Terraform state: `ctctfstateprod` / `tfstate`, key `cut-the-crap/terraform.tfstate`
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
- The GitHub `main` environment needs Azure OIDC variables. Stripe price IDs are read from Key Vault and compiled into the public static site. The deployment workflow runs on relevant pushes to `main` and on manual dispatch.
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

## Key Vault extension

Status: Ready for Validation

- Subscription `deploy-box-sub-prod`, resource group `rg-cutthecrap-prod`, region `eastus2`.
- Create a dedicated Standard Key Vault with Azure RBAC, soft delete and purge protection. After creation, an authorized operator grants the deployment identity secret-read access at vault scope; the deployment identity remains read-only. Key Vault incurs usage charges.
- Keep shared `core-*` VM credentials in `kv-kalebwbishop-apps`. Move application `ctc-*` credentials to the new vault only after they have been populated; preserve existing production behavior during bootstrap.
- Read production Stripe credentials from Key Vault for the backend. Stripe price IDs are public browser configuration, not confidential secrets, even if retrieved from Key Vault.
- Do not put secret values in Terraform state, Git, logs, or the plan. Secret population requires a separate controlled migration; vault provisioning alone does not populate it.
- Order the website workflow to create infrastructure before fetching values from the new vault, without creating a circular first-deployment dependency. Missing required values must fail clearly.
- Validate the Terraform and workflow changes locally; deploy through GitHub Actions only.
- Migration choice: copy existing app secrets after the new vault is created; do not copy shared `core-*` or development-only entries.
- The shared deployment identity has subscription Contributor and now has Storage Blob Data Contributor on the existing state container, plus secret-scoped read access to the 20 legacy secrets needed by these workflows.
- The identity's GitHub OIDC trust does not include this repository. Adding that trust would expose the identity's subscription-wide Contributor access; the user chose not to add it.
- `CTC_APP_KEY_VAULT_READY=true` in the GitHub `main` environment switches app settings to the new vault only after migration; shared `core-*` settings remain in the old vault.
- The new vault has not been created, so the approved operator grant and secret copy have not yet been performed.
- Local checks passed: Terraform formatting and provider validation; web lint, type-check, tests, and static build; workflow YAML and shell syntax; mocked valid and invalid Stripe price retrieval.

## Dedicated Terraform state storage

Status: Completed; application deployment remains pending

- The user-created `rg-cutthecrap-prod` is in East US, subscription `deploy-box-sub-prod`. Terraform will reference it as an existing data source rather than attempting to create or destroy it; the Static Web App and Key Vault retain their selected East US 2 location.
- Create the globally available `ctctfstateprod` StorageV2 account in East US using Standard LRS, TLS 1.2, HTTPS, no anonymous blob access, and Azure AD authorization rather than account keys. Enable blob versioning and 30-day soft delete; storage and operations are billable.
- Create a private `tfstate` blob container. Grant the signed-in operator and the existing GitHub deployment identity Storage Blob Data Contributor at container scope only. The identity still lacks OIDC trust for this repository; no trust changes are included.
- Update the backend configuration to use the new account and container. The old backend has no Cut The Crap state blob, so no state migration is required.
- Verify the resource settings, role assignments, backend configuration and Terraform validation. Do not deploy the website or migrate secrets.
- Created and verified `ctctfstateprod` and `tfstate`; both approved container-scoped role assignments exist. The signed-in operator successfully listed blobs through Entra ID and initialized the AzureRM backend. Terraform validation passed.
- The previous shared-container role assignment has not been removed. GitHub OIDC trust for this repository remains unresolved.
- The `ctc-web` hostname has no existing DNS records. The subscription currently has two Free Static Web Apps; Microsoft documents a limit of 10 per subscription.
- Azure resource creation, DNS updates, and frontend deployment are deferred to a future GitHub Actions run.
