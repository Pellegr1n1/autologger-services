#!/bin/bash

echo "🔄 AutoLogger - Redeploy Contract Script"
echo "========================================"

# Verificar se rede está rodando
echo "🔍 Verificando se a rede Besu está rodando..."
if ! curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
    echo "❌ Rede Besu não está rodando!"
    echo ""
    read -p "Deseja iniciar a rede agora? (s/n): " choice
    if [ "$choice" == "s" ] || [ "$choice" == "S" ]; then
        echo "🚀 Iniciando rede Besu..."
        ./start-besu.sh
        exit 0
    else
        echo "❌ Abortando. Inicie a rede com: ./start-besu.sh"
        exit 1
    fi
fi

echo "✅ Rede Besu está rodando"

# Ir para pasta de contratos
cd contracts

# Compilar contratos
echo ""
echo "🔨 Compilando contratos..."
truffle compile

if [ $? -ne 0 ]; then
    echo "❌ Falha na compilação"
    exit 1
fi

echo "✅ Contratos compilados"

# Deploy com reset
echo ""
echo "🚀 Fazendo deploy do contrato..."
truffle migrate --network development --reset

if [ $? -ne 0 ]; then
    echo "❌ Falha no deploy"
    exit 1
fi

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""

# Extrair endereço do contrato
if [ -f "build/contracts/VehicleServiceTracker.json" ]; then
    CONTRACT_ADDRESS=$(node -pe "JSON.parse(require('fs').readFileSync('build/contracts/VehicleServiceTracker.json', 'utf8')).networks[Object.keys(JSON.parse(require('fs').readFileSync('build/contracts/VehicleServiceTracker.json', 'utf8')).networks)[0]].address")
    
    echo "📋 Informações do Deploy:"
    echo "========================="
    echo ""
    echo "🔗 Contract Address:"
    echo "   $CONTRACT_ADDRESS"
    echo ""
    echo "📝 Atualize seu arquivo .env com:"
    echo ""
    echo "BESU_RPC_URL=http://localhost:8545"
    echo "BESU_PRIVATE_KEY=0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63"
    echo "BESU_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
    echo ""
    echo "========================="
fi

echo ""
echo "🎉 Pronto! Agora:"
echo "   1. Copie o endereço acima"
echo "   2. Atualize o arquivo .env"
echo "   3. Reinicie o backend"

