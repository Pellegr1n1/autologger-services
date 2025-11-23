# ECS Task Definition for Besu Node
resource "aws_ecs_task_definition" "besu" {
  family                   = "${var.project_name}-${var.environment}-besu"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"  # Besu precisa de mais recursos
  memory                   = "2048"
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn            = var.ecs_task_execution_role_arn

  container_definitions = jsonencode([
    {
      name      = "besu"
      image     = "hyperledger/besu:24.1.2"
      essential = true

      portMappings = [
        {
          containerPort = 8545
          protocol      = "tcp"
        },
        {
          containerPort = 30303
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "BESU_DATA_PATH"
          value = "/opt/besu/data"
        },
        {
          name  = "BESU_GENESIS_FILE"
          value = "/opt/besu/genesis.json"
        },
        {
          name  = "BESU_NODE_PRIVATE_KEY_FILE"
          value = "/opt/besu/nodes/node1/key"
        },
        {
          name  = "BESU_RPC_HTTP_ENABLED"
          value = "true"
        },
        {
          name  = "BESU_RPC_HTTP_HOST"
          value = "0.0.0.0"
        },
        {
          name  = "BESU_RPC_HTTP_PORT"
          value = "8545"
        },
        {
          name  = "BESU_RPC_HTTP_CORS_ORIGINS"
          value = "*"
        },
        {
          name  = "BESU_RPC_HTTP_API"
          value = "ETH,NET,WEB3,IBFT,ADMIN"
        },
        {
          name  = "BESU_HOST_ALLOWLIST"
          value = "*"
        },
        {
          name  = "BESU_P2P_PORT"
          value = "30303"
        },
        {
          name  = "BESU_P2P_HOST"
          value = "0.0.0.0"
        },
        {
          name  = "BESU_MIN_GAS_PRICE"
          value = "0"
        },
        {
          name  = "BESU_LOGGING"
          value = "INFO"
        }
      ]

      command = [
        "--data-path=/opt/besu/data",
        "--genesis-file=/opt/besu/genesis.json",
        "--node-private-key-file=/opt/besu/nodes/node1/key",
        "--rpc-http-enabled",
        "--rpc-http-host=0.0.0.0",
        "--rpc-http-port=8545",
        "--rpc-http-cors-origins=*",
        "--rpc-http-api=ETH,NET,WEB3,IBFT,ADMIN",
        "--host-allowlist=*",
        "--p2p-port=30303",
        "--p2p-host=0.0.0.0",
        "--min-gas-price=0",
        "--logging=INFO"
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.besu.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      # Mount genesis file and node data from EFS
      mountPoints = [
        {
          sourceVolume  = "besu-data"
          containerPath = "/opt/besu/data"
          readOnly      = false
        },
        {
          sourceVolume  = "besu-genesis"
          containerPath = "/opt/besu/genesis.json"
          readOnly      = true
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f -X POST --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}' http://localhost:8545 || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  volume {
    name = "besu-data"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.besu.id
      root_directory     = "/"
      transit_encryption = "ENABLED"
    }
  }

  volume {
    name = "besu-genesis"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.besu.id
      root_directory     = "/genesis"
      transit_encryption = "ENABLED"
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-besu"
  }
}

# EFS for Besu persistent data
resource "aws_efs_file_system" "besu" {
  creation_token = "${var.project_name}-${var.environment}-besu-efs"
  
  performance_mode = "generalPurpose"
  throughput_mode  = "provisioned"
  provisioned_throughput_in_mibps = 100

  encrypted = true

  tags = {
    Name = "${var.project_name}-${var.environment}-besu-efs"
  }
}

# EFS Mount Targets (one per subnet)
resource "aws_efs_mount_target" "besu" {
  count           = length(var.private_subnet_ids)
  file_system_id  = aws_efs_file_system.besu.id
  subnet_id       = var.private_subnet_ids[count.index]
  security_groups  = [aws_security_group.besu_efs.id]
}

# Security Group for EFS
resource "aws_security_group" "besu_efs" {
  name        = "${var.project_name}-${var.environment}-besu-efs-sg"
  description = "Security group for Besu EFS"
  vpc_id      = var.vpc_id

  ingress {
    description     = "NFS from ECS tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.besu.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-besu-efs-sg"
  }
}

# Security Group for Besu
resource "aws_security_group" "besu" {
  name        = "${var.project_name}-${var.environment}-besu-sg"
  description = "Security group for Besu node"
  vpc_id      = var.vpc_id

  ingress {
    description     = "RPC HTTP from backend"
    from_port       = 8545
    to_port         = 8545
    protocol        = "tcp"
    security_groups = var.backend_security_group_ids
  }

  ingress {
    description     = "P2P from other nodes"
    from_port       = 30303
    to_port         = 30303
    protocol        = "tcp"
    cidr_blocks     = var.vpc_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-besu-sg"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "besu" {
  name              = "/ecs/${var.project_name}-${var.environment}-besu"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-besu-logs"
  }
}

# ECS Service for Besu
resource "aws_ecs_service" "besu" {
  name            = "${var.project_name}-${var.environment}-besu"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.besu.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.besu.id]
    assign_public_ip = false
  }

  depends_on = [
    aws_efs_mount_target.besu
  ]

  tags = {
    Name = "${var.project_name}-${var.environment}-besu"
  }
}

# Outputs
output "besu_security_group_id" {
  value = aws_security_group.besu.id
}

output "besu_rpc_endpoint" {
  value = "${aws_ecs_service.besu.name}.${var.aws_region}.amazonaws.com"
  description = "Besu RPC endpoint (use service discovery)"
}

