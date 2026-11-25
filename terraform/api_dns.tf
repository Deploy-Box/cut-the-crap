resource "azurerm_dns_cname_record" "api" {
  count               = var.enable_custom_domains ? 1 : 0
  name                = trimsuffix(var.api_domain_name, ".${var.dns_zone_name}")
  zone_name           = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
  ttl                 = 300
  record              = data.azapi_resource.function_domain.output.properties.defaultHostName
}
