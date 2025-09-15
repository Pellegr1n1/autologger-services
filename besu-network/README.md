# 🚗 AutoLogger Besu Network

Rede blockchain privada Besu configurada especificamente para o projeto AutoLogger Service.

## 📋 Visão Geral

Esta rede Besu privada foi adaptada do repositório [besu-workshop](https://github.com/samuelvenzi/besu-workshop) para atender às necessidades específicas do AutoLogger Service, um sistema de gestão veicular com blockchain.

## 🏗️ Arquitetura da Rede

- **Consenso**: QBFT (Quorum Byzantine Fault Tolerance)
- **Nós**: 3 validadores + 1 bootnode
- **Chain ID**: 2024
- **Período de Bloco**: 2 segundos
- **Gas Price**: 0 (para desenvolvimento)

### Estrutura dos Nós

| Nó | Tipo | Porta RPC | Porta P2P | Descrição |
|----|------|-----------|-----------|-----------|
| besu-node-0 | Bootnode | 8545 | 30303 | Nó principal e bootnode |
| besu-node-1 | Validador | 8546 | 30304 | Validador secundário |
| besu-node-2 | Validador | 8547 | 30305 | Validador terciário |

## 🚀 Início Rápido

### Pré-requisitos

- Docker e Docker Compose
- Node.js 16+
- Besu CLI (opcional, para desenvolvimento local)
- Truffle CLI

### Instalação

```bash
# Instalar dependências do Truffle
cd besu-network/contracts
npm install

# Instalar Truffle globalmente (se necessário)
npm install -g truffle
```

### Iniciar a Rede

```bash
# Opção 1: Usando script do projeto principal
npm run blockchain:start

# Opção 2: Usando script direto
cd besu-network
./start-besu.sh
```

### Parar a Rede

```bash
# Opção 1: Usando script do projeto principal
npm run blockchain:stop

# Opção 2: Usando script direto
cd besu-network
./scripts/stop-besu.sh
```

### Deploy dos Contratos

```bash
# Opção 1: Usando script do projeto principal
npm run blockchain:deploy

# Opção 2: Usando script direto
cd besu-network/contracts
./scripts/deploy-truffle.sh
```

## 📊 Contas Pré-configuradas

A rede vem com 3 contas pré-configuradas para testes:

| Conta | Endereço | Chave Privada | Saldo | Descrição |
|-------|----------|---------------|-------|-----------|
| Main Account | `0x6273...Bf57` | `c87509a1...` | 100,000 ETH | Conta principal para deploy |
| Service Provider | `0xf17f...6b732` | `ae6ae8e5...` | 50,000 ETH | Provedor de serviços |
| Vehicle Owner | `0xfe3b...dbd73` | `8f2a5594...` | 30,000 ETH | Proprietário de veículo |

## 🔧 Configuração

### Arquivos de Configuração

- `config/qbftConfigFile.json` - Configuração do consenso QBFT
- `contracts/truffle-config.js` - Configuração do Truffle
- `docker/docker-compose-bootnode.yaml` - Configuração do bootnode
- `docker/templates/docker-compose-nodes.yaml` - Template dos nós validadores

### Variáveis de Ambiente

```bash
# Adicionar ao .env do projeto principal
BESU_RPC_URL=http://localhost:8545
BESU_PRIVATE_KEY=c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3
BESU_CONTRACT_ADDRESS=<endereço_do_contrato>
BESU_CHAIN_ID=2024
```

## 📝 Scripts Disponíveis

### Scripts de Rede

- `start-besu.sh` - Inicia a rede Besu (script principal)
- `scripts/stop-besu.sh` - Para a rede Besu
- `scripts/deploy-truffle.sh` - Deploy dos contratos

### Scripts Truffle

```bash
# Compilar contratos
truffle compile

# Deploy na rede
truffle migrate --network development

# Console interativo
truffle console --network development

# Executar testes
truffle test
```

## 🧪 Testando a Rede

### Verificar Status da Rede

```bash
# Verificar se os nós estão rodando
docker ps | grep besu

# Verificar logs
docker logs besu-node-0
docker logs besu-node-1
docker logs besu-node-2
```

### Testar Conexão RPC

```bash
# Verificar altura do bloco
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545

# Verificar informações da rede
curl -X POST --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' http://localhost:8545
```

### Testar Contratos

```bash
# Entrar no console Truffle
cd contracts
truffle console --network development

# No console:
# const contract = await VehicleServiceTracker.deployed()
# const totalServices = await contract.totalServices()
# console.log("Total Services:", totalServices.toString())
```

## 🔍 Monitoramento

### Métricas

- **Prometheus**: http://localhost:9545 (métricas do nó principal)
- **Grafana**: Configurado no projeto principal

### Logs

```bash
# Ver logs em tempo real
docker logs -f besu-node-0

# Ver logs de todos os nós
docker-compose -f docker/docker-compose-bootnode.yaml logs
docker-compose -f docker/docker-compose-nodes.yaml logs
```

## 🛠️ Desenvolvimento

### Estrutura de Arquivos

```
besu-network/
├── config/                 # Configurações da rede
│   └── qbftConfigFile.json
├── contracts/              # Contratos Solidity
│   ├── contracts/
│   ├── migrations/
│   ├── test/
│   └── truffle-config.js
├── docker/                 # Configurações Docker
│   ├── docker-compose-bootnode.yaml
│   └── templates/
├── genesis/                # Arquivo genesis (gerado)
├── node/                   # Dados dos nós (gerado)
│   ├── besu-0/
│   ├── besu-1/
│   └── besu-2/
├── scripts/                # Scripts de automação
│   ├── stop-besu.sh
│   └── deploy-truffle.sh
└── start-besu.sh           # Script principal de inicialização
```

### Adicionando Novos Contratos

1. Criar arquivo `.sol` em `contracts/contracts/`
2. Criar migration em `contracts/migrations/`
3. Compilar: `truffle compile`
4. Deploy: `truffle migrate --network development`

### Modificando Configurações

- **Consenso**: Editar `config/qbftConfigFile.json`
- **Rede**: Editar `docker/docker-compose-*.yaml`
- **Truffle**: Editar `contracts/truffle-config.js`

## 🚨 Troubleshooting

### Problemas Comuns

1. **Rede não inicia**
   ```bash
   # Verificar se Docker está rodando
   docker ps
   
   # Limpar containers antigos
   docker system prune -f
   ```

2. **Contratos não compilam**
   ```bash
   # Verificar versão do Solidity
   truffle compile --verbose
   
   # Verificar dependências
   npm install
   ```

3. **Deploy falha**
   ```bash
   # Verificar se a rede está rodando
   curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545
   
   # Verificar saldo da conta
   truffle console --network development
   ```

4. **Nós não sincronizam**
   ```bash
   # Verificar logs
   docker logs besu-node-0
   
   # Reiniciar rede
   ./scripts/stop-besu.sh
   ./scripts/start-besu.sh
   ```

## 📚 Recursos Adicionais

- [Documentação Besu](https://besu.hyperledger.org/)
- [Truffle Documentation](https://trufflesuite.com/docs/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [QBFT Consensus](https://besu.hyperledger.org/en/stable/HowTo/Configure/Consensus-Protocols/QBFT/)

## 🤝 Contribuição

Para contribuir com melhorias na rede Besu:

1. Faça suas alterações
2. Teste localmente
3. Documente as mudanças
4. Submeta um pull request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](../../LICENSE) para detalhes.
