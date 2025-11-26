FROM hyperledger/besu:24.1.2

USER root
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    bash \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY genesis/genesis.json /opt/besu/genesis.json
COPY contracts /app/contracts
COPY config /app/config

RUN npm install -g truffle

WORKDIR /app/contracts
RUN npm install && npm install @openzeppelin/contracts

WORKDIR /app

COPY scripts/init-besu.sh /app/init-besu.sh
RUN chmod +x /app/init-besu.sh

EXPOSE 8545

CMD ["/app/init-besu.sh"]

