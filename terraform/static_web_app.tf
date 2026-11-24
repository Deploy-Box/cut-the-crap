resource "azurerm_static_web_app" "this" {
  name                = var.static_web_app_name
  resource_group_name = azurerm_resource_group.this.name
  location            = var.static_web_app_location
  sku_tier            = "Free"
  sku_size            = "Free"
}

resource "azurerm_dns_cname_record" "static_web_app" {
  name                = trimsuffix(var.domain_name, ".${var.dns_zone_name}")
  zone_name           = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
  ttl                 = 300
  record              = azurerm_static_web_app.this.default_host_name
}

resource "azurerm_static_web_app_custom_domain" "this" {
  static_web_app_id = azurerm_static_web_app.this.id
  domain_name       = var.domain_name
  validation_type   = "cname-delegation"

  depends_on = [azurerm_dns_cname_record.static_web_app]
}
