import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../auth.service';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

  const mockGoogleUser = {
    googleId: 'google-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    authProvider: 'google' as const,
  };

  const mockValidatedUser = {
    id: 'user-123',
    ...mockGoogleUser,
  };

  const mockProfile = {
    id: 'google-123',
    name: {
      givenName: 'Test',
      familyName: 'User',
    },
    emails: [{ value: 'test@example.com' }],
    photos: [{ value: 'https://example.com/avatar.jpg' }],
  };

  beforeEach(async () => {
    const mockAuthService = {
      validateGoogleUser: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'test-client-id',
          GOOGLE_CLIENT_SECRET: 'test-client-secret',
          GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate and return user from Google profile', async () => {
      authService.validateGoogleUser.mockResolvedValue(mockValidatedUser as any);

      const done = jest.fn();

      await strategy.validate(
        'access-token',
        'refresh-token',
        mockProfile,
        done,
      );

      expect(authService.validateGoogleUser).toHaveBeenCalledWith({
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        authProvider: 'google',
      });
      expect(done).toHaveBeenCalledWith(null, mockValidatedUser);
    });

    it('should handle profile with missing photos array', async () => {
      const minimalProfile = {
        id: 'google-123',
        name: {
          givenName: 'Test',
          familyName: 'User',
        },
        emails: [{ value: 'test@example.com' }],
        photos: [],
      };

      // This will throw because photos[0] is undefined
      const done = jest.fn();

      await expect(
        strategy.validate(
          'access-token',
          'refresh-token',
          minimalProfile,
          done,
        ),
      ).rejects.toThrow();
    });

    it('should propagate validation errors', async () => {
      const error = new Error('Validation failed');
      authService.validateGoogleUser.mockRejectedValue(error);

      const done = jest.fn();

      // The error is not caught in the strategy, so it propagates
      await expect(
        strategy.validate(
          'access-token',
          'refresh-token',
          mockProfile,
          done,
        ),
      ).rejects.toThrow('Validation failed');

      expect(authService.validateGoogleUser).toHaveBeenCalled();
      expect(done).not.toHaveBeenCalled();
    });
  });
});

