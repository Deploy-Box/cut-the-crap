# Azure Deployment Plan

> **Status:** Validated
>
> The first GitHub deployment used the production-named OIDC identity and failed at Terraform apply for lack of Azure RBAC. A dedicated dev OIDC app now has the approved dev-RG, state-container, and secret-scoped roles. Update the GitHub `dev` environment's `AZURE_CLIENT_ID` to `ab8b8da9-7819-4916-a56e-f5488a97c09e`; the current GitHub CLI identity cannot inspect or edit environment settings (HTTP 403).

Generated: 2026-11-24

## 1. Project Overview

**Goal:** Prepare a separate Azure development deployment from the current `main` code, in `rg-cutthecrap-dev`, without changing production resources or data.

**Path:** Add components to an existing application.

The local `dev` branch already points to the same commit as `origin/main` (`f38b729`). `origin/dev` is 13 commits behind. The user asked not to push yet because doing so currently triggers the legacy shared-VM dev deployment. No push is included in this plan until the Azure dev workflow is ready and the user approves that cutover.

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Development |
| Scale | Small |
| Budget | Cost-optimized; usage-based charges remain possible |
| Subscription | `deploy-box-sub-prod` (`3d5d1ab2-b17f-4c99-9bf1-db4fe0ad882e`), confirmed |
| Location | East US 2 (`eastus2`), confirmed |
| Compliance | No additional requirements |
| Data | Reuse the existing dev-only `cutthecrap_dev` database and dev credentials; do not use production data or secrets |

Subscription policy check found only the built-in Microsoft Defender for Cloud assignment. No policy assignments are scoped directly to the user-created `rg-cutthecrap-dev` resource group.

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| Website | Frontend | Next.js static export, Node 22 | `web/` |
| API | Backend | FastAPI, Python 3.12 on Azure Functions | `backend/` |
| Infrastructure | IaC | AzureRM Terraform | `terraform/` |
| Deployment | CI/CD | GitHub Actions + OIDC | `.github/workflows/` |
| Database | Relational | Existing Azure PostgreSQL; dev database only | External shared service |

## 4. Recipe Selection

**Selected:** Terraform with the repository's existing GitHub Actions deployment pipeline.

**Rationale:** Existing Azure resources are managed with Terraform and the production pipeline uses a pinned reusable Terraform workflow. Dev must use a distinct state key; it must never plan against the production state.

## 5. Architecture

**Stack:** Static Web Apps + Azure Functions Flex Consumption.

| Component | Azure Service | Proposed configuration |
|-----------|---------------|------------------------|
| Resource group | `Microsoft.Resources/resourceGroups` | Existing user-created `rg-cutthecrap-dev` (East US); Terraform reads it as a data source |
| Website | Static Web Apps | Free tier, `swa-cutthecrap-web-dev` |
| API | Functions Flex Consumption | FC1, `func-cutthecrap-api-dev`, max 2 instances at 2,048 MB |
| Function storage | Storage account | Standard LRS, private package container, managed-identity auth |
| Terraform state | Storage account + blob container | `ctctfdevstate` / `tfstate`, East US 2, Standard LRS, private, HTTPS/TLS 1.2, shared-key auth disabled, versioning and 30-day soft delete |
| API identity | User-assigned managed identity | Dev-only resource and Key Vault access |
| Secrets | Key Vault | Standard; dev-only secrets, no production or shared `core-*` secrets |
| Monitoring | Application Insights + Log Analytics | Workspace-based; 30-day minimum retention |
| Database | Existing PostgreSQL server | Existing `cutthecrap_dev` database only; no server or firewall changes |

The website will use `https://ctc-dev.deploy-box.com`. The API will use `https://ctc-dev-api.deploy-box.com`; the existing `ctc-dev` A record currently points to `4.227.206.218`, and no `ctc-dev-api` DNS record exists. After the dev deployment is healthy, cut over only these dev hostnames, update the dev WorkOS callback to the API hostname, and verify CORS/authentication. Keep the existing VM and shared infrastructure available for rollback; do not delete them.

The user-created resource group is in East US; workload resources remain in East US 2. Terraform reads the existing group instead of attempting to create or replace it. A dedicated state account, `ctctfdevstate`, and private `tfstate` container were created by Azure CLI in that group on 2026-11-25. Dev state uses the isolated key `cut-the-crap/terraform-dev.tfstate`; the old production state account is no longer used by dev.

The current dev workflow deploys to the shared VM and is triggered by pushes to `dev`. Before any push, prepare the Azure dev workflow and ensure the old dev job cannot race or overwrite the Azure cutover. No production workflow, DNS, database, or resources are in scope.

## 6. Provisioning Limit Checklist

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|-----------------|------------------------|-------------|-------|
| `Microsoft.Resources/resourceGroups` | 0 | 1 existing dev group | No dedicated regional quota reported | Created by the user in East US; Terraform reads it as existing |
| Static Web Apps (Free) | 1 | 4 subscription apps | 10 apps | Azure lists 3 existing; Microsoft Learn Free-tier limit |
| Functions Flex Consumption | 1 app, max 2 x 2,048 MB | 42 max instances / 86,016 MB | 250 cores / 512,000 MB per subscription/region | One existing East US 2 app is capped at 40 x 2,048 MB; new cap adds 2 cores. [Microsoft Learn](https://learn.microsoft.com/azure/azure-functions/flex-consumption-plan) |
| `Microsoft.Storage/storageAccounts` | 1 Function account | 5 in East US 2 | 250 | 3 pre-existing plus `ctctfdevstate`; 246 remain before and 245 after the Function account is created |
| Key Vault Standard | 1 | 7 subscription vaults | No resource-count quota returned by `az quota`; service limits are transaction-based | `az quota list` returned no Key Vault regional quotas |
| Log Analytics workspace | 1 | 11 subscription workspaces | No fixed count cap for the proposed PerGB2018 tier | Azure Monitor docs: legacy Free tier is capped at 10; other tiers have no workspace-count cap |
| Application Insights | 1 | 1 new dev component | No applicable regional count quota returned | Workspace-based; usage charges depend on ingestion |

**Capacity result:** Within documented limits. The Flex cap is 42 cores total versus the 250-core regional default. Storage quota has 247 accounts available. Azure lists 3 Static Web Apps, leaving room under the Free-tier 10-app limit. Microsoft.Quota returned no Key Vault or Log Analytics regional quota entries; documented service limits were checked instead. Provisioning can still be denied by live platform capacity or policy.

## 7. Validation Proof and Execution Checklist

### Phase 1: Planning
- [x] Analyze workspace, Terraform configuration, deployment workflows, and current Azure context.
- [x] Confirm Development / Small / Cost-optimized requirements, subscription, and region.
- [x] Scan application and infrastructure components.
- [x] Check subscription policy assignments and provisioning capacity.
- [x] Select Terraform and plan isolated dev resources/state.
- [x] User approved this plan on 2026-11-24.

### Phase 2: Execution (only after approval)
- [x] Prepare dev-specific Terraform configuration and a separate state key.
- [ ] Update the GitHub `dev` environment to use the dedicated dev OIDC app.
- [x] Grant least-privilege roles to the dedicated identity on the dev resource group, state container, and required source secrets.
- [ ] Prepare dev-only secret references and verify the `cutthecrap_dev` database connection without exposing secret values.
- [ ] Prepare dev web/API hostnames, WorkOS callback, and CORS configuration.
- [x] Prepare a safe transition from the legacy dev workflow; preserve the legacy VM for rollback.
- [x] Run local Terraform, application, and workflow checks; no remote push or production apply.
- [x] Update plan to `Ready for Validation`, then invoke `azure-validate`.
- [ ] Deploy only after validation and user approval, using the approved dev deployment path.
- [ ] Verify dev health, auth, extraction, hostname routing, and rollback path.

### All validation checks pass
- [x] Terraform and Azure CLI are installed.
- [x] Azure authentication and target subscription are confirmed.
- [x] Terraform initializes against the new dedicated dev backend.
- [x] Terraform formatting check passes after the backend/resource-group updates.
- [x] Terraform configuration validation passes after the backend/resource-group updates.
- [x] Terraform plan uses only `tfvars/dev.tfvars` and the new dev state account/key.
- [x] Terraform state access is verified; the new state container is currently empty.
- [x] No unresolved Go-style template variables are present.
- [x] No applicable `main.tfvars.json` file exists.
- [x] Website lint, type-check, tests, and static build pass.
- [x] Node.js build/runtime requirements are supported by the selected Azure service.

### Role Assignment Verification
- Status: Verified with Azure role-assignment queries for the dedicated dev identity
- Identities checked: Function user-assigned managed identity; dedicated dev OIDC app `cut-the-crap-github-dev-oidc`
- Roles confirmed: Contributor and Role Based Access Control Administrator on `rg-cutthecrap-dev`; Storage Blob Data Contributor on only `ctctfdevstate/tfstate`; Key Vault Secrets User on only the eight required source-secret scopes. Existing Function identity role assignments were also statically reviewed.
- Production permission comparison: Dev equivalents are already assigned; production-only DNS, vault, state, Stripe/TLS, legacy-VM, and subscription-scope reader grants were not copied.
- Issues: GitHub `dev` must use the dedicated app ID listed above; environment variables are not readable to the current GitHub CLI identity. Temporary CLI-user state grants were removed and their removal verified.

### Validation Proof
- Previous backend validation used the old state account and the then-current `create_resource_group=true` configuration. It is superseded by the new backend and existing-resource-group configuration; rerun validation before retrying deployment.
- Terraform 1.12.2 `fmt -check -recursive` and `validate` passed using an isolated local data directory with backend initialization disabled.
- On 2026-11-25 at approximately 14:40 EST, Terraform remote init, format, validation, state list, and plan passed against `ctctfdevstate/tfstate` and `tfvars/dev.tfvars`. The state was empty; the plan proposed 15 additions, zero changes, and zero destroys. The recipe preflight passed using a session-only correction for its PowerShell `$Args` collision and explicit dev backend and tfvars.
- Earlier local state access probes incorrectly reported propagation failure because Windows `az.cmd` rejected the unquoted `length(@)` query. A corrected probe succeeded using a user-approved temporary account-scoped grant, which was removed and verified.
- Node 22.16.0 website lint, type-check, tests (2 passed), and `STATIC_EXPORT=true npm run build` passed; generated output contains `https://func-cutthecrap-api-dev.azurewebsites.net`.
- Azure CLI authentication/subscription and target-name checks passed. The new state account/container exists, and the dedicated CI identity has its container role, but GitHub's `AZURE_CLIENT_ID` could not be verified (HTTP 403).
- Static RBAC review confirmed the Function identity's storage, Key Vault, and monitoring roles and the deployment identity's dev-vault secret-seeding role.
- The supplied PowerShell preflight script has an `$Args` parameter collision and passed no Terraform subcommands; equivalent commands passed when invoked directly with explicit argument arrays.

## 8. Validation Proof

The user approved 30-day retention on 2026-11-24 after the provider rejected the proposed 7-day setting. A first speculative plan read the existing production state and proposed 12 destroys; nothing was applied. All subsequent dev validation used a distinct Terraform data directory and the `cut-the-crap/terraform-dev.tfstate` key.

| Check | Command / source | Result |
|-------|-----------------|--------|
| Azure subscription and policy | `az account show`; `az policy assignment list` | Subscription enabled; built-in Defender assignment only |
| Web plan quota | `azure-quotas` script, `Microsoft.Web`, East US 2 | Y1 limit 30 / usage 0; Flex FC1 not listed in this quota response |
| Storage quota | `azure-quotas` script plus new state account, `Microsoft.Storage`, East US 2 | Limit 250 / usage 4 / available 246; planned Function storage leaves 245 |
| Flex capacity | Azure Function configuration + Microsoft Learn | Existing cap 40 x 2,048 MB; proposed cap adds 2 x 2,048 MB; total 42 / 250 cores |
| Existing resources | Azure CLI resource listings | 3 Static Web Apps, 6 Function Apps, 13 Storage Accounts, 6 Key Vaults, 10 Log Analytics workspaces |
| Target names | Azure resource group and DNS reads | `rg-cutthecrap-dev` exists in East US; `ctc-dev` A record exists; `ctc-dev-api` absent |
| Application Insights name | `az resource list --resource-type Microsoft.Insights/components` | `appi-cutthecrap-api-dev` is available |
| Dev backend | `terraform init -reconfigure -backend-config=config/backend-dev.conf`; `terraform state list` | Initialized with the dedicated dev backend; state contains no managed resources |
| Terraform checks | Terraform 1.12.2, AzureRM 5.15.0, AzAPI 2.14.0; `terraform plan -var-file=tfvars/dev.tfvars` | Format and validate passed; plan: 15 additions, 0 changes, 0 destroys |
| Website quality/build | Node 22.16.0; `npm run lint`, `npm run typecheck`, `npm test`, `STATIC_EXPORT=true npm run build` in `web/` | All passed; 2 tests passed; static output contains the dev API URL and has no Node server runtime |
| Deployment identity | GitHub Actions run 45640301595; Azure role assignment query | First run used the production-named identity and failed for missing Azure RBAC. Dedicated dev app/federation now has 11 approved assignments; GitHub `AZURE_CLIENT_ID` still needs verification/update |

The supplied Terraform preflight script was attempted but its helper declares a parameter named `$Args`, which resolves to PowerShell's automatic argument variable and causes Terraform to receive no subcommand. Equivalent Terraform commands were run directly with explicit argument arrays and all applicable checks passed for the previous configuration. No application resources or DNS records have been created or changed.

**Deployment attempt (2026-11-25):** GitHub Actions run 45640301595 passed backend and frontend quality checks, Azure OIDC login, Terraform initialization, and planning. Apply failed with `AuthorizationFailed`; the production-named identity only had `Cut The Crap Web Location Status Reader`. No application resources or DNS records were created. The user subsequently created `rg-cutthecrap-dev` in East US and requested a dedicated state account. Azure CLI created `ctctfdevstate` and its private container in East US 2. The old state account remains untouched.

**Second deployment attempt (2026-11-25):** GitHub Actions run 45677226329 used commit `356e201`, which still configures the production state account for dev. OIDC login succeeded, but Terraform initialization received `AuthorizationPermissionMismatch`; planning and apply did not run. The dedicated dev backend and existing-resource-group changes remain local and unpushed.

**Deployment readiness:** Local remote-backend validation passed. GitHub `dev` `AZURE_CLIENT_ID` remains unreadable to the current CLI identity and must point to the dedicated dev app; live OIDC data-plane access remains to be verified in the deployment workflow.

## 9. Files to Generate

| File | Purpose |
|------|---------|
| `terraform/` dev configuration and backend config | Isolated dev resource group and state |
| `.github/workflows/` | Dev deployment path; avoid legacy workflow race |
| `backend/` and `web/` configuration as needed | Dev API origin, CORS, and hostname settings |
| `.azure/deployment-plan.md` | Current plan and later validation/deployment evidence |

## 10. Next Steps

> Current: The dedicated state account and user-created resource group exist; dev identity RBAC is configured and the remote dev plan passed. GitHub's configured client ID cannot be inspected by the current CLI identity.

1. Update GitHub `dev` `AZURE_CLIENT_ID` to the dedicated dev app.
2. Verify the dedicated identity through the deployment workflow and deploy; keep custom-domain cutover disabled until the API and website are deployed and verified.

---

## Historical production plan record

The following sections preserve the previously validated production plan and deployment history. They are context only and are not approval to modify production.

## Legacy cutover planning

- Retire Cut The Crap-specific legacy production, dev, and test deployments only; preserve shared infrastructure and PostgreSQL.
- Adopt `cutthecrap.deploy-box.com` as the new API hostname; preserve compatibility for installed mobile clients.
- The legacy DNS A record points to the deallocated shared VM. The Function is healthy but only exposes health and status in preview mode. The website and legacy mobile builds may already use the chosen hostname.
- The Functions ASGI adapter does not provide a client address; existing in-process, per-IP limits are not reliable on Functions. The user explicitly deferred rate limiting until later. Preserve the existing limiter without treating it as effective production protection; do not trust unverified forwarding headers. This creates a known abuse and cost risk.
- Verify custom-domain ownership, TLS, WorkOS callbacks, billing webhooks, extraction, authentication, PostgreSQL connection budgets, and client compatibility before DNS cutover. Preserve rollback until verified.
- Retire the old VM workflow and app-specific dev/test components only after verifying the replacement; separately confirm each destructive operation. Preserve the shared VM, networking, registry, vault, and database server.
- Deploy infrastructure through GitHub Actions only. Obtain resource-specific confirmation before destructive changes.
- First increment: configure the retained WorkOS callback, add a DNS ownership TXT record, and limit each Functions worker's database pool to five connections while retaining preview mode. The 40-instance HTTP scale ceiling and one default Python worker imply up to 200 application pool connections against the shared server's 429-connection limit; other workloads and worker-count overrides still require monitoring.
- URL and robots.txt fetching now resolves and pins public addresses per request, including redirects, while retaining the original HTTPS hostname for certificate verification. Public cutover remains blocked until this is deployed and verified.
- Automated checks for this increment: 188 backend tests passed and Terraform configuration validated. Public hostname, TLS, end-to-end integrations, and retirement remain subsequent increments.
- GitHub Actions run 45466228027 deployed the restricted increment successfully. Function health returned 200, protected routes returned 503, and Azure DNS contains the ownership TXT record.
- Next increment: bind the existing API hostname to the Function using the TXT record without changing its current A record. Terraform plans one addition and no changes or deletions. The existing legacy certificate expired on 2026-07-06; managed certificate issuance and DNS cutover remain separate.
- The hostname binding has been provisioned. The user approved replacing the specific legacy A record and a temporary HTTPS gap, because Azure's managed certificate can only be issued after DNS is remapped.
- Release increment: enable the existing API routes on the Function hostname and import the unchanged legacy A record into Terraform state. Verify extraction and auth against the Azure hostname before removing or replacing that A record.
- GitHub Actions run 45469206085 enabled the API and imported the A record. A subsequent review found an arbitrary OAuth callback redirect; the user approved restricting redirects to the configured website and `cutthecrap://auth`. The deployment cancellation attempt returned GitHub HTTP 403, so the Function remains publicly reachable while the fix is deployed.
- The authentication fix rejects untrusted redirect destinations both at login and callback, defaults to the website's `/auth` route, and stops logging authorization codes. The backend suite passes 195 tests.
- The shared extraction proxy returns HTTP 500 for structured output with `gpt-5.4-nano`; the user chose `gpt-4o-mini`, which successfully extracted a real recipe through the deployed Function. The 196-test backend suite passed and GitHub Actions run 45474419289 deployed the fix.
- DNS transition first removes only the imported `cutthecrap` A record pointing to the deallocated VM. The following deployment creates a CNAME to the Function, then provisions and binds a site-scoped managed certificate. DNS resolution and HTTPS will be unavailable between these steps and until Azure completes issuance and propagation. The user approved replacing this specific record and the temporary HTTPS gap. Shared infrastructure and PostgreSQL are untouched.
- The CNAME targets the Function's Azure-provided hostname. A site-scoped App Service managed certificate is requested after the CNAME and existing hostname binding, then bound with SNI. Issuance depends on public DNS propagation.
- GitHub Actions run 45478677705 created the CNAME, issued and bound the certificate, and deployed successfully. Health, authentication guards, and real recipe extraction work over the custom HTTPS hostname. A real browser then reproduced a failed extraction because the Functions host answered preflight requests without CORS headers. Configure platform CORS for the two existing allowed origins and disable application CORS only when that platform setting is enabled; retain application CORS elsewhere.
- GitHub Actions run 45481391669 deployed the CORS fix. Browser extraction succeeded from the website; approved-origin preflights return CORS headers and an unapproved origin receives none. Health returns 200, protected routes return 401, and invalid Stripe signatures return 400.
- The configured Stripe secret was rejected with HTTP 401. The user deferred billing and complete WorkOS sign-in verification. The WorkOS sign-in page opens, but login, authenticated saves, checkout, real webhooks, and mobile purchases remain unverified. Do not retire legacy deployments until the remaining verification and resource-specific confirmations are complete.

### Cutover increment validation

- [x] All validation checks pass:
  - [x] Terraform and Azure CLI installed; Azure authentication and target subscription confirmed.
  - [x] Terraform init, format, validation, plan, and state access.
  - [x] Template-variable scan and applicable tfvars syntax checks.
  - [x] Azure policy and static RBAC review.
  - [x] Application build and tests.
  - [x] Node runtime support checked for the deployed website.

### Section 7: Validation Proof

- The CORS increment's production Terraform plan changes the Function in place and refreshes the dependent DNS values; no resources are added or destroyed. Python 3.12 backend tests passed (198), including application/platform CORS ownership. Website checks passed in run 45478677705; no website code changed.
- On 2026-11-24, after GitHub Actions removed the A record, the production Terraform plan for the CNAME and TLS increment showed three additions (CNAME, site-scoped certificate, SNI binding), no changes, and no deletions. The Terraform preflight passed init, formatting, validation, plan, state access, and template checks using the commands below. The existing GitHub Actions build and 196 backend tests passed; the increment changes no application code or role assignments.
- On 2026-11-24, the production Terraform plan for the first DNS increment showed exactly one destruction: the approved `cutthecrap` A record; no additions or other changes. The Terraform preflight passed init, formatting, validation, remote plan, state access, and template checks. Applicable policy assignments were checked; the MFA delete policy targets user identities, not the deployment service principal.
- Commands: `terraform -chdir=terraform plan -input=false -var-file=tfvars/main.tfvars -no-color`; session preflight `validate-terraform-corrected.ps1 -InfraDir <workspace>/terraform` with `TF_CLI_ARGS_plan` selecting `tfvars/main.tfvars`; `python -m pytest -q` in the Python 3.12 backend environment; `az policy assignment list` at the production resource-group scope.
- The website is a static export built using Node 22; the Function runs Python 3.12. Backend tests passed (196), and Actions run 45474419289 passed its website and backend checks.
- The Terraform preflight passed against the production backend and tfvars. The authentication increment has no Terraform changes; the earlier release imported one unchanged A record and updated the Function and verification TXT in place.
- Function identity role assignments are unchanged; the deployment identity retains Contributor and RBAC Administrator in the application resource group. No resource-group-level policy assignments were reported.
- On 2026-11-24, Python 3.12 backend tests: 188 passed, including a real local TLS handshake and redirect/address checks. Website lint, typecheck, two tests, and static build passed with Node 22.16.0. The deployed website is static and has no Node server runtime.

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

## Backend Azure Functions migration

Status: Validated for restricted preview

- Goal: migrate the existing Python FastAPI backend to Azure Functions, preserving its routes and using the existing PostgreSQL database.
- Target: subscription `deploy-box-sub-prod`, resource group `rg-cutthecrap-prod`, East US 2; Flex Consumption and `ctc-api.deploy-box.com`.
- Rollout: replace the current API in a subsequent GitHub Actions deployment. Update web and mobile clients, WorkOS callbacks, and billing webhooks as part of cutover. Already-installed mobile apps may continue using the old API URL until updated.
- First increment: add and test a Python Functions ASGI entry point and configuration; address runtime-specific logging and startup issues while retaining existing local and VM behavior.
- Later increments: Terraform, managed identity and Key Vault settings, deployment workflow, network/database access, DNS, client changes, and end-to-end verification. Do not copy secrets into Terraform state or source control. No deployment, resource destruction, or database changes are part of the first increment.
- Costs: Flex execution, storage, and monitoring can incur charges; avoid assuming the free grant covers all usage.
- Capacity: East US 2 supports Flex and Python. Storage quota is 250 with 2 in use. The quota API did not expose a Flex-specific limit in the available results; verify regional Flex capacity before provisioning.
- Azure's `Microsoft.Quota` provider was registered with user approval to enable quota checks. Infrastructure creation remains deferred.
- Test the ASGI route prefix, methods, responses, startup, error handling, authentication, and existing backend behavior locally before preparing deployment.
- The Functions host served status and health responses and enforced authentication locally with a stubbed database. Targeted backend tests passed; the broader route suite still has a pre-existing stale `is_pro` mock failure.
- The Function App, deployment workflow, production configuration, database access, rate limiting, and live cutover are not yet implemented or verified.

### Function deployment preparation

- Follow the official Functions Terraform template and Hazard Hero's Flex Consumption pattern, adapting them to this repository's existing AzureRM state and resource group.
- Provision one Linux Flex Function App and FC1 plan, one managed-identity-backed storage account and private package container, one user-assigned managed identity, and Application Insights with a Log Analytics workspace in East US 2. Add DNS and HTTPS for `ctc-api.deploy-box.com`.
- Use Key Vault references and managed identity for app configuration. Populate the existing dedicated vault from the approved legacy application secrets; do not copy `core-*` secrets or store values in Terraform state.
- Grant the GitHub identity resource-group-scoped RBAC administration, as approved, so Terraform can assign the Function identity's storage, monitoring, and vault roles. Grant an operator scoped secret-write access for the approved vault migration.
- Package and deploy Python dependencies through GitHub Actions using Azure remote build. Preserve the existing routes, verify health and authentication, and prevent the old production VM workflow from racing the Functions deployment.
- The new API hostname requires WorkOS callback and billing webhook configuration changes outside Terraform. Do not switch web or mobile clients until the Function App and external integrations are verified. No existing database or shared VM resources will be deleted by this increment.
- The existing PostgreSQL server has a firewall rule allowing all public IPv4 addresses. Do not modify the shared server without separate approval.
- Azure Functions' ASGI adapter reports no client address, so the existing per-IP in-memory limiter cannot safely be assumed to work as intended. Resolve and validate client attribution and scaling before switching traffic.
- Inventory: one Function App, FC1 plan, storage account, user-assigned identity, Application Insights component and Log Analytics workspace. Storage usage is 2 of 250 in East US 2; no Function Apps were found there. Azure reports Flex is available in the region, but its quota API does not expose a Flex-specific limit; validate actual capacity before deployment rather than assuming the published default.
- The Terraform draft uses AzAPI for the Function App to avoid the reported AzureRM identity-based storage issue. It configures managed identity, scoped storage and Key Vault roles, and Key Vault references; secret values are not configured in Terraform.
- The deployment workflow draft serializes Terraform through the existing website workflow and adds a Functions remote-build deployment. The legacy VM workflow is skipped on `main`. The Function App is configured in preview mode: only GET health and status endpoints are available until rate limiting and cutover are ready.
- Local backend tests: 179 passed after updating three stale test fixtures. Terraform formatting and validation passed, and the remote-state plan showed 12 additions with no changes or deletions. AzAPI's embedded schema does not yet include the site-scoped certificate option used by Microsoft's Flex sample, so schema validation is disabled for this resource; Azure-side support is unverified.
- The user approved deploying the restricted preview using the Azure-provided hostname before completing custom-domain automation. DNS, HTTPS, trustworthy rate limiting, WorkOS, Stripe, and client cutover remain follow-up work. Live Function provisioning and database connectivity remain unverified; the existing production API stays in place.

### Preview validation checks

- [x] All validation checks pass:
  - [x] Terraform and Azure CLI installed; Azure authentication and target subscription confirmed.
  - [x] Terraform init, format, validation, plan, and state access.
  - [x] Template-variable scan and applicable tfvars syntax checks.
  - [x] Azure policy and static RBAC review.
  - [x] Application build and tests.
  - [x] Node runtime support checked for the deployed website.

### Preview validation proof

- The Terraform preflight passed using a session-only correction for its PowerShell `$Args` parameter bug and the production backend and tfvars. The final plan adds 12 resources and changes or destroys none.
- The Function identity has Storage Blob Data Owner, Storage Queue Data Contributor, and Storage Table Data Contributor on its storage account, Key Vault Secrets User on the app vault, and Monitoring Metrics Publisher on Application Insights. Role propagation remains a live deployment concern.
- The subscription has the Microsoft cloud security benchmark policy initiative; the resource group has no additional assignments. Azure-side policy and capacity enforcement cannot be proven until provisioning.
- The backend suite passed 179 tests using Python 3.12. Website lint, type-check, tests and static export passed using Node 22; the static site has no Node server runtime in Azure.
- GitHub Actions provisioned the Function resources and deployed the package. Its readiness check initially failed because the Azure CLI returns the hostname under `properties.defaultHostName`; the workflow was corrected.
- The Function currently fails ASGI startup. A direct, credential-redacted test of the dedicated vault's PostgreSQL connection returned `InvalidPasswordError`; its host, username, and password match the copied legacy secrets. Do not reset the shared PostgreSQL credentials without separate approval. The production API and client URLs have not been switched.
