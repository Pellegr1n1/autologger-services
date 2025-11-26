#!/bin/bash
set -euo pipefail

# ============================================
# AutoLogger Besu - Initialization Script
# ============================================

BESU_LOG="/opt/besu/data/besu.log"
MAX_STARTUP_TIME=180
RPC_CHECK_INTERVAL=5
CONTRACT_DEPLOY_TIMEOUT=120

echo "=========================================="
echo "  AutoLogger Besu - AWS ECS"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=========================================="

# Funções de log
log_info() { echo "[INFO $(date '+%H:%M:%S')] $1"; }
log_error() { echo "[ERROR $(date '+%H:%M:%S')] $1" >&2; }
log_warn() { echo "[WARN $(date '+%H:%M:%S')] $1"; }

# Verificar recursos do sistema
log_info "=== System Resources ==="
echo "  Memory: $(free -h | grep Mem | awk '{print "Total: " $2 ", Used: " $3 ", Available: " $4}')"
echo "  CPU Cores: $(nproc)"
echo "  Disk Space: $(df -h /opt/besu 2>/dev/null | tail -1 | awk '{print "Total: " $2 ", Used: " $3 ", Available: " $4}' || echo 'N/A')"
echo "  Java Version: $(java -version 2>&1 | head -n 1)"
echo "  Node Version: $(node --version 2>/dev/null || echo 'N/A')"
echo "  Truffle Version: $(truffle version 2>/dev/null | head -n 1 || echo 'N/A')"
echo ""

# Criar e configurar diretórios
log_info "Setting up directories..."
mkdir -p /opt/besu/data
chmod 755 /opt/besu
chmod 755 /opt/besu/data
# Não fazer chmod recursivo em /app (pode ter node_modules e ser muito lento)
# Apenas garantir que o script seja executável
chmod +x /app/init-besu.sh 2>/dev/null || true

# Verificar genesis.json
if [ ! -f /opt/besu/genesis.json ]; then
    log_error "Genesis file not found at /opt/besu/genesis.json"
    log_error "Available files:"
    ls -la /opt/besu/ 2>/dev/null || true
    exit 1
fi

GENESIS_SIZE=$(stat -c%s /opt/besu/genesis.json 2>/dev/null || stat -f%z /opt/besu/genesis.json)
log_info "✅ Genesis file found (${GENESIS_SIZE} bytes)"

# Validar JSON do genesis
if ! jq empty /opt/besu/genesis.json 2>/dev/null; then
    log_error "Genesis file is not valid JSON!"
    cat /opt/besu/genesis.json
    exit 1
fi
log_info "✅ Genesis JSON is valid"

# Configurar chave privada do nó
if [ ! -f /opt/besu/data/key ]; then
    log_info "Generating node private key..."
    echo "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3" > /opt/besu/data/key
    chmod 600 /opt/besu/data/key
else
    log_info "Using existing node key"
fi
log_info "✅ Node key configured"

# Preparar arquivo de log
touch "$BESU_LOG"
chmod 644 "$BESU_LOG"

BESU_CMD="besu \
  --data-path=/opt/besu/data \
  --genesis-file=/opt/besu/genesis.json \
  --node-private-key-file=/opt/besu/data/key \
  --rpc-http-enabled \
  --rpc-http-host=0.0.0.0 \
  --rpc-http-port=8545 \
  --rpc-http-cors-origins=* \
  --rpc-http-api=ETH,NET,WEB3,QBFT,ADMIN,DEBUG,TXPOOL \
  --host-allowlist=* \
  --p2p-enabled=false \
  --min-gas-price=0 \
  --logging=INFO"

log_info "=== Starting Besu Node ==="
log_info "Mode: Single validator (P2P disabled)"
log_info "RPC: http://0.0.0.0:8545"
log_info "Command: $BESU_CMD"
echo ""

# Iniciar Besu em background
eval "$BESU_CMD" > "$BESU_LOG" 2>&1 &
BESU_PID=$!

log_info "Besu started with PID: $BESU_PID"

# Aguardar processo iniciar
sleep 5

# Verificar se processo está rodando
if ! kill -0 "$BESU_PID" 2>/dev/null; then
    log_error "Besu process failed to start!"
    echo ""
    echo "=== BESU LOG (ALL) ==="
    cat "$BESU_LOG" 2>/dev/null || echo "No log file available"
    echo "======================"
    echo ""
    log_error "Process status:"
    ps aux | grep -E "(besu|java)" || echo "No processes found"
    exit 1
fi

log_info "✅ Besu process is running"

# Aguardar um pouco para logs aparecerem
sleep 3

# Mostrar logs iniciais
echo ""
echo "=== Initial Besu Logs (first 30 lines) ==="
if [ -f "$BESU_LOG" ] && [ -s "$BESU_LOG" ]; then
    head -30 "$BESU_LOG" 2>/dev/null || echo "No logs yet"
else
    log_warn "Log file is empty or doesn't exist yet"
    log_info "Checking if Besu process is writing logs..."
    sleep 2
    if [ -f "$BESU_LOG" ] && [ -s "$BESU_LOG" ]; then
        head -30 "$BESU_LOG" 2>/dev/null || echo "Still no logs"
    else
        log_error "Besu is not writing to log file!"
        log_info "Checking process status..."
        ps aux | grep -E "(besu|java)" | grep -v grep || echo "No besu/java process found"
    fi
fi
echo "==========================================="
echo ""

# Aguardar RPC ficar disponível
log_info "Waiting for Besu RPC to be ready..."
log_info "Timeout: ${MAX_STARTUP_TIME}s | Check interval: ${RPC_CHECK_INTERVAL}s"

elapsed=0
last_log_line=""
log_check=0

while [ $elapsed -lt $MAX_STARTUP_TIME ]; do
    # Verificar se processo ainda está vivo
    if ! kill -0 "$BESU_PID" 2>/dev/null; then
        log_error "Besu process died during startup!"
        echo ""
        echo "=== LAST 100 LINES OF LOG ==="
        tail -100 "$BESU_LOG" 2>/dev/null || echo "No log file"
        echo "============================="
        echo ""
        log_error "Process status:"
        ps aux | grep -E "(besu|java)" || echo "No processes found"
        exit 1
    fi
    
    # Testar conexão RPC
    if curl -sf -m 3 -X POST \
        -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545 >/dev/null 2>&1; then
        echo ""
        log_info "✅ Besu RPC is ready!"
        break
    fi
    
    # Mostrar progresso
    echo -n "."
    
    # A cada 10 segundos, mostrar logs
    if [ $((elapsed % 10)) -eq 0 ] && [ $elapsed -gt 0 ]; then
        echo ""
        if [ -f "$BESU_LOG" ] && [ -s "$BESU_LOG" ]; then
            current_line=$(tail -1 "$BESU_LOG" 2>/dev/null | sed 's/^[[:space:]]*//' || echo "")
            if [ -n "$current_line" ] && [ "$current_line" != "$last_log_line" ]; then
                log_info "Latest log: ${current_line:0:120}"
                last_log_line="$current_line"
            fi
            
            # A cada 20s, mostrar mais contexto
            if [ $log_check -ge 1 ]; then
                echo ""
                echo "=== Recent Besu Logs (last 10 lines) ==="
                tail -10 "$BESU_LOG" 2>/dev/null || echo "No logs"
                echo "======================================="
                echo ""
                log_check=0
            else
                log_check=$((log_check + 1))
            fi
        else
            log_warn "Log file is empty or doesn't exist"
        fi
    fi
    
    sleep $RPC_CHECK_INTERVAL
    elapsed=$((elapsed + RPC_CHECK_INTERVAL))
done

echo ""

# Verificar se RPC está disponível
if [ $elapsed -ge $MAX_STARTUP_TIME ]; then
    log_error "Besu RPC failed to start within timeout (${MAX_STARTUP_TIME}s)"
    echo ""
    echo "=== FULL BESU LOG ==="
    cat "$BESU_LOG" 2>/dev/null || echo "No log file"
    echo "====================="
    echo ""
    
    if kill -0 "$BESU_PID" 2>/dev/null; then
        log_warn "⚠️  Besu process is running but RPC is not responding"
        log_warn ""
        log_warn "Possible causes:"
        log_warn "  1. Insufficient memory (check task definition)"
        log_warn "  2. Port 8545 already in use"
        log_warn "  3. Genesis configuration issue"
        log_warn "  4. Java heap size too small"
        log_warn ""
        log_warn "Memory usage:"
        free -h
    else
        log_error "❌ Besu process is not running"
    fi
    exit 1
fi

# Testar RPC e obter informações
log_info "Testing RPC endpoints..."

# Block number
BLOCK_RESPONSE=$(curl -sf -m 10 -X POST \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 2>/dev/null || echo "")

if echo "$BLOCK_RESPONSE" | grep -q "result"; then
    BLOCK_HEX=$(echo "$BLOCK_RESPONSE" | jq -r '.result' 2>/dev/null || echo "0x0")
    BLOCK_DEC=$((16#${BLOCK_HEX#0x}))
    log_info "  Block number: $BLOCK_DEC ($BLOCK_HEX)"
else
    log_warn "  Could not retrieve block number"
fi

# Chain ID
CHAIN_RESPONSE=$(curl -sf -m 10 -X POST \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
    http://localhost:8545 2>/dev/null || echo "")

if echo "$CHAIN_RESPONSE" | grep -q "result"; then
    CHAIN_ID=$(echo "$CHAIN_RESPONSE" | jq -r '.result' 2>/dev/null)
    log_info "  Chain ID: $CHAIN_ID"
fi

# Accounts
ACCOUNTS_RESPONSE=$(curl -sf -m 10 -X POST \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' \
    http://localhost:8545 2>/dev/null || echo "")

if echo "$ACCOUNTS_RESPONSE" | grep -q "result"; then
    ACCOUNTS_COUNT=$(echo "$ACCOUNTS_RESPONSE" | jq '.result | length' 2>/dev/null || echo "0")
    log_info "  Accounts: $ACCOUNTS_COUNT"
fi

echo ""

# Deploy de Smart Contracts
if [ -n "${BESU_CONTRACT_ADDRESS:-}" ]; then
    log_info "Contract address already set: $BESU_CONTRACT_ADDRESS"
    log_info "Skipping contract deployment"
elif [ -d "/app/contracts" ]; then
    log_info "=== Deploying Smart Contracts ==="
    
    cd /app/contracts
    
    # Verificar se existe truffle-config.js
    if [ ! -f "truffle-config.js" ]; then
        log_error "truffle-config.js not found!"
        log_warn "Skipping contract deployment"
    else
        log_info "Compiling contracts..."
        
        if timeout $CONTRACT_DEPLOY_TIMEOUT truffle compile 2>&1 | tee /tmp/compile.log; then
            log_info "✅ Contracts compiled successfully"
            
            log_info "Migrating contracts..."
            
            if timeout $CONTRACT_DEPLOY_TIMEOUT truffle migrate --network development --reset 2>&1 | tee /tmp/migrate.log; then
                log_info "✅ Contracts migrated successfully"
                
                # Extrair endereço do contrato
                CONTRACT_FILE="build/contracts/VehicleServiceTracker.json"
                
                if [ -f "$CONTRACT_FILE" ]; then
                    CONTRACT_ADDRESS=$(node -pe "
                        try {
                            const data = JSON.parse(require('fs').readFileSync('$CONTRACT_FILE', 'utf8'));
                            const networks = data.networks;
                            const networkId = Object.keys(networks)[0];
                            networks[networkId] ? networks[networkId].address : '';
                        } catch(e) {
                            console.error('Error:', e.message);
                            '';
                        }
                    " 2>/dev/null)
                    
                    if [ -n "$CONTRACT_ADDRESS" ] && [ "$CONTRACT_ADDRESS" != "undefined" ] && [ "$CONTRACT_ADDRESS" != "null" ]; then
                        echo ""
                        echo "=========================================="
                        echo "✅ CONTRACT DEPLOYED SUCCESSFULLY!"
                        echo "=========================================="
                        echo ""
                        echo "  Contract: VehicleServiceTracker"
                        echo "  Address:  $CONTRACT_ADDRESS"
                        echo ""
                        echo "Backend Environment Variables:"
                        echo "  BESU_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
                        echo "  BESU_RPC_URL=http://besu.autologger-dev.local:8545"
                        echo ""
                        echo "=========================================="
                        echo ""
                        
                        # Salvar endereço
                        echo "$CONTRACT_ADDRESS" > /opt/besu/contract-address.txt
                        export BESU_CONTRACT_ADDRESS="$CONTRACT_ADDRESS"
                    else
                        log_error "Failed to extract contract address"
                        log_error "Migration output:"
                        tail -50 /tmp/migrate.log
                    fi
                else
                    log_error "Contract JSON file not found: $CONTRACT_FILE"
                    log_error "Available files in build/contracts:"
                    ls -la build/contracts/ 2>/dev/null || echo "Directory not found"
                fi
            else
                log_error "Contract migration failed!"
                echo ""
                echo "=== Migration Log ==="
                cat /tmp/migrate.log
                echo "===================="
            fi
        else
            log_error "Contract compilation failed!"
            echo ""
            echo "=== Compilation Log ==="
            cat /tmp/compile.log
            echo "======================"
        fi
    fi
else
    log_warn "Contracts directory not found at /app/contracts"
    log_warn "Skipping contract deployment"
fi

echo ""
echo "=========================================="
echo "✅ BESU NODE READY FOR PRODUCTION!"
echo "=========================================="
echo ""
echo "  Status:   Running"
echo "  RPC:      http://0.0.0.0:8545"
echo "  Process:  PID $BESU_PID"
echo "  Log:      $BESU_LOG"
echo "  Mode:     Single validator (QBFT)"
if [ -n "${BESU_CONTRACT_ADDRESS:-}" ]; then
    echo "  Contract: $BESU_CONTRACT_ADDRESS"
fi
echo ""
echo "=========================================="
echo ""

# Função de cleanup para graceful shutdown
cleanup() {
    log_info "Received termination signal..."
    log_info "Initiating graceful shutdown..."
    
    if kill -0 "$BESU_PID" 2>/dev/null; then
        log_info "Stopping Besu (PID: $BESU_PID)..."
        kill -TERM "$BESU_PID" 2>/dev/null || true
        
        # Aguardar até 30 segundos para shutdown gracioso
        for i in {1..30}; do
            if ! kill -0 "$BESU_PID" 2>/dev/null; then
                log_info "✅ Besu stopped gracefully"
                exit 0
            fi
            sleep 1
        done
        
        # Force kill se ainda estiver rodando
        log_warn "Force killing Besu..."
        kill -9 "$BESU_PID" 2>/dev/null || true
    fi
    
    log_info "Shutdown complete"
    exit 0
}

# Registrar signal handlers
trap cleanup SIGTERM SIGINT SIGQUIT

# Loop de monitoramento
log_info "Monitoring Besu process (Ctrl+C to stop)..."
echo ""

check_count=0
last_health_check=0

while kill -0 "$BESU_PID" 2>/dev/null; do
    sleep 10
    check_count=$((check_count + 1))
    uptime_seconds=$((check_count * 10))
    
    # Log status a cada 1 minuto (6 x 10s)
    if [ $((check_count % 6)) -eq 0 ]; then
        uptime_minutes=$((uptime_seconds / 60))
        log_info "Uptime: ${uptime_minutes}m (${uptime_seconds}s) - Process healthy"
        
        # Health check do RPC a cada 2 minutos
        if [ $((check_count - last_health_check)) -ge 12 ]; then
            if curl -sf -m 5 -X POST \
                -H "Content-Type: application/json" \
                --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
                http://localhost:8545 >/dev/null 2>&1; then
                log_info "  RPC: Healthy ✓"
            else
                log_warn "  RPC: Not responding (but process is alive)"
            fi
            last_health_check=$check_count
        fi
    fi
done

log_error "❌ Besu process exited unexpectedly!"
echo ""
echo "=== LAST 100 LINES OF LOG ==="
tail -100 "$BESU_LOG" 2>/dev/null || echo "No log file"
echo "============================="
echo ""
log_error "Exit code: $?"
exit 1