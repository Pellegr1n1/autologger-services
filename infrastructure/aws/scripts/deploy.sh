#!/bin/bash

# Script de deploy manual para AWS
# Uso: ./deploy.sh [dev|prod]

set -e

ENVIRONMENT=${1:-prod}
TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../terraform" && pwd)"

echo "🚀 Iniciando deploy para ambiente: $ENVIRONMENT"
echo "📁 Diretório Terraform: $TERRAFORM_DIR"

# Verificar se terraform.tfvars existe
if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
  echo "❌ Erro: terraform.tfvars não encontrado!"
  echo "📝 Copie terraform.tfvars.example para terraform.tfvars e configure"
  exit 1
fi

cd "$TERRAFORM_DIR"

# Inicializar Terraform
echo "🔧 Inicializando Terraform..."
terraform init

# Validar configuração
echo "✅ Validando configuração..."
terraform validate

# Planejar mudanças
echo "📋 Planejando mudanças..."
terraform plan \
  -var="environment=$ENVIRONMENT" \
  -out=tfplan

# Aplicar mudanças
read -p "🤔 Deseja aplicar as mudanças? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🚀 Aplicando mudanças..."
  terraform apply tfplan
  
  echo "✅ Deploy concluído!"
  echo ""
  echo "📊 Outputs:"
  terraform output
else
  echo "❌ Deploy cancelado"
  exit 1
fi

