#!/bin/bash
set -e

echo "=========================================="
echo "  AutoLogger Besu - AWS Initialization"
echo "=========================================="

# Criar diretório de dados do Besu
mkdir -p /opt/besu/data

# Gerar chave privada se não existir
if [ ! -f /opt/besu/data/key ]; then
  echo "Generating node private key..."
  # Usar a chave do genesis (account principal)
  echo "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3" > /opt/besu/data/key
fi

# Iniciar Besu em background
echo "Starting Besu node..."
besu \
  --data-path=/opt/besu/data \
  --genesis-file=/opt/besu/genesis.json \
  --node-private-key-file=/opt/besu/data/key \
  --rpc-http-enabled \
  --rpc-http-host=0.0.0.0 \
  --rpc-http-port=8545 \
  --rpc-http-cors-origins="*" \
  --rpc-http-api=ETH,NET,WEB3,IBFT,ADMIN \
  --host-allowlist="*" \
  --p2p-port=30303 \
  --p2p-host=0.0.0.0 \
  --min-gas-price=0 \
  --tx-pool-limit-by-account-percentage=1 \
  --logging=INFO &

BESU_PID=$!

# Aguardar Besu estar pronto
echo "Waiting for Besu to be ready..."
max_retries=60
retry_count=0

while [ $retry_count -lt $max_retries ]; do
  if curl -s -X POST \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1; then
    echo "Besu is ready!"
    break
  fi
  echo "Waiting for Besu... ($((retry_count + 1))/$max_retries)"
  sleep 2
  ((retry_count++))
done

if [ $retry_count -eq $max_retries ]; then
  echo "ERROR: Besu failed to start"
  exit 1
fi

# Verificar se contrato já foi deployado (via variável de ambiente)
if [ -n "$BESU_CONTRACT_ADDRESS" ]; then
  echo "Contract address already set: $BESU_CONTRACT_ADDRESS"
  echo "Skipping contract deployment..."
else
  echo "Deploying VehicleServiceTracker contract..."
  
  cd /app/contracts
  
  # Compilar contratos
  truffle compile
  
  # Fazer deploy
  truffle migrate --network development --reset
  
  # Extrair endereço do contrato
  if [ -f "build/contracts/VehicleServiceTracker.json" ]; then
    CONTRACT_ADDRESS=$(node -pe "JSON.parse(require('fs').readFileSync('build/contracts/VehicleServiceTracker.json', 'utf8')).networks[Object.keys(JSON.parse(require('fs').readFileSync('build/contracts/VehicleServiceTracker.json', 'utf8')).networks)[0]].address")
    
    echo ""
    echo "=========================================="
    echo "Contract Deployed Successfully!"
    echo "=========================================="
    echo "Contract Address: $CONTRACT_ADDRESS"
    echo ""
    echo "Set this in your backend environment:"
    echo "BESU_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
    echo "BESU_RPC_URL=http://<besu-service-url>:8545"
    echo "=========================================="
    
    # Salvar em arquivo para acesso posterior
    echo "$CONTRACT_ADDRESS" > /opt/besu/contract-address.txt
  fi
fi

echo ""
echo "=========================================="
echo "Besu is running and ready!"
echo "RPC Endpoint: http://0.0.0.0:8545"
echo "=========================================="

# Manter container rodando
wait $BESU_PID

