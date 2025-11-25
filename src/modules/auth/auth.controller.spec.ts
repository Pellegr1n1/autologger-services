import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthLoginDto } from './dto/auth-login.dto';
import { LoggerService } from '../../common/logger/logger.service';
import { LoggerServiceTestHelper } from '../../common/test-helpers/logger-service.test-helper';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let emailVerificationService: jest.Mocked<EmailVerificationService>;
  let passwordResetService: jest.Mocked<PasswordResetService>;

  const mockAuthResponse = {
    access_token: 'mock-jwt-token',
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      avatar: null,
      authProvider: 'local' as const,
      isEmailVerified: false,
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const mockEmailVerificationService = {
      sendVerificationEmail: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerificationEmail: jest.fn(),
      checkVerificationStatus: jest.fn(),
    };

    const mockPasswordResetService = {
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
    };

    const mockLoggerService = LoggerServiceTestHelper.createMockLoggerService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        {
          provide: PasswordResetService,
          useValue: mockPasswordResetService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    emailVerificationService = module.get(EmailVerificationService);
    passwordResetService = module.get(PasswordResetService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: AuthRegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const mockResponse = {
        cookie: jest.fn(),
        json: jest.fn(),
      } as any;

      const mockRequest = {
        protocol: 'http',
        headers: {},
      } as any;

      // Garantir que está em desenvolvimento para os testes
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      delete process.env.FRONTEND_URL;
      delete process.env.CORS_ORIGINS;

      authService.register.mockResolvedValue(mockAuthResponse);

      await controller.register(registerDto, mockResponse, mockRequest);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'autologger_token',
        mockAuthResponse.access_token,
        expect.objectContaining({
          httpOnly: true,
          secure: false, // não é HTTPS em desenvolvimento
          sameSite: 'lax', // não é produção
          domain: 'localhost', // em desenvolvimento
        }),
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        user: mockAuthResponse.user,
      });

      // Restaurar variável de ambiente
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('login', () => {
    it('should login user', async () => {
      const loginDto: AuthLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse = {
        cookie: jest.fn(),
        json: jest.fn(),
      } as any;

      const mockRequest = {
        protocol: 'http',
        headers: {},
      } as any;

      // Garantir que está em desenvolvimento para os testes
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      delete process.env.FRONTEND_URL;
      delete process.env.CORS_ORIGINS;

      authService.login.mockResolvedValue(mockAuthResponse);

      await controller.login(loginDto, mockResponse, mockRequest);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'autologger_token',
        mockAuthResponse.access_token,
        expect.objectContaining({
          httpOnly: true,
          secure: false, // não é HTTPS em desenvolvimento
          sameSite: 'lax', // não é produção
          domain: 'localhost', // em desenvolvimento
        }),
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        user: mockAuthResponse.user,
      });

      // Restaurar variável de ambiente
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email', async () => {
      const request = {
        user: { id: 'user-123' },
      };

      emailVerificationService.sendVerificationEmail.mockResolvedValue(
        undefined,
      );

      const result = await controller.sendVerificationEmail(request);

      expect(
        emailVerificationService.sendVerificationEmail,
      ).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        message: 'Email de verificação enviado com sucesso',
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with token', async () => {
      emailVerificationService.verifyEmail.mockResolvedValue(undefined);

      const result = await controller.verifyEmail('token-123');

      expect(emailVerificationService.verifyEmail).toHaveBeenCalledWith(
        'token-123',
      );
      expect(result).toEqual({
        message: 'Email verificado com sucesso',
      });
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email', async () => {
      const request = {
        user: { id: 'user-123' },
      };

      emailVerificationService.resendVerificationEmail.mockResolvedValue(
        undefined,
      );

      const result = await controller.resendVerificationEmail(request);

      expect(
        emailVerificationService.resendVerificationEmail,
      ).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        message: 'Email de verificação reenviado com sucesso',
      });
    });
  });

  describe('checkVerificationStatus', () => {
    it('should return verification status', async () => {
      const request = {
        user: { id: 'user-123' },
      };

      emailVerificationService.checkVerificationStatus.mockResolvedValue(true);

      const result = await controller.checkVerificationStatus(request);

      expect(
        emailVerificationService.checkVerificationStatus,
      ).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ isEmailVerified: true });
    });

    it('should return false when user is not authenticated', async () => {
      const request = {};

      const result = await controller.checkVerificationStatus(request);

      expect(result).toEqual({ isEmailVerified: false });
    });
  });

  describe('forgotPassword', () => {
    it('should request password reset', async () => {
      passwordResetService.requestPasswordReset.mockResolvedValue(undefined);

      const result = await controller.forgotPassword('test@example.com');

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual({
        message: 'Se o email estiver cadastrado, você receberá instruções',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password with token', async () => {
      const resetData = {
        token: 'token-123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      passwordResetService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword(resetData);

      expect(passwordResetService.resetPassword).toHaveBeenCalledWith(
        resetData.token,
        resetData.newPassword,
        resetData.confirmPassword,
      );
      expect(result).toEqual({
        message: 'Senha alterada com sucesso',
      });
    });
  });
});
