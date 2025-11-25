import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/services/user.service';
import { UserRepository } from '../user/repositories/user.repository';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthLoginDto } from './dto/auth-login.dto';
import { LoggerService } from '../../common/logger/logger.service';
import { EmailService } from '../email/email.service';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { LoggerServiceTestHelper } from '../../common/test-helpers/logger-service.test-helper';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let mockLoggerService: jest.Mocked<LoggerService>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockEmailVerificationService: jest.Mocked<EmailVerificationService>;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword',
    avatar: null,
    authProvider: 'local',
    isEmailVerified: false,
    isActive: true,
  };

  beforeEach(async () => {
    const mockUserService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      validatePassword: jest.fn(),
      findByGoogleId: jest.fn(),
      updateProfile: jest.fn(),
      updateProfileAllowInactive: jest.fn(),
      createGoogleUser: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    mockLoggerService = LoggerServiceTestHelper.createMockLoggerService();
    mockEmailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      sendPasswordChangeNotification: jest.fn(),
      sendAccountDeletionNotification: jest.fn(),
      sendEmailChangeNotification: jest.fn(),
    } as any;

    mockEmailVerificationService = {
      sendVerificationEmail: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerificationEmail: jest.fn(),
      checkVerificationStatus: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: AuthRegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      userService.create.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.register(registerDto);

      expect(userService.create).toHaveBeenCalledWith({
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
      });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const registerDto: AuthRegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'differentPassword',
      };

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user creation fails', async () => {
      const registerDto: AuthRegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      userService.create.mockRejectedValue(new Error('Email already exists'));

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto: AuthLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      userService.findByEmail.mockResolvedValue(mockUser as any);
      userService.validatePassword.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(userService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(userService.validatePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const loginDto: AuthLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const loginDto: AuthLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const inactiveUser = { ...mockUser, isActive: false };
      userService.findByEmail.mockResolvedValue(inactiveUser as any);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when auth provider is not local', async () => {
      const loginDto: AuthLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const googleUser = { ...mockUser, authProvider: 'google' };
      userService.findByEmail.mockResolvedValue(googleUser as any);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const loginDto: AuthLoginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      userService.findByEmail.mockResolvedValue(mockUser as any);
      userService.validatePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateGoogleUser', () => {
    it('should throw BadRequestException when googleId is missing', async () => {
      const googleUser = {
        email: 'test@example.com',
        name: 'Test User',
      };

      await expect(service.validateGoogleUser(googleUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when email is missing', async () => {
      const googleUser = {
        googleId: 'google-123',
        name: 'Test User',
      };

      await expect(service.validateGoogleUser(googleUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return existing user when found by Google ID', async () => {
      const googleUser = {
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'avatar-url',
      };

      userService.findByGoogleId.mockResolvedValue(mockUser as any);

      const result = await service.validateGoogleUser(googleUser);

      expect(result).toEqual(mockUser);
      expect(userService.findByGoogleId).toHaveBeenCalledWith('google-123');
    });

    it('should reactivate inactive user when found by Google ID', async () => {
      const googleUser = {
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'avatar-url',
      };

      const inactiveUser = { ...mockUser, isActive: false };
      const reactivatedUser = { ...mockUser, isActive: true };

      userService.findByGoogleId
        .mockResolvedValueOnce(inactiveUser as any)
        .mockResolvedValueOnce(reactivatedUser as any);
      userService.updateProfileAllowInactive.mockResolvedValue(
        reactivatedUser as any,
      );

      const result = await service.validateGoogleUser(googleUser);

      expect(userService.updateProfileAllowInactive).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException when email exists with local auth', async () => {
      const googleUser = {
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'avatar-url',
      };

      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue({
        ...mockUser,
        authProvider: 'local',
      } as any);

      await expect(service.validateGoogleUser(googleUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create new user when not found', async () => {
      const googleUser = {
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'avatar-url',
      };

      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userService.createGoogleUser.mockResolvedValue(mockUser as any);

      const result = await service.validateGoogleUser(googleUser);

      expect(userService.createGoogleUser).toHaveBeenCalledWith(googleUser);
      expect(result).toEqual(mockUser);
    });

    it('should reactivate inactive user when found by email', async () => {
      const googleUser = {
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'avatar-url',
      };

      // Usuário inativo com authProvider 'google' (não 'local')
      const inactiveUser = {
        ...mockUser,
        isActive: false,
        authProvider: 'google',
        googleId: 'old-google-id',
      };
      const reactivatedUser = {
        ...mockUser,
        isActive: true,
        authProvider: 'google',
      };

      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail
        .mockResolvedValueOnce(inactiveUser as any) // Primeira chamada em validateGoogleUser
        .mockResolvedValueOnce(reactivatedUser as any); // Segunda chamada após updateProfileAllowInactive
      userService.updateProfileAllowInactive.mockResolvedValue(
        reactivatedUser as any,
      );

      const result = await service.validateGoogleUser(googleUser);

      expect(userService.updateProfileAllowInactive).toHaveBeenCalledWith(
        inactiveUser.id,
        expect.objectContaining({
          isActive: true,
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          authProvider: 'google',
          name: googleUser.name,
        }),
      );
      expect(result.isActive).toBe(true);
    });

    it('should link Google ID to existing user without Google ID but with google authProvider', async () => {
      const googleUser = {
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'avatar-url',
      };

      // Usuário que já tem authProvider 'google' mas não tem googleId ainda
      const userWithoutGoogleId = {
        ...mockUser,
        googleId: null,
        authProvider: 'google',
        isActive: true,
      };

      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(userWithoutGoogleId as any);
      userService.updateProfile.mockResolvedValue({
        ...userWithoutGoogleId,
        googleId: googleUser.googleId,
      } as any);

      const result = await service.validateGoogleUser(googleUser);

      expect(userService.updateProfile).toHaveBeenCalledWith(
        userWithoutGoogleId.id,
        expect.objectContaining({
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          authProvider: 'google',
        }),
      );
      expect(result).toEqual(userWithoutGoogleId);
    });
  });

  describe('googleLogin', () => {
    it('should generate JWT token for Google user', async () => {
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.googleLogin(mockUser);

      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.isEmailVerified).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const mockUserRepository = {
        findById: jest.fn().mockResolvedValue({
          ...mockUser,
          password: 'hashedOldPassword',
          authProvider: 'local',
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };

      const mockEmailService = {
        sendPasswordChangeNotification: jest.fn().mockResolvedValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: UserService,
            useValue: {
              ...userService,
              validatePassword: jest.fn().mockResolvedValue(true),
            },
          },
          {
            provide: JwtService,
            useValue: jwtService,
          },
          {
            provide: UserRepository,
            useValue: mockUserRepository,
          },
          {
            provide: LoggerService,
            useValue: mockLoggerService,
          },
          {
            provide: EmailService,
            useValue: mockEmailService,
          },
          {
            provide: EmailVerificationService,
            useValue: mockEmailVerificationService,
          },
        ],
      }).compile();

      const authService = module.get<AuthService>(AuthService);

      const result = await authService.changePassword(
        'user-123',
        changePasswordDto,
      );

      expect(result.message).toBe('Senha alterada com sucesso');
      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(
        mockEmailService.sendPasswordChangeNotification,
      ).toHaveBeenCalled();
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const changePasswordDto = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'differentPassword',
      };

      await expect(
        service.changePassword('user-123', changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password is weak', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
        confirmPassword: 'weak',
      };

      await expect(
        service.changePassword('user-123', changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const mockUserRepository = {
        findById: jest.fn().mockResolvedValue(null),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: UserService,
            useValue: userService,
          },
          {
            provide: JwtService,
            useValue: jwtService,
          },
          {
            provide: UserRepository,
            useValue: mockUserRepository,
          },
          {
            provide: LoggerService,
            useValue: mockLoggerService,
          },
          {
            provide: EmailService,
            useValue: mockEmailService,
          },
          {
            provide: EmailVerificationService,
            useValue: mockEmailVerificationService,
          },
        ],
      }).compile();

      const authService = module.get<AuthService>(AuthService);

      await expect(
        authService.changePassword('user-123', changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when user is Google authenticated', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const mockUserRepository = {
        findById: jest.fn().mockResolvedValue({
          ...mockUser,
          authProvider: 'google',
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: UserService,
            useValue: userService,
          },
          {
            provide: JwtService,
            useValue: jwtService,
          },
          {
            provide: UserRepository,
            useValue: mockUserRepository,
          },
          {
            provide: LoggerService,
            useValue: mockLoggerService,
          },
          {
            provide: EmailService,
            useValue: mockEmailService,
          },
          {
            provide: EmailVerificationService,
            useValue: mockEmailVerificationService,
          },
        ],
      }).compile();

      const authService = module.get<AuthService>(AuthService);

      await expect(
        authService.changePassword('user-123', changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      const changePasswordDto = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const mockUserRepository = {
        findById: jest.fn().mockResolvedValue({
          ...mockUser,
          password: 'hashedPassword',
          authProvider: 'local',
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: UserService,
            useValue: {
              ...userService,
              validatePassword: jest.fn().mockResolvedValue(false),
            },
          },
          {
            provide: JwtService,
            useValue: jwtService,
          },
          {
            provide: UserRepository,
            useValue: mockUserRepository,
          },
          {
            provide: LoggerService,
            useValue: mockLoggerService,
          },
          {
            provide: EmailService,
            useValue: mockEmailService,
          },
          {
            provide: EmailVerificationService,
            useValue: mockEmailVerificationService,
          },
        ],
      }).compile();

      const authService = module.get<AuthService>(AuthService);

      await expect(
        authService.changePassword('user-123', changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should continue even if email notification fails', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const mockUserRepository = {
        findById: jest.fn().mockResolvedValue({
          ...mockUser,
          password: 'hashedOldPassword',
          authProvider: 'local',
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };

      const mockEmailServiceWithError = {
        sendPasswordChangeNotification: jest
          .fn()
          .mockRejectedValue(new Error('Email error')),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: UserService,
            useValue: {
              ...userService,
              validatePassword: jest.fn().mockResolvedValue(true),
            },
          },
          {
            provide: JwtService,
            useValue: jwtService,
          },
          {
            provide: UserRepository,
            useValue: mockUserRepository,
          },
          {
            provide: LoggerService,
            useValue: mockLoggerService,
          },
          {
            provide: EmailService,
            useValue: mockEmailServiceWithError,
          },
          {
            provide: EmailVerificationService,
            useValue: mockEmailVerificationService,
          },
        ],
      }).compile();

      const authService = module.get<AuthService>(AuthService);

      const result = await authService.changePassword(
        'user-123',
        changePasswordDto,
      );

      expect(result.message).toBe('Senha alterada com sucesso');
      expect(mockUserRepository.update).toHaveBeenCalled();
    });
  });
});
