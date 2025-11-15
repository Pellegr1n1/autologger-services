import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UserService } from '../../user/services/user.service';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userService: jest.Mocked<UserService>;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    isActive: true,
  };

  const mockPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    const mockUserService = {
      findById: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user when valid payload', async () => {
      userService.findById.mockResolvedValue(mockUser as any);

      const result = await strategy.validate(mockPayload);

      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userService.findById.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userService.findById.mockResolvedValue(inactiveUser as any);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on any error', async () => {
      userService.findById.mockRejectedValue(new Error('Database error'));

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

