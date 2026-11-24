resource "azurerm_dns_cname_record" "api" {
  name                = "cutthecrap"
  zone_name           = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
  ttl                 = 300
  record              = data.azapi_resource.function_domain.output.properties.defaultHostName
}
