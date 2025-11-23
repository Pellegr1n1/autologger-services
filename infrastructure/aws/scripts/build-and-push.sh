#!/bin/bash

# Script para build e push das imagens Docker para ECR
# Uso: ./build-and-push.sh [dev|prod] [backend|frontend|all]

set -e

ENVIRONMENT=${1:-prod}
SERVICE=${2:-all}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "❌ Erro: AWS_ACCOUNT_ID não definido"
  exit 1
fi

ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

echo "🏗️  Build e Push para ECR"
echo "📦 Ambiente: $ENVIRONMENT"
echo "🔧 Serviço: $SERVICE"
echo "📍 Registry: $ECR_REGISTRY"

# Login no ECR
echo "🔐 Fazendo login no ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Função para build e push
build_and_push() {
  local service=$1
  local context_path="$PROJECT_ROOT/autologger-$service"
  local image_name="autologger-$ENVIRONMENT-$service"
  local image_tag="${GIT_SHA:-latest}"
  
  echo ""
  echo "🏗️  Building $service..."
  echo "📁 Context: $context_path"
  
  docker build \
    -t $ECR_REGISTRY/$image_name:$image_tag \
    -t $ECR_REGISTRY/$image_name:latest \
    -f $context_path/Dockerfile \
    $context_path
  
  echo "📤 Pushing $service..."
  docker push $ECR_REGISTRY/$image_name:$image_tag
  docker push $ECR_REGISTRY/$image_name:latest
  
  echo "✅ $service concluído!"
}

# Build baseado no parâmetro
case $SERVICE in
  backend)
    build_and_push "service"
    ;;
  frontend)
    build_and_push "ui"
    ;;
  all)
    build_and_push "service"
    build_and_push "ui"
    ;;
  *)
    echo "❌ Serviço inválido: $SERVICE"
    echo "Uso: $0 [dev|prod] [backend|frontend|all]"
    exit 1
    ;;
esac

echo ""
echo "✅ Build e push concluídos!"

