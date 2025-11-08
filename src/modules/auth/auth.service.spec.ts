import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/services/user.service';
import { UserRepository } from '../user/repositories/user.repository';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthLoginDto } from './dto/auth-login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

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
});

