data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "app" {
  name                       = var.key_vault_name
  location                   = var.location
  resource_group_name        = data.azurerm_resource_group.this.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  rbac_authorization_enabled = true
  purge_protection_enabled   = true
  soft_delete_retention_days = 90
}
