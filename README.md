# 🚗 AutoLogger Service

<p align="center">
  <img src="https://img.shields.io/badge/Blockchain-Besu-blue" alt="Besu Blockchain" />
  <img src="https://img.shields.io/badge/Framework-NestJS-red" alt="NestJS" />
  <img src="https://img.shields.io/badge/Smart%20Contracts-Truffle-orange" alt="Truffle" />
  <img src="https://img.shields.io/badge/TypeScript-4.0+-blue" alt="TypeScript" />
</p>

## 📋 Descrição

Sistema de gestão veicular com blockchain privada Besu, desenvolvido com NestJS e contratos inteligentes Solidity. O AutoLogger permite registrar e verificar eventos de manutenção veicular de forma imutável e transparente.

## 🏗️ Arquitetura

- **Backend**: NestJS com TypeScript
- **Blockchain**: Hyperledger Besu (rede privada)
- **Smart Contracts**: Solidity com Truffle
- **Banco de Dados**: PostgreSQL
- **Containerização**: Docker & Docker Compose

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 16+
- Docker & Docker Compose
- Git

### Instalação

```bash
# Clonar repositório
git clone <repository-url>
cd autologger-service

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Editar .env com suas configurações
```

### Configuração da Rede Blockchain

```bash
# Configurar ambiente Truffle
./besu-network/scripts/setup-truffle.sh

# Iniciar rede Besu
docker-compose -f docker-compose.besu.yml up -d

# Deploy dos contratos
npm run blockchain:deploy
```

### Executar Aplicação

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## 📦 Scripts Disponíveis

### Aplicação Principal
```bash
npm run start          # Iniciar aplicação
npm run start:dev      # Modo desenvolvimento
npm run start:prod     # Modo produção
npm run build          # Compilar aplicação
npm run test           # Executar testes
```

### Blockchain (Truffle)
```bash
npm run truffle:compile    # Compilar contratos
npm run truffle:migrate    # Deploy na rede Besu
npm run truffle:test       # Testar contratos
npm run truffle:console    # Console interativo
npm run blockchain:deploy  # Deploy completo
```

### Banco de Dados
```bash
npm run typeorm:migration:generate  # Gerar migração
npm run typeorm:migration:run       # Executar migrações
npm run typeorm:schema:sync         # Sincronizar schema
```

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```bash
# Aplicação
PORT=3000
NODE_ENV=development

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=autologger
DB_PASSWORD=password
DB_DATABASE=autologger_db

# Blockchain Besu
USE_BESU_NETWORK=true
BESU_RPC_URL=http://localhost:8545
BESU_PRIVATE_KEY=0x...
BESU_CONTRACT_ADDRESS=0x...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

## 📁 Estrutura do Projeto

```
autologger-service/
├── src/                          # Código fonte NestJS
│   ├── blockchain/               # Módulos blockchain
│   ├── auth/                     # Autenticação
│   ├── modules/                  # Módulos da aplicação
│   └── common/                   # Utilitários comuns
├── besu-network/                 # Rede blockchain Besu
│   ├── truffle/                  # Configuração Truffle
│   │   ├── contracts/            # Contratos Solidity
│   │   ├── migrations/           # Scripts de deploy
│   │   ├── test/                 # Testes dos contratos
│   │   └── build/                # Artefatos compilados
│   ├── scripts/                  # Scripts de automação
│   └── nodes/                    # Chaves dos nós
├── docker-compose.yml            # Serviços principais
├── docker-compose.besu.yml      # Rede Besu
└── package.json                  # Dependências e scripts
```

## 🧪 Testes

### Testes da Aplicação
```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura de testes
npm run test:cov
```

### Testes dos Contratos
```bash
cd besu-network/truffle
npm run test
```

## 🐳 Docker

### Serviços Principais
```bash
# Iniciar todos os serviços
docker-compose up -d

# Apenas banco de dados
docker-compose up -d postgres

# Apenas aplicação
docker-compose up -d backend
```

### Rede Besu
```bash
# Iniciar rede blockchain
docker-compose -f docker-compose.besu.yml up -d

# Parar rede
docker-compose -f docker-compose.besu.yml down
```

## 📚 Documentação

- [Configuração Besu](./BESU_SIMPLIFICADO.md)
- [Implementação Blockchain](./IMPLEMENTACAO_BESU.md)
- [Truffle Configuration](./besu-network/truffle/README.md)

## 🔗 APIs

### Endpoints Principais

- `GET /api/blockchain/status` - Status da rede blockchain
- `POST /api/blockchain/services/submit` - Registrar serviço
- `GET /api/blockchain/services/:id` - Consultar serviço
- `POST /api/auth/login` - Autenticação
- `GET /api/vehicles` - Listar veículos

### Documentação Swagger

Acesse `http://localhost:3000/api` para ver a documentação completa da API.

## 🛠️ Desenvolvimento

### Estrutura de Contratos

1. **AutoLoggerRegistry**: Registro de hashes de eventos
2. **VehicleServiceTracker**: Rastreamento de serviços veiculares

### Fluxo de Deploy

1. Desenvolver contratos em `besu-network/truffle/contracts/`
2. Criar migrations em `besu-network/truffle/migrations/`
3. Testar com `npm run truffle:test`
4. Deploy com `npm run blockchain:deploy`

## 🚨 Troubleshooting

### Problemas Comuns

1. **Rede Besu não conecta**
   ```bash
   # Verificar se está rodando
   docker-compose -f docker-compose.besu.yml ps
   
   # Verificar logs
   docker-compose -f docker-compose.besu.yml logs
   ```

2. **Contratos não compilam**
   ```bash
   cd besu-network/truffle
   truffle compile --verbose
   ```

3. **Deploy falha**
   ```bash
   # Verificar chave privada
   echo $BESU_PRIVATE_KEY
   
   # Verificar saldo da conta
   truffle console --network besu
   ```

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
