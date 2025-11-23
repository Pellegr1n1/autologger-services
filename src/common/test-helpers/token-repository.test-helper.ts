import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseTokenEntity } from '../repositories/base-token.repository';

/**
 * Helper para criar módulos de teste para repositories de tokens
 * Elimina duplicação entre testes de EmailVerificationRepository e PasswordResetRepository
 */
export class TokenRepositoryTestHelper {
  /**
   * Cria um mock básico do TypeORM Repository
   */
  static createMockRepository() {
    return {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
  }

  /**
   * Cria um token mock genérico
   */
  static createMockToken<T extends BaseTokenEntity>(
    tokenValue: string,
    userId: string = 'user-123',
    expiresInMs: number = 60 * 60 * 1000,
  ): T {
    return {
      id: 'token-123',
      token: tokenValue,
      userId,
      expiresAt: new Date(Date.now() + expiresInMs),
      used: false,
      user: null,
      createdAt: new Date(),
    } as T;
  }

  /**
   * Cria um módulo de teste para um repository de token
   */
  static async createTestingModule<T, E extends BaseTokenEntity>(
    repositoryClass: new (...args: any[]) => T,
    entityClass: new () => E,
  ): Promise<{
    module: TestingModule;
    mockRepository: jest.Mocked<Repository<E>>;
  }> {
    const mockRepository = this.createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        repositoryClass,
        {
          provide: getRepositoryToken(entityClass),
          useValue: mockRepository,
        },
      ],
    }).compile();

    return {
      module,
      mockRepository: mockRepository as unknown as jest.Mocked<Repository<E>>,
    };
  }

  /**
   * Cria um mock do QueryBuilder para testes de deleteExpiredTokens
   */
  static createMockQueryBuilder(affectedRows: number = 5) {
    return {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: affectedRows }),
    };
  }
}
