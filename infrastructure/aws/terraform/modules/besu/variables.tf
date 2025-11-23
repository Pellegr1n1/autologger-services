variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "vpc_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks of the VPC for P2P communication"
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "backend_security_group_ids" {
  type        = list(string)
  description = "Security groups of backend services that need to access Besu"
}

variable "ecs_cluster_id" {
  type = string
}

variable "ecs_task_execution_role_arn" {
  type = string
}

variable "aws_region" {
  type = string
}

