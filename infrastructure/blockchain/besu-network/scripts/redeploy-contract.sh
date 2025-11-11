#!/bin/bash

cd "$(dirname "$0")/.." || exit 1

echo "Redeploy Contract Script"
echo "========================================"

echo "Verifying if the Besu network is running..."
if ! curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
    echo "Besu network is not running!"
    echo ""
    read -p "Do you want to start the Besu network now? (s/n): " choice
    if [ "$choice" == "s" ] || [ "$choice" == "S" ]; then
        echo "Starting Besu network..."
        ./scripts/start-besu.sh
        exit 0
    else
        echo "Aborting. Start the Besu network with: ./scripts/start-besu.sh"
        exit 1
    fi
fi

echo "Besu network is running"

cd contracts

echo ""
echo "Compiling contracts..."
truffle compile

if [ $? -ne 0 ]; then
    echo "Compilation failed"
    exit 1
fi

echo "Contracts compiled"

# Deploy com reset
echo ""
echo "Deploying contract..."
truffle migrate --network development --reset

if [ $? -ne 0 ]; then
    echo "Deployment failed"
    exit 1
fi

echo ""
echo "Deployment completed successfully!"
echo ""

if [ -f "build/contracts/VehicleServiceTracker.json" ]; then
    CONTRACT_ADDRESS=$(node -pe "JSON.parse(require('fs').readFileSync('build/contracts/VehicleServiceTracker.json', 'utf8')).networks[Object.keys(JSON.parse(require('fs').readFileSync('build/contracts/VehicleServiceTracker.json', 'utf8')).networks)[0]].address")
    
    echo "Deployment Information:"
    echo "========================="
    echo ""
    echo "Contract Address:"
    echo "   $CONTRACT_ADDRESS"
    echo ""
    echo "Update your .env file with:"
    echo ""
    echo "BESU_RPC_URL=http://localhost:8545"
    echo "BESU_PRIVATE_KEY=0x<YOUR_PRIVATE_KEY_HERE>"
    echo "BESU_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
    echo ""
    echo "⚠️  WARNING: Never commit private keys to git!"
    echo ""
    echo "========================="
fi

echo ""
echo "Ready! Now:"
echo "   1. Copy the address above"
echo "   2. Update the .env file"
echo "   3. Restart the backend"

