terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Backend configuration (uncomment and configure after initial setup)
  # backend "s3" {
  #   bucket         = "autologger-terraform-state"
  #   key            = "terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "autologger"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC
module "vpc" {
  source = "./modules/vpc"

  project_name     = var.project_name
  environment      = var.environment
  vpc_cidr         = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"

  project_name    = var.project_name
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  db_name         = var.db_name
  db_username     = var.db_username
  db_password     = var.db_password
  db_instance_class = var.db_instance_class
  allowed_security_groups = [module.ecs.backend_security_group_id]
}

# S3 Bucket
module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

# ECR Repositories
module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

# ECS Cluster and Services
module "ecs" {
  source = "./modules/ecs"

  project_name           = var.project_name
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  public_subnet_ids      = module.vpc.public_subnet_ids
  private_subnet_ids     = module.vpc.private_subnet_ids
  backend_image          = var.backend_image
  frontend_image         = var.frontend_image
  backend_repository_url  = module.ecr.backend_repository_url
  frontend_repository_url = module.ecr.frontend_repository_url
  db_host                = module.rds.db_endpoint
  db_name                = var.db_name
  db_username            = var.db_username
  db_password            = var.db_password
  s3_bucket_name         = module.s3.bucket_name
  aws_region             = var.aws_region
  jwt_secret             = var.jwt_secret
  cors_origins           = var.cors_origins
  google_client_id       = var.google_client_id
  api_url                = var.api_url
}

# CloudFront for Frontend - DESABILITADO para economizar (~$5-10/mês)
# Use apenas o ALB do frontend (funciona perfeitamente)
# Se quiser habilitar, descomente:
# module "cloudfront" {
#   source = "./modules/cloudfront"
#   project_name        = var.project_name
#   environment         = var.environment
#   frontend_alb_dns    = module.ecs.frontend_alb_dns
#   api_alb_dns         = module.ecs.backend_alb_dns
# }

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = module.s3.bucket_name
}

output "backend_ecr_repository_url" {
  description = "Backend ECR repository URL"
  value       = module.ecr.backend_repository_url
}

output "frontend_ecr_repository_url" {
  description = "Frontend ECR repository URL"
  value       = module.ecr.frontend_repository_url
}

output "backend_alb_dns" {
  description = "Backend ALB DNS name"
  value       = module.ecs.backend_alb_dns
}

output "frontend_alb_dns" {
  description = "Frontend ALB DNS name"
  value       = module.ecs.frontend_alb_dns
}

# CloudFront outputs - DESABILITADO (economia)
# output "cloudfront_distribution_id" {
#   description = "CloudFront distribution ID"
#   value       = module.cloudfront.distribution_id
# }
# output "cloudfront_domain_name" {
#   description = "CloudFront domain name"
#   value       = module.cloudfront.domain_name
# }

