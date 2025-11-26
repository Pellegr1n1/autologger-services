#!/bin/bash
set -e

echo "=========================================="
echo "  AutoLogger Besu - AWS Initialization"
echo "=========================================="

mkdir -p /opt/besu/data
chmod 755 /opt/besu/data

if [ ! -f /opt/besu/genesis.json ]; then
  echo "ERROR: genesis.json not found at /opt/besu/genesis.json"
  exit 1
fi
echo "✅ Genesis file found"

if [ ! -f /opt/besu/data/key ]; then
  echo "Generating node private key..."
  echo "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3" > /opt/besu/data/key
  chmod 600 /opt/besu/data/key
fi
echo "✅ Private key ready"

BESU_LOG="/opt/besu/data/besu.log"
touch "$BESU_LOG"
chmod 644 "$BESU_LOG"

echo "Starting Besu node..."
echo "Command: besu --data-path=/opt/besu/data --genesis-file=/opt/besu/genesis.json --node-private-key-file=/opt/besu/data/key --rpc-http-enabled --rpc-http-host=0.0.0.0 --rpc-http-port=8545 --rpc-http-cors-origins=\"*\" --rpc-http-api=ETH,NET,WEB3,IBFT,ADMIN --host-allowlist=\"*\" --p2p-port=30303 --p2p-host=0.0.0.0 --min-gas-price=0 --logging=INFO"

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
  --logging=INFO \
  > "$BESU_LOG" 2>&1 &

BESU_PID=$!
echo "Besu started with PID: $BESU_PID"

sleep 5

if ! kill -0 $BESU_PID 2>/dev/null; then
  echo "ERROR: Besu process died immediately!"
  echo "Last 50 lines of Besu log:"
  tail -50 "$BESU_LOG" || echo "No log file found"
  exit 1
fi

echo "Waiting for Besu to be ready..."
max_retries=60
retry_count=0

while [ $retry_count -lt $max_retries ]; do
  if ! kill -0 $BESU_PID 2>/dev/null; then
    echo "ERROR: Besu process died!"
    echo "Last 50 lines of Besu log:"
    tail -50 "$BESU_LOG" || echo "No log file found"
    exit 1
  fi
  
  if curl -s -X POST \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1; then
    echo "✅ Besu is ready!"
    break
  fi
  
  echo "Waiting for Besu... ($((retry_count + 1))/$max_retries)"
  if [ $((retry_count % 10)) -eq 0 ] && [ -f "$BESU_LOG" ]; then
    echo "Recent Besu logs:"
    tail -5 "$BESU_LOG" 2>/dev/null || echo "No logs yet"
  fi
  sleep 3
  ((retry_count++))
done

if [ $retry_count -eq $max_retries ]; then
  echo "ERROR: Besu failed to start within timeout"
  echo "Last 50 lines of Besu log:"
  tail -50 "$BESU_LOG" || echo "No log file found"
  echo ""
  echo "Process status:"
  ps aux | grep besu || echo "No besu process found"
  exit 1
fi

if [ -n "$BESU_CONTRACT_ADDRESS" ]; then
  echo "Contract address already set: $BESU_CONTRACT_ADDRESS"
  echo "Skipping contract deployment..."
else
  echo "Deploying VehicleServiceTracker contract..."
  
  cd /app/contracts
  
  truffle compile
  
  truffle migrate --network development --reset
  
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
    
    echo "$CONTRACT_ADDRESS" > /opt/besu/contract-address.txt
  fi
fi

echo ""
echo "=========================================="
echo "Besu is running and ready!"
echo "RPC Endpoint: http://0.0.0.0:8545"
echo "=========================================="

wait $BESU_PID

