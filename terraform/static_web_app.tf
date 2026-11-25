resource "azurerm_static_web_app" "this" {
  name                = var.static_web_app_name
  resource_group_name = var.resource_group_name
  location            = var.static_web_app_location
  sku_tier            = "Free"
  sku_size            = "Free"

  lifecycle {
    ignore_changes = [repository_url, repository_branch]
  }
}

resource "azurerm_dns_cname_record" "static_web_app" {
  count               = var.enable_custom_domains ? 1 : 0
  name                = trimsuffix(var.domain_name, ".${var.dns_zone_name}")
  zone_name           = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
  ttl                 = 300
  record              = azurerm_static_web_app.this.default_host_name
}

resource "azurerm_static_web_app_custom_domain" "this" {
  count             = local.frontend_custom_domain_enabled ? 1 : 0
  static_web_app_id = azurerm_static_web_app.this.id
  domain_name       = var.domain_name
  validation_type   = "cname-delegation"

  lifecycle {
    # Azure does not return the creation-only validation type after import.
    ignore_changes = [validation_type]
  }

  depends_on = [azurerm_dns_cname_record.static_web_app]
}

resource "azurerm_dns_cname_record" "additional_website" {
  count               = var.additional_website_domain != "" ? 1 : 0
  name                = trimsuffix(var.additional_website_domain, ".${var.dns_zone_name}")
  zone_name           = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
  ttl                 = 300
  record              = azurerm_static_web_app.this.default_host_name
}

resource "azurerm_static_web_app_custom_domain" "additional_website" {
  count             = var.additional_website_domain != "" ? 1 : 0
  static_web_app_id = azurerm_static_web_app.this.id
  domain_name       = var.additional_website_domain
  validation_type   = "cname-delegation"

  lifecycle {
    ignore_changes = [validation_type]
  }

  depends_on = [azurerm_dns_cname_record.additional_website]
}
