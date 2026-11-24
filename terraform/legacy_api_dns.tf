resource "azurerm_dns_a_record" "legacy_api" {
  name                = "cutthecrap"
  zone_name           = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
  ttl                 = 300
  records             = ["4.227.206.218"]
}

import {
  to = azurerm_dns_a_record.legacy_api
  id = "/subscriptions/3d5d1ab2-b17f-4c99-9bf1-db4fe0ad882e/resourceGroups/deploy-box-rg-prod/providers/Microsoft.Network/dnsZones/deploy-box.com/A/cutthecrap"
}
