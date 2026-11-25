variable "subscription_id" {
  description = "Azure subscription containing the web app and DNS zone"
  type        = string
}

variable "environment" {
  description = "Deployment environment used for resource naming"
  type        = string

  validation {
    condition     = contains(["prod", "dev"], var.environment)
    error_message = "environment must be prod or dev."
  }
}

variable "resource_group_name" {
  description = "Resource group for this application environment"
  type        = string
}

variable "create_resource_group" {
  description = "Whether Terraform creates the application resource group"
  type        = bool
  default     = false
}

variable "location" {
  description = "Location for the application resources"
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

variable "key_vault_name" {
  description = "Globally unique name of the application Key Vault"
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

variable "api_domain_name" {
  description = "Subdomain to bind to the Function App"
  type        = string

  validation {
    condition     = endswith(var.api_domain_name, ".${var.dns_zone_name}") && var.api_domain_name != var.dns_zone_name
    error_message = "api_domain_name must be a subdomain of dns_zone_name."
  }
}

variable "enable_custom_domains" {
  description = "Whether to create custom-domain bindings and DNS records"
  type        = bool
  default     = true
}

variable "application_environment" {
  description = "Environment label exposed to the API"
  type        = string
}

variable "function_max_instance_count" {
  description = "Maximum number of Flex Consumption instances"
  type        = number
  default     = 40

  validation {
    condition     = var.function_max_instance_count >= 1
    error_message = "function_max_instance_count must be at least 1."
  }
}

variable "function_enable_stripe" {
  description = "Whether this environment receives Stripe configuration"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Log Analytics retention for this environment"
  type        = number
  default     = 30

  validation {
    condition     = var.log_retention_days >= 30 && var.log_retention_days <= 730
    error_message = "log_retention_days must be between 30 and 730."
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
