output "app_url" {
  description = "Custom domain for the website"
  value       = "https://${local.frontend_hostname}"
}

output "static_web_app_url" {
  description = "Default Azure Static Web App URL"
  value       = "https://${azurerm_static_web_app.this.default_host_name}"
}

output "api_url" {
  description = "API URL for this environment"
  value       = "https://${local.api_hostname}"
}

output "function_default_hostname" {
  description = "Default Azure hostname for the Function App"
  value       = data.azapi_resource.function_domain.output.properties.defaultHostName
}

output "key_vault_name" {
  description = "Application Key Vault name"
  value       = azurerm_key_vault.app.name
}
