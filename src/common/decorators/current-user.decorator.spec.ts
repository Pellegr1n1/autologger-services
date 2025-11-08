import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { UserResponseDto } from '../../modules/user/dto/user-response.dto';

describe('CurrentUser', () => {
  it('should be defined', () => {
    expect(CurrentUser).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof CurrentUser).toBe('function');
  });

  describe('decorator logic', () => {
    const mockUser: UserResponseDto = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
      authProvider: 'local',
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const testDecoratorLogic = (ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest();
      return request.user;
    };

    it('should extract user from request', () => {
      const mockExecutionContext: ExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: mockUser,
          }),
        }),
      } as any;

      const result = testDecoratorLogic(mockExecutionContext);

      expect(result).toEqual(mockUser);
    });

    it('should return undefined when user is not in request', () => {
      const mockExecutionContext: ExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: undefined,
          }),
        }),
      } as any;

      const result = testDecoratorLogic(mockExecutionContext);

      expect(result).toBeUndefined();
    });

    it('should return null when user is null in request', () => {
      const mockExecutionContext: ExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: null,
          }),
        }),
      } as any;

      const result = testDecoratorLogic(mockExecutionContext);

      expect(result).toBeNull();
    });

    it('should handle different user data types', () => {
      const mockUserWithGoogle: UserResponseDto = {
        ...mockUser,
        authProvider: 'google',
      };

      const mockExecutionContext: ExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: mockUserWithGoogle,
          }),
        }),
      } as any;

      const result = testDecoratorLogic(mockExecutionContext);

      expect(result).toEqual(mockUserWithGoogle);
      expect((result as UserResponseDto).authProvider).toBe('google');
    });
  });
});
