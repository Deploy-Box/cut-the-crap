output "app_url" {
  description = "Custom domain for the website"
  value       = "https://${var.domain_name}"
}

output "static_web_app_url" {
  description = "Default Azure Static Web App URL"
  value       = "https://${azurerm_static_web_app.this.default_host_name}"
}

output "key_vault_name" {
  description = "Production application Key Vault name"
  value       = azurerm_key_vault.app.name
}
