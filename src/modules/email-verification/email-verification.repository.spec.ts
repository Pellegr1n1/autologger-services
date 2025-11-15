import { Repository } from 'typeorm';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { TokenRepositoryTestHelper } from '../../common/test-helpers/token-repository.test-helper';

describe('EmailVerificationRepository', () => {
  let repository: EmailVerificationRepository;
  let tokenRepository: jest.Mocked<Repository<EmailVerificationToken>>;

  const mockToken = TokenRepositoryTestHelper.createMockToken<EmailVerificationToken>(
    'verification-token',
    'user-123',
    24 * 60 * 60 * 1000
  );

  beforeEach(async () => {
    const { module, mockRepository } = await TokenRepositoryTestHelper.createTestingModule(
      EmailVerificationRepository,
      EmailVerificationToken
    );

    repository = module.get<EmailVerificationRepository>(EmailVerificationRepository);
    tokenRepository = mockRepository;
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
      const mockQueryBuilder = TokenRepositoryTestHelper.createMockQueryBuilder(5);

      tokenRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await repository.deleteExpiredTokens();

      expect(tokenRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('expiresAt < :now', expect.any(Object));
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });
});

