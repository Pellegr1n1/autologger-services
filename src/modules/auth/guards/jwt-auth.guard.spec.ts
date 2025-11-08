import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should call super.canActivate', () => {
      const context = {} as ExecutionContext;
      
      const superCanActivate = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivate.mockReturnValue(Promise.resolve(true));

      const result = guard.canActivate(context);

      expect(superCanActivate).toHaveBeenCalledWith(context);
      expect(result).toBeDefined();
    });
  });

  describe('handleRequest', () => {
    it('should return user when valid', () => {
      const user = { id: 'user-123', email: 'test@example.com' };

      const result = guard.handleRequest(null, user, null);

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => {
        guard.handleRequest(null, null, null);
      }).toThrow(UnauthorizedException);
      expect(() => {
        guard.handleRequest(null, null, null);
      }).toThrow('Token inválido ou expirado');
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => {
        guard.handleRequest(null, undefined, null);
      }).toThrow(UnauthorizedException);
    });

    it('should throw error when error is provided', () => {
      const error = new Error('Token expired');

      expect(() => {
        guard.handleRequest(error, null, null);
      }).toThrow(error);
    });

    it('should throw error when error is provided even if user exists', () => {
      const error = new Error('Token expired');
      const user = { id: 'user-123', email: 'test@example.com' };

      expect(() => {
        guard.handleRequest(error, user, null);
      }).toThrow(error);
    });
  });
});

