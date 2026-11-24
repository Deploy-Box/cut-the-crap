variable "subscription_id" {
  description = "Azure subscription containing the web app and DNS zone"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for the Static Web App"
  type        = string
}

variable "location" {
  description = "Resource group location"
  type        = string
}

variable "static_web_app_name" {
  description = "Azure Static Web App name"
  type        = string
}

variable "static_web_app_location" {
  description = "Azure Static Web App region"
  type        = string
}

variable "domain_name" {
  description = "Subdomain to bind to the Static Web App"
  type        = string

  validation {
    condition     = endswith(var.domain_name, ".${var.dns_zone_name}") && var.domain_name != var.dns_zone_name
    error_message = "domain_name must be a subdomain of dns_zone_name."
  }
}

variable "dns_zone_name" {
  description = "Existing Azure DNS zone"
  type        = string
}

variable "dns_zone_resource_group_name" {
  description = "Resource group containing the existing DNS zone"
  type        = string
}
