resource "azurerm_user_assigned_identity" "function" {
  name                = "id-cutthecrap-api-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
}

resource "azurerm_storage_account" "function" {
  name                            = "ctcfunct${var.environment}"
  resource_group_name             = var.resource_group_name
  location                        = var.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
}

resource "azurerm_storage_container" "function_package" {
  name                  = "deploymentpackage"
  storage_account_id    = azurerm_storage_account.function.id
  container_access_type = "private"
}

resource "azurerm_log_analytics_workspace" "function" {
  name                = "log-cutthecrap-api-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days
}

resource "azurerm_application_insights" "function" {
  name                         = "appi-cutthecrap-api-${var.environment}"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  application_type             = "web"
  workspace_id                 = azurerm_log_analytics_workspace.function.id
  local_authentication_enabled = false
}

resource "azurerm_service_plan" "function" {
  name                = "asp-cutthecrap-api-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "FC1"
}

resource "azurerm_role_assignment" "function_storage" {
  for_each             = toset(["Storage Blob Data Owner", "Storage Queue Data Contributor", "Storage Table Data Contributor"])
  scope                = azurerm_storage_account.function.id
  role_definition_name = each.value
  principal_id         = azurerm_user_assigned_identity.function.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "function_vault" {
  scope                = azurerm_key_vault.app.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.function.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "function_monitoring" {
  scope                = azurerm_application_insights.function.id
  role_definition_name = "Monitoring Metrics Publisher"
  principal_id         = azurerm_user_assigned_identity.function.principal_id
  principal_type       = "ServicePrincipal"
}

locals {
  function_secret_names = merge(
    {
      POSTGRES_CONNECTION_STRING = "ctc-postgres-connection-string"
      WORKOS_API_KEY             = "ctc-workos-api-key"
      WORKOS_CLIENT_ID           = "ctc-workos-client-id"
      OPENAI_API_KEY             = "ctc-openai-api-key"
      DEPLOY_BOX_CLIENT_ID       = "ctc-deploy-box-client-id"
      DEPLOY_BOX_CLIENT_SECRET   = "ctc-deploy-box-client-secret"
      CHATGPT_API_BASE           = "ctc-chatgpt-api-base"
    },
    var.function_enable_stripe ? {
      STRIPE_SECRET_KEY        = "ctc-prod-stripe-secret-key"
      STRIPE_WEBHOOK_SECRET    = "ctc-prod-stripe-webhook-secret"
      STRIPE_PRICE_PRO_MONTHLY = "ctc-prod-stripe-price-pro-monthly"
      STRIPE_PRICE_PRO_YEARLY  = "ctc-prod-stripe-price-pro-yearly"
    } : {}
  )
  function_settings = merge(
    {
      ENVIRONMENT                               = var.application_environment
      FUNCTIONS_PREVIEW_MODE                    = "false"
      PLATFORM_MANAGED_CORS                     = "true"
      POSTGRES_POOL_MIN_SIZE                    = "1"
      POSTGRES_POOL_MAX_SIZE                    = "5"
      FRONTEND_URL                              = "https://${local.frontend_hostname}"
      CORS_ORIGIN                               = join(",", local.cors_origins)
      WORKOS_REDIRECT_URI                       = "https://${local.api_hostname}/api/v1/auth/callback"
      AzureWebJobsStorage__accountName          = azurerm_storage_account.function.name
      AzureWebJobsStorage__credential           = "managedidentity"
      AzureWebJobsStorage__clientId             = azurerm_user_assigned_identity.function.client_id
      APPLICATIONINSIGHTS_CONNECTION_STRING     = azurerm_application_insights.function.connection_string
      APPLICATIONINSIGHTS_AUTHENTICATION_STRING = "ClientId=${azurerm_user_assigned_identity.function.client_id};Authorization=AAD"
    },
    { for key, name in local.function_secret_names : key => "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.app.vault_uri}secrets/${name}/)" },
    var.additional_website_domain != "" && local.frontend_custom_domain_enabled ? {
      ADDITIONAL_FRONTEND_URLS = "https://${var.domain_name}"
    } : {}
  )
}

resource "azapi_resource" "function" {
  type                      = "Microsoft.Web/sites@2024-11-01"
  name                      = local.function_app_name
  parent_id                 = local.resource_group_id
  location                  = var.location
  schema_validation_enabled = false
  ignore_casing             = true

  body = {
    kind = "functionapp,linux"
    identity = {
      type = "UserAssigned"
      userAssignedIdentities = {
        (azurerm_user_assigned_identity.function.id) = {}
      }
    }
    properties = {
      httpsOnly                     = true
      serverFarmId                  = azurerm_service_plan.function.id
      keyVaultReferenceIdentity     = azurerm_user_assigned_identity.function.id
      siteScopedCertificatesEnabled = true
      functionAppConfig = {
        deployment = {
          storage = {
            type  = "blobContainer"
            value = "${azurerm_storage_account.function.primary_blob_endpoint}${azurerm_storage_container.function_package.name}"
            authentication = {
              type                           = "UserAssignedIdentity"
              userAssignedIdentityResourceId = azurerm_user_assigned_identity.function.id
            }
          }
        }
        runtime = {
          name    = "python"
          version = "3.12"
        }
        scaleAndConcurrency = {
          maximumInstanceCount = var.function_max_instance_count
          instanceMemoryMB     = 2048
        }
      }
      siteConfig = {
        minTlsVersion = "1.2"
        appSettings   = [for name, value in local.function_settings : { name = name, value = value }]
        cors = {
          allowedOrigins     = local.cors_origins
          supportCredentials = true
        }
      }
    }
  }

  depends_on = [
    azurerm_role_assignment.function_storage,
    azurerm_role_assignment.function_vault,
    azurerm_role_assignment.function_monitoring,
  ]
}

data "azapi_resource" "function_domain" {
  type                   = "Microsoft.Web/sites@2024-11-01"
  resource_id            = azapi_resource.function.id
  response_export_values = ["properties.customDomainVerificationId", "properties.defaultHostName"]
}

resource "azurerm_dns_txt_record" "function_domain_verification" {
  count               = var.enable_custom_domains ? 1 : 0
  name                = "asuid.${trimsuffix(var.api_domain_name, ".${var.dns_zone_name}")}"
  zone_name           = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
  ttl                 = 300

  record {
    value = data.azapi_resource.function_domain.output.properties.customDomainVerificationId
  }
}

resource "azurerm_app_service_custom_hostname_binding" "function" {
  count               = var.enable_custom_domains ? 1 : 0
  hostname            = var.api_domain_name
  app_service_name    = azapi_resource.function.name
  resource_group_name = var.resource_group_name

  lifecycle {
    ignore_changes = [ssl_state, thumbprint]
  }

  depends_on = [azurerm_dns_txt_record.function_domain_verification]
}

resource "azapi_resource" "function_certificate" {
  count     = var.enable_custom_domains ? 1 : 0
  type      = "Microsoft.Web/sites/certificates@2024-11-01"
  name      = var.api_domain_name
  parent_id = azapi_resource.function.id
  location  = var.location

  body = {
    properties = {
      canonicalName = azurerm_app_service_custom_hostname_binding.function[0].hostname
      serverFarmId  = azurerm_service_plan.function.id
    }
  }

  response_export_values = ["properties.thumbprint"]
  depends_on             = [azurerm_dns_cname_record.api]
}

resource "azapi_update_resource" "function_certificate_binding" {
  count       = var.enable_custom_domains ? 1 : 0
  type        = "Microsoft.Web/sites/hostNameBindings@2024-11-01"
  resource_id = azurerm_app_service_custom_hostname_binding.function[0].id

  body = {
    properties = {
      sslState   = "SniEnabled"
      thumbprint = azapi_resource.function_certificate[0].output.properties.thumbprint
    }
  }
}
