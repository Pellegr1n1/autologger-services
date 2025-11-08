import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerificationToken } from './entities/email-verification-token.entity';

describe('EmailVerificationRepository', () => {
  let repository: EmailVerificationRepository;
  let tokenRepository: jest.Mocked<Repository<EmailVerificationToken>>;

  const mockToken: EmailVerificationToken = {
    id: 'token-123',
    token: 'verification-token',
    userId: 'user-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationRepository,
        {
          provide: getRepositoryToken(EmailVerificationToken),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<EmailVerificationRepository>(EmailVerificationRepository);
    tokenRepository = module.get(getRepositoryToken(EmailVerificationToken));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create and save email verification token', async () => {
      const token = 'verification-token';
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
      const token = 'verification-token';

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
      const token = 'verification-token';

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

  describe('deleteExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };

      tokenRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await repository.deleteExpiredTokens();

      expect(tokenRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('expiresAt < :now', expect.any(Object));
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });
});

