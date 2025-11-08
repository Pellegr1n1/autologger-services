import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetToken } from './entities/password-reset-token.entity';

describe('PasswordResetRepository', () => {
  let repository: PasswordResetRepository;
  let tokenRepository: jest.Mocked<Repository<PasswordResetToken>>;

  const mockToken: PasswordResetToken = {
    id: 'token-123',
    token: 'reset-token',
    userId: 'user-123',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    used: false,
    user: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetRepository,
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<PasswordResetRepository>(PasswordResetRepository);
    tokenRepository = module.get(getRepositoryToken(PasswordResetToken));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create and save password reset token', async () => {
      const token = 'reset-token';
      const userId = 'user-123';
      const expiresAt = new Date();

      tokenRepository.create.mockReturnValue(mockToken as any);
      tokenRepository.save.mockResolvedValue(mockToken as any);

      const result = await repository.create(token, userId, expiresAt);

      expect(tokenRepository.create).toHaveBeenCalledWith({
        token,
        userId,
        expiresAt,
        used: false,
      });
      expect(tokenRepository.save).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(mockToken);
    });
  });

  describe('findByToken', () => {
    it('should find token by token string', async () => {
      const token = 'reset-token';

      tokenRepository.findOne.mockResolvedValue(mockToken as any);

      const result = await repository.findByToken(token);

      expect(tokenRepository.findOne).toHaveBeenCalledWith({
        where: { token },
        relations: ['user'],
      });
      expect(result).toEqual(mockToken);
    });

    it('should return null when token not found', async () => {
      const token = 'non-existent-token';

      tokenRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByToken(token);

      expect(result).toBeNull();
    });
  });

  describe('markAsUsed', () => {
    it('should mark token as used', async () => {
      const token = 'reset-token';

      tokenRepository.update.mockResolvedValue({ affected: 1 } as any);

      await repository.markAsUsed(token);

      expect(tokenRepository.update).toHaveBeenCalledWith(
        { token },
        { used: true },
      );
    });
  });

  describe('invalidateUserTokens', () => {
    it('should invalidate all unused tokens for user', async () => {
      const userId = 'user-123';

      tokenRepository.update.mockResolvedValue({ affected: 2 } as any);

      await repository.invalidateUserTokens(userId);

      expect(tokenRepository.update).toHaveBeenCalledWith(
        { userId, used: false },
        { used: true },
      );
    });
  });
});

