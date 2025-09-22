#!/bin/bash

echo "🚀 AutoLogger Contract Deployment Script"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "truffle-config.js" ]; then
    echo "❌ Error: Please run this script from the contracts directory"
    echo "Usage: cd besu-network/contracts && ./scripts/deploy-truffle.sh"
    exit 1
fi

# Check if truffle is installed
if ! [ -x "$(command -v truffle)" ]; then
    echo "❌ Error: truffle is not installed. Run: npm install -g truffle"
    exit 1
fi

# Check if network is running
echo "🔍 Checking if Besu network is running..."
if ! curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://127.0.0.1:8545 > /dev/null; then
    echo "❌ Error: Besu network is not running on port 8545"
    echo "Please start the network first with: ./scripts/start-besu.sh"
    exit 1
fi

echo "✅ Besu network is running"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Compile contracts
echo "🔨 Compiling contracts..."
truffle compile

if [ $? -ne 0 ]; then
    echo "❌ Contract compilation failed"
    exit 1
fi

echo "✅ Contracts compiled successfully"

# Deploy contracts
echo "🚀 Deploying contracts to Besu network..."
truffle migrate --network development --reset

if [ $? -ne 0 ]; then
    echo "❌ Contract deployment failed"
    exit 1
fi

echo "✅ Contracts deployed successfully!"

# Get contract address
echo ""
echo "📋 Deployment Summary:"
echo "======================"
echo "Network: AutoLogger Besu (Chain ID: 2024)"
echo "RPC URL: http://localhost:8545"
echo ""

# Try to get contract address from migration
if [ -f "build/contracts/VehicleServiceTracker.json" ]; then
    echo "🔗 VehicleServiceTracker Contract:"
    echo "   - ABI: build/contracts/VehicleServiceTracker.json"
    echo "   - Address: Check migration output above"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "You can now interact with the contracts using:"
echo "   truffle console --network development"
