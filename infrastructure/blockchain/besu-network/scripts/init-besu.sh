#!/bin/bash
set -euo pipefail

BESU_LOG="/opt/besu/data/besu.log"
MAX_STARTUP_TIME=180

echo "=========================================="
echo "  Besu - Clique (Single Validator)"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "Setting up..."
mkdir -p /opt/besu/data
chmod -R 755 /opt/besu

# Node key
if [ ! -f /opt/besu/data/key ]; then
    echo "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3" > /opt/besu/data/key
    chmod 600 /opt/besu/data/key
fi

touch "$BESU_LOG"

log "Starting Besu..."
besu \
  --data-path=/opt/besu/data \
  --genesis-file=/opt/besu/genesis.json \
  --node-private-key-file=/opt/besu/data/key \
  --rpc-http-enabled \
  --rpc-http-host=0.0.0.0 \
  --rpc-http-port=8545 \
  --rpc-http-cors-origins=* \
  --rpc-http-api=ETH,NET,WEB3,CLIQUE,ADMIN,MINER \
  --host-allowlist=* \
  --p2p-enabled=false \
  --min-gas-price=0 \
  --miner-enabled=true \
  --miner-coinbase=0x627306090abaB3A6e1400e9345bC60c78a8BEf57 \
  --logging=INFO \
  > "$BESU_LOG" 2>&1 &

BESU_PID=$!
log "PID: $BESU_PID"

sleep 5

if ! kill -0 "$BESU_PID" 2>/dev/null; then
    echo "FAILED TO START!"
    cat "$BESU_LOG"
    exit 1
fi

log "Waiting for RPC..."
elapsed=0
while [ $elapsed -lt $MAX_STARTUP_TIME ]; do
    if curl -sf -m 3 -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545 >/dev/null 2>&1; then
        log "✅ RPC READY!"
        break
    fi
    echo -n "."
    sleep 5
    elapsed=$((elapsed + 5))
done

if [ $elapsed -ge $MAX_STARTUP_TIME ]; then
    echo "TIMEOUT!"
    tail -100 "$BESU_LOG"
    exit 1
fi

# Deploy contracts usando HDWalletProvider (transações assinadas)
if [ -d "/app/contracts" ] && [ -z "${BESU_CONTRACT_ADDRESS:-}" ]; then
    log "Deploying contracts..."
    cd /app/contracts
    
    # Truffle config já está usando HDWalletProvider, então deve funcionar
    if truffle migrate --network development 2>&1 | tee /tmp/migrate.log; then
        # Extrair contract address dos logs ou do JSON
        CONTRACT=$(grep -oP 'contract address:\s*0x[a-fA-F0-9]{40}' /tmp/migrate.log 2>/dev/null | grep -oP '0x[a-fA-F0-9]{40}' | head -1)
        
        if [ -z "$CONTRACT" ]; then
            CONTRACT=$(node -pe "
                try {
                    const d=JSON.parse(require('fs').readFileSync('build/contracts/VehicleServiceTracker.json','utf8'));
                    const n=Object.keys(d.networks).find(k => d.networks[k].address);
                    d.networks[n]?.address || '';
                } catch(e) { '' }
            " 2>/dev/null || echo "")
        fi
        
        if [ -n "$CONTRACT" ] && [ "$CONTRACT" != "null" ]; then
            echo ""
            echo "✅ CONTRACT: $CONTRACT"
            echo "$CONTRACT" > /opt/besu/contract-address.txt
        else
            log "⚠️  Contract address not found in logs"
        fi
    fi
fi

echo ""
echo "✅ BESU READY!"
echo "   RPC: http://0.0.0.0:8545"
echo "   PID: $BESU_PID"
echo ""

cleanup() {
    kill -TERM "$BESU_PID" 2>/dev/null || true
    exit 0
}
trap cleanup SIGTERM SIGINT

while kill -0 "$BESU_PID" 2>/dev/null; do
    sleep 10
done

echo "Process died!"
tail -50 "$BESU_LOG"
exit 1
