#!/bin/bash

echo "🚗 Starting AutoLogger Besu Network"
echo "==================================="

# Check if truffle is installed
if ! [ -x "$(command -v truffle)" ]; then
  echo "❌ Error: truffle is not installed. Run: npm install -g truffle" >&2
  exit 1
fi

echo "🧹 Cleaning up previous data"

# Clean up containers
docker rm -f besu-node-0 besu-node-1 besu-node-2 2>/dev/null || true

# Clean up data dir from each node
sudo rm -rf node/besu-0/data
sudo rm -rf node/besu-1/data
sudo rm -rf node/besu-2/data

sudo rm -rf genesis
sudo rm -rf _tmp
sudo rm -rf networkFiles

# Recreate data dir for each node
mkdir -p node/besu-0/data
mkdir -p node/besu-1/data
mkdir -p node/besu-2/data

echo "🔑 Generating keys and genesis file using Docker"

# Create a temporary container to generate keys
docker run --rm -v $(pwd):/workspace hyperledger/besu:24.1.2 \
  operator generate-blockchain-config \
  --config-file=/workspace/config/qbftConfigFile.json \
  --to=/workspace/networkFiles \
  --private-key-file-name=key

# Check if generation was successful
if [ ! -d "networkFiles" ]; then
  echo "❌ Error: Failed to generate network files"
  exit 1
fi

echo "✅ Network files generated successfully"

counter=0
# Copy keys to each node
for folder in networkFiles/keys/*; do
  if [ -d "$folder" ]; then
    folderName=$(basename "$folder")
    cp networkFiles/keys/$folderName/key node/besu-$counter/data/key
    cp networkFiles/keys/$folderName/key.pub node/besu-$counter/data/key.pub
    echo "✅ Copied keys for node $counter"
    ((counter++))
  fi
done

# Copy genesis to each node
mkdir genesis && cp networkFiles/genesis.json genesis/genesis.json
echo "✅ Genesis file created"

# Clean up temporary files
rm -rf networkFiles

if ! docker network ls | grep -q besu_network; then
  echo "🌐 Creating besu_network"
  docker network create besu_network
fi

echo "🚀 Starting bootnode"
# Start bootnode
docker-compose -f docker/docker-compose-bootnode.yaml up -d

# Retrieve bootnode enode address
max_retries=30
retry_delay=2
retry_count=0

echo "⏳ Waiting for bootnode to be ready..."
while [ $retry_count -lt $max_retries ]; do
  export ENODE=$(curl -s -X POST --data '{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}' http://127.0.0.1:8545 | jq -r '.result' 2>/dev/null)

  if [ -n "$ENODE" ]; then
    if [ "$ENODE" != "null" ] && [ "$ENODE" != "" ]; then
      echo "✅ ENODE retrieved successfully."
      break
    fi
  else
    echo "⏳ Waiting for bootnode... ($((retry_count + 1))/$max_retries)"
    sleep $retry_delay
    ((retry_count++))
  fi
done

if [ $retry_count -eq $max_retries ]; then
  echo "❌ Max retries reached. Unable to retrieve ENODE."
  exit 1
fi

echo "🔗 ENODE: $ENODE"

export E_ADDRESS="${ENODE#enode://}"
export DOCKER_NODE_1_ADDRESS=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' besu-node-0)
export E_ADDRESS=$(echo $E_ADDRESS | sed -e "s/127.0.0.1/$DOCKER_NODE_1_ADDRESS/g")
echo "🌐 Updated ENODE: enode://$E_ADDRESS"

# copy docker-compose-nodes to docker-compose-nodes overwriting the ENODE
sed "s/<ENODE>/enode:\/\/$E_ADDRESS/g" docker/templates/docker-compose-nodes.yaml > docker/docker-compose-nodes.yaml

# Start nodes
echo "🚀 Starting validator nodes"
docker-compose -f docker/docker-compose-nodes.yaml up -d

echo "⏳ Waiting for nodes to sync..."
sleep 15

echo "=========================================="
echo "🎉 AutoLogger Besu Network started!"
echo "=========================================="
echo "📊 Network Status:"
echo "   - Bootnode: http://localhost:8545"
echo "   - Node 1:   http://localhost:8546"
echo "   - Node 2:   http://localhost:8547"
echo "   - Chain ID: 2024"
echo "=========================================="

# Test network connectivity
echo "🔍 Testing network connectivity..."
for port in 8545 8546 8547; do
  if curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://127.0.0.1:$port > /dev/null; then
    echo "✅ Node on port $port is responding"
  else
    echo "❌ Node on port $port is not responding"
  fi
done

echo ""
echo "📦 Installing contract dependencies..."
cd contracts
npm install
npm install @openzeppelin/contracts
sleep 5

echo "🚀 Deploying VehicleServiceTracker contract..."
truffle migrate --f 1 --to 1 --network development

echo "✅ Contract deployment completed!"
echo "🔗 Contract address will be displayed above"
