variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "autologger"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Database variables
variable "db_name" {
  description = "Database name"
  type        = string
  default     = "autologger"
  sensitive   = true
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

# ECS variables
variable "backend_image" {
  description = "Backend Docker image tag"
  type        = string
  default     = "latest"
}

variable "frontend_image" {
  description = "Frontend Docker image tag"
  type        = string
  default     = "latest"
}

# Application variables
variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "cors_origins" {
  description = "CORS allowed origins (comma-separated)"
  type        = string
  default     = "*"
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
}

variable "api_url" {
  description = "API URL for frontend"
  type        = string
  default     = ""
}

