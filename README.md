# AutoLogger Service - Sistema de Gerenciamento de Veículos com Blockchain

📋 **Sobre o Projeto**

O AutoLogger Service é uma API REST desenvolvida em NestJS que permite o gerenciamento completo de veículos e seus históricos de manutenção. O sistema utiliza blockchain (Hyperledger Besu) para garantir a integridade e imutabilidade dos registros de serviços, assegurando que os dados não sejam alterados após o registro.

🌐 **Acesso**

- **RFC**: [Documento_de_RFC_Autologger_Besu.pdf](https://github.com/user-attachments/files/23917812/Documento_de_RFC_Autologger_Besu.pdf)
- **API em Produção**: [https://api.autologger.online](https://api.autologger.online)
- **Documentação Swagger**: [https://api.autologger.online/api](https://api.autologger.online/api)
- **Health Check**: [https://api.autologger.online/health](https://api.autologger.online/health)

🎯 **Problema que Resolve**

- **Perda de histórico de manutenção**: Dificuldade em manter registros imutáveis dos serviços realizados
- **Falta de integridade dos dados**: Possibilidade de alteração ou perda de registros históricos
- **Dados fragmentados**: Histórico espalhado em diferentes documentos e sistemas
- **Falta de rastreabilidade**: Impossibilidade de verificar se os registros foram alterados após criação
- **Gerenciamento manual**: Processo trabalhoso para organizar e consultar histórico de múltiplos veículos

🚀 **Funcionalidades Principais**

**Usuários**
- ✅ Cadastro e login (email/senha e Google OAuth 2.0)
- ✅ Verificação de email
- ✅ Recuperação e alteração de senha
- ✅ Gerenciamento de perfil
- ✅ Exclusão de conta

**Veículos**
- ✅ Cadastro completo
- ✅ Upload de fotos dos veículos
- ✅ Atualização e exclusão de veículos
- ✅ Marcação de veículo como vendido
- ✅ Criptografia de dados sensíveis (placa)
- ✅ Estatísticas de veículos

**Serviços de Manutenção**
- ✅ Registro detalhado de serviços
- ✅ Histórico completo por veículo
- ✅ Upload múltiplo de anexos
- ✅ Registro de custos, localização e técnico responsável
- ✅ Filtros avançados
- ✅ Cálculo de custo total de serviços por veículo
- ✅ Integração blockchain para garantir imutabilidade

**Blockchain**
- ✅ Registro imutável de serviços na blockchain
- ✅ Verificação de integridade dos dados
- ✅ Diagnóstico de saúde da rede blockchain
- ✅ Criação de hash único para cada registro


**Compartilhamento**
- ✅ Geração de links de compartilhamento com token único
- ✅ Links com expiração configurável
- ✅ Opção de incluir/excluir anexos no compartilhamento

🛠️ **Stack Tecnológica**

**Backend**
- **NestJS** - Framework Node.js modular e escalável
- **TypeScript** - Tipagem estática e desenvolvimento robusto
- **TypeORM** - ORM para gerenciamento de banco de dados
- **Passport.js + JWT** - Autenticação segura
- **bcryptjs** - Hash de senhas

**Banco de Dados**
- **PostgreSQL** - Banco relacional robusto
- **TypeORM Migrations** - Controle de versão do schema

**Blockchain**
- **Hyperledger Besu** - Cliente Ethereum para blockchain privada
- **Ethers.js** - Biblioteca para interação com blockchain
- **Truffle** - Framework para desenvolvimento de smart contracts
- **Solidity** - Linguagem para contratos inteligentes

**Infraestrutura**
- **Docker** - Containerização
- **AWS S3** - Armazenamento de arquivos em nuvem (opcional)
- **Winston** - Sistema de logging estruturado
- **Swagger** - Documentação automática de API

**Ferramentas de Desenvolvimento**
- **Jest** - Testes unitários e integração
- **Supertest** - Testes end-to-end HTTP
- **ESLint + Prettier** - Padrões de código
- **TypeScript** - Compilação e type-checking

🏗️ **Arquitetura**

A aplicação segue uma arquitetura modular baseada em NestJS, organizada por domínios (módulos) com separação clara de responsabilidades:

- **Módulos de Domínio**: Auth, User, Vehicle, Blockchain
- **Módulos de Infraestrutura**: Storage, Email, Health
- **Common**: Código compartilhado (decorators, interceptors, utils)
- **Database**: Migrations e configuração do TypeORM

🔒 **Segurança**

- **JWT + Google OAuth 2.0** - Autenticação multi-fator
- **Hash de senhas com bcrypt** - Proteção de credenciais
- **Input validation + sanitização** - Validação de dados de entrada
- **Criptografia de dados sensíveis** - Placas de veículos criptografadas no banco
- **HTTPS configurável** - Comunicação segura (detecção automática)
- **CORS configurável** - Controle de origem de requisições
- **Cookies httpOnly e secure** - Proteção de tokens de autenticação
- **Conformidade LGPD** - Proteção de dados pessoais

📁 **Estrutura do Projeto**

```
autologger-service/
├── src/
│   ├── common/              # Código compartilhado
│   ├── database/            # Configuração e migrations
│   ├── modules/             # Módulos da aplicação
│   │   ├── auth/            # Autenticação
│   │   ├── blockchain/      # Integração blockchain
│   │   ├── user/            # Gerenciamento de usuários
│   │   ├── vehicle/         # Gerenciamento de veículos
│   │   ├── email/           # Envio de emails
│   │   ├── storage/         # Armazenamento de arquivos
│   │   └── health/          # Health checks
│   ├── app.module.ts        # Módulo principal
│   └── main.ts              # Arquivo de entrada
├── infrastructure/          # Scripts de infraestrutura
├── docs/                    # Documentação técnica
├── test/                    # Testes end-to-end
└── coverage/                # Relatórios de cobertura
```

📄 **Documentação Técnica**

- **Documentação de Arquitetura**: Consulte a pasta `docs/` para diagramas e documentação técnica completa
- **Diagramas C4**: `docs/c4_architecture/`
- **Diagramas de Classes**: `docs/class_diagram/`
- **Diagramas de Casos de Uso**: `docs/use_case_diagram/`

---


