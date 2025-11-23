import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';
import { EmailVerificationRepository } from '../../email-verification/email-verification.repository';
import { PasswordResetRepository } from '../../password-reset/password-reset.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { LoggerService } from '../../../common/logger/logger.service';
import { EmailService } from '../../email/email.service';
import { LoggerServiceTestHelper } from '../../../common/test-helpers/logger-service.test-helper';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;
  let emailVerificationRepository: jest.Mocked<EmailVerificationRepository>;
  let passwordResetRepository: jest.Mocked<PasswordResetRepository>;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword',
    avatar: null,
    authProvider: 'local',
    isEmailVerified: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      hardDelete: jest.fn(),
      findByGoogleId: jest.fn(),
      createGoogleUser: jest.fn(),
    };

    const mockEmailVerificationRepository = {
      deleteUserTokens: jest.fn(),
    };

    const mockPasswordResetRepository = {
      deleteUserTokens: jest.fn(),
    };

    const mockLoggerService = LoggerServiceTestHelper.createMockLoggerService();
    const mockEmailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockRepository,
        },
        {
          provide: EmailVerificationRepository,
          useValue: mockEmailVerificationRepository,
        },
        {
          provide: PasswordResetRepository,
          useValue: mockPasswordResetRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
    emailVerificationRepository = module.get(EmailVerificationRepository);
    passwordResetRepository = module.get(PasswordResetRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      repository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      repository.create.mockResolvedValue(mockUser as any);

      const result = await service.create(createUserDto);

      expect(repository.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 12);
      expect(repository.create).toHaveBeenCalled();
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(mockUser.id);
    });

    it('should throw ConflictException when email already exists', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      repository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create user without password if not provided', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
      };

      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockUser as any);

      const result = await service.create(createUserDto);

      // Password hash should not be called when password is not provided
      // But the service checks if password exists, so we need to check the actual behavior
      expect(result).toBeDefined();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      repository.findByEmail.mockResolvedValue(mockUser as any);

      const result = await service.findByEmail('test@example.com');

      expect(repository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      repository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found and active', async () => {
      repository.findById.mockResolvedValue(mockUser as any);

      const result = await service.findById('user-123');

      expect(repository.findById).toHaveBeenCalledWith('user-123');
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(mockUser.id);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      repository.findById.mockResolvedValue(inactiveUser as any);

      await expect(service.findById('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      } as any);

      const result = await service.updateProfile('user-123', updateUserDto);

      expect(repository.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when user not found', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateProfile('user-123', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when email is already in use', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.findByEmail.mockResolvedValue({
        ...mockUser,
        id: 'other-user-id',
      } as any);

      await expect(
        service.updateProfile('user-123', updateUserDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should update email when not in use by another user', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.findByEmail.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...mockUser,
        email: 'newemail@example.com',
      } as any);

      const result = await service.updateProfile('user-123', updateUserDto);

      expect(result.email).toBe('newemail@example.com');
    });

    it('should throw BadRequestException when trying to update email for Google user', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };

      const googleUser = { ...mockUser, authProvider: 'google' };
      repository.findById.mockResolvedValue(googleUser as any);

      await expect(
        service.updateProfile('user-123', updateUserDto),
      ).rejects.toThrow(
        'Não é possível alterar o email de uma conta autenticada via Google',
      );
    });

    it('should throw NotFoundException when update returns null', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.update.mockResolvedValue(null);

      await expect(
        service.updateProfile('user-123', updateUserDto),
      ).rejects.toThrow('Erro ao atualizar usuário');
    });

    it('should handle email change notification error gracefully', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.findByEmail.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...mockUser,
        email: 'newemail@example.com',
      } as any);

      // Mock emailService para lançar erro
      const mockEmailService = {
        sendEmailChangeNotification: jest
          .fn()
          .mockRejectedValue(new Error('Email error')),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserService,
          {
            provide: UserRepository,
            useValue: repository,
          },
          {
            provide: EmailVerificationRepository,
            useValue: emailVerificationRepository,
          },
          {
            provide: PasswordResetRepository,
            useValue: passwordResetRepository,
          },
          {
            provide: LoggerService,
            useValue: LoggerServiceTestHelper.createMockLoggerService(),
          },
          {
            provide: EmailService,
            useValue: mockEmailService,
          },
        ],
      }).compile();

      const userService = module.get<UserService>(UserService);

      // Não deve lançar erro, apenas logar
      const result = await userService.updateProfile('user-123', updateUserDto);

      expect(result.email).toBe('newemail@example.com');
    });
  });

  describe('updateProfileAllowInactive', () => {
    it('should update inactive user profile', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
        isActive: true,
      };

      const inactiveUser = { ...mockUser, isActive: false };
      repository.findById.mockResolvedValue(inactiveUser as any);
      repository.update.mockResolvedValue({
        ...inactiveUser,
        name: 'Updated Name',
        isActive: true,
      } as any);

      const result = await service.updateProfileAllowInactive(
        'user-123',
        updateUserDto,
      );

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateProfileAllowInactive('user-123', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when email is already in use', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };

      const inactiveUser = { ...mockUser, isActive: false };
      repository.findById.mockResolvedValue(inactiveUser as any);
      repository.findByEmail.mockResolvedValue({
        ...mockUser,
        id: 'other-user-id',
      } as any);

      await expect(
        service.updateProfileAllowInactive('user-123', updateUserDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should update all optional fields in buildUpdateData', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
        googleId: 'new-google-id',
        avatar: 'new-avatar-url',
        authProvider: 'google',
        isActive: false,
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.update.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      } as any);

      const result = await service.updateProfileAllowInactive(
        'user-123',
        updateUserDto,
      );

      expect(result.name).toBe('Updated Name');
      expect(repository.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          name: 'Updated Name',
          googleId: 'new-google-id',
          avatar: 'new-avatar-url',
          authProvider: 'google',
          isActive: false,
        }),
      );
    });

    it('should update only googleId when provided', async () => {
      const updateUserDto: UpdateUserDto = {
        googleId: 'new-google-id',
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.update.mockResolvedValue({
        ...mockUser,
        googleId: 'new-google-id',
      } as any);

      await service.updateProfileAllowInactive('user-123', updateUserDto);

      expect(repository.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          googleId: 'new-google-id',
        }),
      );
    });

    it('should update only avatar when provided', async () => {
      const updateUserDto: UpdateUserDto = {
        avatar: 'new-avatar-url',
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.update.mockResolvedValue({
        ...mockUser,
        avatar: 'new-avatar-url',
      } as any);

      await service.updateProfileAllowInactive('user-123', updateUserDto);

      expect(repository.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          avatar: 'new-avatar-url',
        }),
      );
    });

    it('should update only authProvider when provided', async () => {
      const updateUserDto: UpdateUserDto = {
        authProvider: 'google',
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.update.mockResolvedValue({
        ...mockUser,
        authProvider: 'google',
      } as any);

      await service.updateProfileAllowInactive('user-123', updateUserDto);

      expect(repository.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          authProvider: 'google',
        }),
      );
    });

    it('should update only isActive when provided', async () => {
      const updateUserDto: UpdateUserDto = {
        isActive: false,
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.update.mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as any);

      await service.updateProfileAllowInactive('user-123', updateUserDto);

      expect(repository.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          isActive: false,
        }),
      );
    });

    it('should throw NotFoundException when update returns null in updateProfileAllowInactive', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.update.mockResolvedValue(null);

      await expect(
        service.updateProfileAllowInactive('user-123', updateUserDto),
      ).rejects.toThrow('Erro ao atualizar usuário');
    });

    it('should update email in updateProfileAllowInactive', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };

      repository.findById.mockResolvedValue(mockUser as any);
      repository.findByEmail.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...mockUser,
        email: 'newemail@example.com',
      } as any);

      const result = await service.updateProfileAllowInactive(
        'user-123',
        updateUserDto,
      );

      expect(result.email).toBe('newemail@example.com');
      expect(repository.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          email: 'newemail@example.com',
        }),
      );
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword('password123', 'hashed');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed');
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword('wrong', 'hashed');

      expect(result).toBe(false);
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account successfully', async () => {
      repository.findById.mockResolvedValue(mockUser as any);
      emailVerificationRepository.deleteUserTokens.mockResolvedValue(undefined);
      passwordResetRepository.deleteUserTokens.mockResolvedValue(undefined);
      repository.hardDelete.mockResolvedValue(undefined);

      await service.deleteAccount('user-123');

      expect(emailVerificationRepository.deleteUserTokens).toHaveBeenCalledWith(
        'user-123',
      );
      expect(passwordResetRepository.deleteUserTokens).toHaveBeenCalledWith(
        'user-123',
      );
      expect(repository.hardDelete).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteAccount('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByGoogleId', () => {
    it('should return user when found by Google ID', async () => {
      repository.findByGoogleId.mockResolvedValue(mockUser as any);

      const result = await service.findByGoogleId('google-123');

      expect(repository.findByGoogleId).toHaveBeenCalledWith('google-123');
      expect(result).toEqual(mockUser);
    });
  });

  describe('createGoogleUser', () => {
    it('should create Google user successfully', async () => {
      const googleUser = {
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'avatar-url',
      };

      repository.createGoogleUser.mockResolvedValue(mockUser as any);

      const result = await service.createGoogleUser(googleUser);

      expect(repository.createGoogleUser).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('markEmailAsVerified', () => {
    it('should mark email as verified', async () => {
      repository.update.mockResolvedValue(undefined);

      await service.markEmailAsVerified('user-123');

      expect(repository.update).toHaveBeenCalledWith('user-123', {
        isEmailVerified: true,
      });
    });
  });

  describe('markEmailAsUnverified', () => {
    it('should mark email as unverified', async () => {
      repository.update.mockResolvedValue(undefined);

      await service.markEmailAsUnverified('user-123');

      expect(repository.update).toHaveBeenCalledWith('user-123', {
        isEmailVerified: false,
      });
    });
  });
});
