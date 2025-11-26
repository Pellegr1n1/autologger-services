FROM hyperledger/besu:24.10.0

USER root

# Instalar dependências básicas
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    bash \
    procps \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Instalar Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Instalar Truffle globalmente
RUN npm install -g truffle@5.11.5

# Criar estrutura de diretórios
RUN mkdir -p /opt/besu/data /app/contracts /app/config && \
    chmod -R 755 /opt/besu /app

WORKDIR /app

# Copiar arquivos de configuração
COPY genesis/genesis.json /opt/besu/genesis.json
COPY config /app/config

# Copiar contratos
COPY contracts/package*.json /app/contracts/
WORKDIR /app/contracts
RUN npm ci --only=production && \
    npm install @openzeppelin/contracts

COPY contracts /app/contracts

# Voltar para /app
WORKDIR /app

# Copiar script de inicialização
COPY scripts/init-besu.sh /app/init-besu.sh
RUN chmod +x /app/init-besu.sh

# Configurar variáveis de ambiente Java
ENV JAVA_OPTS="-Xmx2g -Xms2g -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/opt/besu/data"
ENV BESU_OPTS="--Xlog-gc=false"

# Expor portas
EXPOSE 8545 30303

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=3 \
    CMD curl -sf -m 5 -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545 || exit 1

# Sobrescrever ENTRYPOINT e executar script
ENTRYPOINT []
CMD ["bash", "/app/init-besu.sh"]