-- Criação do banco de dados para SonarQube
CREATE DATABASE sonarqube;

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Comentários sobre as tabelas que serão criadas automaticamente pelo TypeORM
-- users: tabela de usuários
-- vehicles: tabela de veículos (futura implementação)
-- events: tabela de eventos veiculares (futura implementação)