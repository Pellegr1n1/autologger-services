import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetRepository } from './password-reset.repository';
import { EmailService } from '../email/email.service';
import { UserService } from '../user/services/user.service';
import { UserRepository } from '../user/repositories/user.repository';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let tokenRepository: jest.Mocked<PasswordResetRepository>;
  let emailService: jest.Mocked<EmailService>;
  let userService: jest.Mocked<UserService>;
  let userRepository: jest.Mocked<UserRepository>;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    authProvider: 'local' as const,
  };

  const mockToken = {
    id: 'token-123',
    token: 'reset-token',
    userId: 'user-123',
    used: false,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
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
      sendPasswordResetEmail: jest.fn(),
    };

    const mockUserService = {
      findByEmail: jest.fn(),
    };

    const mockUserRepository = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: PasswordResetRepository,
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
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    tokenRepository = module.get(PasswordResetRepository);
    emailService = module.get(EmailService);
    userService = module.get(UserService);
    userRepository = module.get(UserRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      userService.findByEmail.mockResolvedValue(mockUser as any);
      tokenRepository.invalidateUserTokens.mockResolvedValue(undefined);
      tokenRepository.create.mockResolvedValue(undefined);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.requestPasswordReset('test@example.com');

      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(tokenRepository.invalidateUserTokens).toHaveBeenCalledWith(
        'user-123',
      );
      expect(tokenRepository.create).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.requestPasswordReset('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user uses Google Auth', async () => {
      const googleUser = {
        ...mockUser,
        authProvider: 'google' as const,
      };
      userService.findByEmail.mockResolvedValue(googleUser as any);

      await expect(
        service.requestPasswordReset('google@example.com'),
      ).rejects.toThrow(BadRequestException);
      
      expect(userService.findByEmail).toHaveBeenCalledWith('google@example.com');
      expect(tokenRepository.invalidateUserTokens).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const newPassword = 'NewPassword123!';
      const confirmPassword = 'NewPassword123!';

      tokenRepository.findByToken.mockResolvedValue(mockToken as any);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      userRepository.update.mockResolvedValue(undefined);

      await service.resetPassword('reset-token', newPassword, confirmPassword);

      expect(tokenRepository.findByToken).toHaveBeenCalledWith('reset-token');
      expect(tokenRepository.markAsUsed).toHaveBeenCalledWith('reset-token');
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(userRepository.update).toHaveBeenCalledWith('user-123', {
        password: 'hashedPassword',
      });
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      await expect(
        service.resetPassword('reset-token', 'password1', 'password2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password is weak', async () => {
      await expect(
        service.resetPassword('reset-token', 'weak', 'weak'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when token not found', async () => {
      tokenRepository.findByToken.mockResolvedValue(null);

      await expect(
        service.resetPassword(
          'invalid-token',
          'NewPassword123!',
          'NewPassword123!',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when token already used', async () => {
      const usedToken = { ...mockToken, used: true };
      tokenRepository.findByToken.mockResolvedValue(usedToken as any);

      await expect(
        service.resetPassword(
          'reset-token',
          'NewPassword123!',
          'NewPassword123!',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token expired', async () => {
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      };
      tokenRepository.findByToken.mockResolvedValue(expiredToken as any);

      await expect(
        service.resetPassword(
          'reset-token',
          'NewPassword123!',
          'NewPassword123!',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateResetToken', () => {
    it('should return true for valid token', async () => {
      tokenRepository.findByToken.mockResolvedValue(mockToken as any);

      const result = await service.validateResetToken('reset-token');

      expect(result).toBe(true);
    });

    it('should return false when token not found', async () => {
      tokenRepository.findByToken.mockResolvedValue(null);

      const result = await service.validateResetToken('invalid-token');

      expect(result).toBe(false);
    });

    it('should return false when token already used', async () => {
      const usedToken = { ...mockToken, used: true };
      tokenRepository.findByToken.mockResolvedValue(usedToken as any);

      const result = await service.validateResetToken('reset-token');

      expect(result).toBe(false);
    });

    it('should return false when token expired', async () => {
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      tokenRepository.findByToken.mockResolvedValue(expiredToken as any);

      const result = await service.validateResetToken('reset-token');

      expect(result).toBe(false);
    });
  });
});
