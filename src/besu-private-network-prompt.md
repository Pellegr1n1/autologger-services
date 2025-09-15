# Prompt para IA do Cursor: Implementação Rede Besu Privada para AutoLogger

## Contexto do Projeto
Estou desenvolvendo o **AutoLogger**, uma aplicação de gestão veicular que registra eventos de manutenção e serviços em blockchain para garantir imutabilidade e transparência. O sistema será usado por proprietários de veículos para registrar histórico de manutenções que será verificável por futuros compradores.

## Objetivo
Implementar uma **rede blockchain privada usando Hyperledger Besu** para o projeto AutoLogger, seguindo as melhores práticas de configuração para um ambiente de produção. A rede deve ser otimizada para registrar hashes de eventos veiculares de forma rápida e econômica.

## Especificações da Rede

### Configuração da Rede:
- **Network ID**: 2024 (customizado para AutoLogger)
- **Algoritmo de Consenso**: IBFT 2.0 (Istanbul Byzantine Fault Tolerant)
- **Número de Nós**: 4 nós iniciais (3 validadores + 1 observador)
- **Tempo de Bloco**: 5 segundos
- **Gas Price**: 0 (rede privada sem custos)
- **Chain ID**: 2024

### Arquitetura dos Nós:
```
Nó 1: Validador Principal (bootnode)
Nó 2: Validador Secundário  
Nó 3: Validador Terciário
Nó 4: Nó Observador (para consultas)
```

## Requisitos de Implementação

### 1. Estrutura de Arquivos
Criar a seguinte estrutura de diretórios:
```
besu-network/
├── docker-compose.yml
├── genesis.json
├── nodes/
│   ├── node1/
│   │   ├── key
│   │   └── key.pub
│   ├── node2/
│   │   ├── key  
│   │   └── key.pub
│   ├── node3/
│   │   ├── key
│   │   └── key.pub
│   └── node4/
│       ├── key
│       └── key.pub
├── scripts/
│   ├── generate-keys.sh
│   ├── start-network.sh
│   └── stop-network.sh
└── README.md
```

### 2. Genesis Configuration
O genesis.json deve incluir:
- Configuração IBFT 2.0 
- 4 contas pré-financiadas para testes
- Validadores iniciais configurados
- Parâmetros otimizados para desenvolvimento

### 3. Docker Compose
Configurar docker-compose.yml com:
- 4 serviços besu (node1-4)
- Volumes persistentes para cada nó
- Network bridge personalizada
- Portas expostas adequadamente
- Health checks para todos os nós

### 4. Configuração dos Nós

#### Nó 1 (Bootnode + Validador):
- RPC HTTP habilitado na porta 8545
- P2P na porta 30303
- APIs: ETH, NET, WEB3, IBFT, ADMIN
- Configurado como bootnode

#### Nós 2-3 (Validadores):
- RPC HTTP habilitado em portas sequenciais (8546, 8547)
- P2P em portas sequenciais (30304, 30305)
- Conectam ao bootnode (node1)
- APIs básicas: ETH, NET, WEB3

#### Nó 4 (Observador):
- RPC HTTP na porta 8548
- P2P na porta 30306
- Não participa do consenso
- Usado para consultas read-only

### 5. Scripts Auxiliares

#### generate-keys.sh:
- Gerar chaves privadas/públicas para todos os nós
- Criar addresses dos validadores
- Configurar permissões adequadas

#### start-network.sh:
- Validar configurações
- Subir nós em ordem correta
- Aguardar sincronização
- Mostrar status da rede

#### stop-network.sh:
- Parar nós graciosamente
- Preservar dados persistentes

### 6. Configurações de Segurança
- HTTPS apenas para produção
- Host allowlist configurado adequadamente
- CORS origins restrito ao frontend
- Logs detalhados mas não verbosos

### 7. Integração com AutoLogger

#### Variáveis de Ambiente:
```
ETHEREUM_RPC_URL=http://localhost:8545
ETHEREUM_NETWORK_ID=2024
ETHEREUM_PRIVATE_KEY=<chave_para_transacoes>
ETHEREUM_CONTRACT_ADDRESS=<endereco_contrato_autologger>
```

#### Contrato Inteligente:
Criar um contrato simples em Solidity para registrar hashes de eventos:
```solidity
contract AutoLoggerRegistry {
    mapping(bytes32 => bool) public registeredHashes;
    mapping(bytes32 => uint256) public hashTimestamps;
    
    event HashRegistered(bytes32 indexed hash, address indexed owner, uint256 timestamp);
    
    function registerHash(bytes32 _hash) external {
        // Implementação para registrar hash de evento
    }
    
    function verifyHash(bytes32 _hash) external view returns (bool, uint256) {
        // Implementação para verificar hash
    }
}
```

## Requisitos Específicos para o Código

### Performance:
- Tempo de inicialização < 30 segundos
- Sincronização entre nós < 10 segundos
- Processamento de transação < 5 segundos

### Monitoramento:
- Health checks funcionais
- Logs estruturados
- Métricas básicas de performance

### Desenvolvimento:
- Comentários explicativos em português
- README.md detalhado com instruções
- Exemplos de uso da API JSON-RPC

## Comandos Esperados

### Para desenvolvimento:
```bash
# Iniciar rede completa
./scripts/start-network.sh

# Verificar status
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' localhost:8545

# Parar rede
./scripts/stop-network.sh
```

### Para produção:
```bash
# Deploy com Docker Compose
docker-compose up -d

# Verificar saúde da rede
docker-compose ps
docker-compose logs besu-node1
```

## Documentação Necessária

### README.md deve incluir:
1. Introdução ao projeto AutoLogger
2. Pré-requisitos de instalação
3. Guia passo-a-passo de configuração
4. Exemplos de uso da API
5. Troubleshooting comum
6. Comandos úteis para desenvolvimento

### Comentários no código:
- Explicar cada parâmetro do Besu
- Documentar configurações específicas
- Incluir links para documentação oficial

## Referências para Consulta
- Documentação oficial Besu: https://besu.hyperledger.org/private-networks/get-started/start-node
- Exemplos de rede privada com IBFT 2.0
- Padrões Docker para blockchain networks
- Melhores práticas de segurança para redes privadas

## Resultado Esperado
Uma implementação completa que:

1. **Mantém a arquitetura NestJS existente** - Sem quebrar nada do que já funciona
2. **Adiciona módulo blockchain nativo** - Seguindo padrões NestJS (módulo, serviço, configuração)
3. **Integra com TypeORM existente** - Salvando hash da blockchain nas entidades Event
4. **Usa sistema de logging atual** - Aproveitando Logger do NestJS já implementado
5. **Funciona com Docker Compose** - Expandindo configuração existente
6. **Mantém variáveis de ambiente** - Usando ConfigService do NestJS
7. **Segue estrutura modular** - Blockchain como módulo independente e reutilizável

**Arquivos principais a serem criados/modificados:**
- ✅ `src/blockchain/` - Novo módulo completo
- ✅ `blockchain-network/` - Configuração da rede Besu  
- ✅ `docker-compose.yml` - Adicionar serviços Besu
- ✅ `.env` - Variáveis de blockchain
- ✅ `src/events/events.service.ts` - Integrar com blockchain
- ✅ Scripts automatizados para desenvolvimento

**Prioridades:**
1. Código que funciona perfeitamente com o NestJS existente
2. Não quebrar funcionalidades atuais 
3. Fácil de testar e demonstrar
4. Documentação em português para TCC
5. Seguir padrões já estabelecidos no projeto