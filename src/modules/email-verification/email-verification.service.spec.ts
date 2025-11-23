import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailService } from '../email/email.service';
import { UserService } from '../user/services/user.service';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let tokenRepository: jest.Mocked<EmailVerificationRepository>;
  let emailService: jest.Mocked<EmailService>;
  let userService: jest.Mocked<UserService>;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    isEmailVerified: false,
  };

  const mockToken = {
    id: 'token-123',
    token: 'verification-token',
    userId: 'user-123',
    used: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockTokenRepository = {
      invalidateUserTokens: jest.fn(),
      create: jest.fn(),
      findByToken: jest.fn(),
      markAsUsed: jest.fn(),
    };

    const mockEmailService = {
      sendVerificationEmail: jest.fn(),
    };

    const mockUserService = {
      findById: jest.fn(),
      markEmailAsVerified: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: EmailVerificationRepository,
          useValue: mockTokenRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
    tokenRepository = module.get(EmailVerificationRepository);
    emailService = module.get(EmailService);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      userService.findById.mockResolvedValue(mockUser as any);
      tokenRepository.invalidateUserTokens.mockResolvedValue(undefined);
      tokenRepository.create.mockResolvedValue(undefined);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.sendVerificationEmail('user-123');

      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(tokenRepository.invalidateUserTokens).toHaveBeenCalledWith(
        'user-123',
      );
      expect(tokenRepository.create).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.findById.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      await expect(service.sendVerificationEmail('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when email already verified', async () => {
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      userService.findById.mockResolvedValue(verifiedUser as any);

      await expect(service.sendVerificationEmail('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      tokenRepository.findByToken.mockResolvedValue(mockToken as any);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);
      userService.markEmailAsVerified.mockResolvedValue(undefined);
      tokenRepository.invalidateUserTokens.mockResolvedValue(undefined);

      await service.verifyEmail('verification-token');

      expect(tokenRepository.findByToken).toHaveBeenCalledWith(
        'verification-token',
      );
      expect(tokenRepository.markAsUsed).toHaveBeenCalledWith(
        'verification-token',
      );
      expect(userService.markEmailAsVerified).toHaveBeenCalledWith('user-123');
      expect(tokenRepository.invalidateUserTokens).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should throw NotFoundException when token not found', async () => {
      tokenRepository.findByToken.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when token already used', async () => {
      const usedToken = { ...mockToken, used: true };
      tokenRepository.findByToken.mockResolvedValue(usedToken as any);

      await expect(service.verifyEmail('verification-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token expired', async () => {
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      };
      tokenRepository.findByToken.mockResolvedValue(expiredToken as any);

      await expect(service.verifyEmail('verification-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      userService.findById.mockResolvedValue(mockUser as any);
      tokenRepository.invalidateUserTokens.mockResolvedValue(undefined);
      tokenRepository.create.mockResolvedValue(undefined);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.resendVerificationEmail('user-123');

      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException when email already verified', async () => {
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      userService.findById.mockResolvedValue(verifiedUser as any);

      await expect(service.resendVerificationEmail('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('checkVerificationStatus', () => {
    it('should return true when email is verified', async () => {
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      userService.findById.mockResolvedValue(verifiedUser as any);

      const result = await service.checkVerificationStatus('user-123');

      expect(result).toBe(true);
    });

    it('should return false when email is not verified', async () => {
      userService.findById.mockResolvedValue(mockUser as any);

      const result = await service.checkVerificationStatus('user-123');

      expect(result).toBe(false);
    });
  });
});
