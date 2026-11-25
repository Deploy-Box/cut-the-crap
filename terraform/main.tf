terraform {
  required_version = ">= 1.12.2"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.6"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.0"
    }
  }

  backend "azurerm" {
    use_azuread_auth = true
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id

  features {}
}

moved {
  from = azurerm_dns_cname_record.static_web_app
  to   = azurerm_dns_cname_record.static_web_app[0]
}

moved {
  from = azurerm_static_web_app_custom_domain.this
  to   = azurerm_static_web_app_custom_domain.this[0]
}

moved {
  from = azurerm_dns_txt_record.function_domain_verification
  to   = azurerm_dns_txt_record.function_domain_verification[0]
}

moved {
  from = azurerm_app_service_custom_hostname_binding.function
  to   = azurerm_app_service_custom_hostname_binding.function[0]
}

moved {
  from = azapi_resource.function_certificate
  to   = azapi_resource.function_certificate[0]
}

moved {
  from = azapi_update_resource.function_certificate_binding
  to   = azapi_update_resource.function_certificate_binding[0]
}

moved {
  from = azurerm_dns_cname_record.api
  to   = azurerm_dns_cname_record.api[0]
}

resource "azurerm_resource_group" "this" {
  count    = var.create_resource_group ? 1 : 0
  name     = var.resource_group_name
  location = var.location
}

data "azurerm_resource_group" "this" {
  count = var.create_resource_group ? 0 : 1
  name  = var.resource_group_name
}

locals {
  resource_group_id = var.create_resource_group ? azurerm_resource_group.this[0].id : data.azurerm_resource_group.this[0].id
  function_app_name = "func-cutthecrap-api-${var.environment}"
  frontend_hostname = var.enable_custom_domains ? var.domain_name : azurerm_static_web_app.this.default_host_name
  api_hostname      = var.enable_custom_domains ? var.api_domain_name : "${local.function_app_name}.azurewebsites.net"
}
