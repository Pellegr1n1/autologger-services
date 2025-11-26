FROM hyperledger/besu:24.1.2

# Instalar Node.js e dependências
# A imagem Besu é baseada em Debian, então usamos apt
USER root
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Instalar Node.js via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar arquivos do Besu
COPY genesis/genesis.json /opt/besu/genesis.json
COPY contracts /app/contracts
COPY config /app/config

# Instalar Truffle globalmente
RUN npm install -g truffle

# Instalar dependências dos contratos
WORKDIR /app/contracts
RUN npm install && npm install @openzeppelin/contracts

# Voltar para raiz
WORKDIR /app

# Copiar script de inicialização
COPY scripts/init-besu.sh /app/init-besu.sh
RUN chmod +x /app/init-besu.sh

# Expor porta RPC
EXPOSE 8545

# Comando de inicialização
CMD ["/app/init-besu.sh"]

