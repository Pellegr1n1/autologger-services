import { AuthResponseDto } from './auth-response.dto';

describe('AuthResponseDto', () => {
  it('should be defined', () => {
    expect(AuthResponseDto).toBeDefined();
  });

  it('should create instance with all properties', () => {
    const dto = new AuthResponseDto();
    dto.access_token = 'test-token';
    dto.user = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
      authProvider: 'local',
      isEmailVerified: true,
    };

    expect(dto.access_token).toBe('test-token');
    expect(dto.user.id).toBe('user-123');
    expect(dto.user.name).toBe('Test User');
    expect(dto.user.email).toBe('test@example.com');
    expect(dto.user.avatar).toBe('https://example.com/avatar.jpg');
    expect(dto.user.authProvider).toBe('local');
    expect(dto.user.isEmailVerified).toBe(true);
  });

  it('should create instance with google auth provider', () => {
    const dto = new AuthResponseDto();
    dto.access_token = 'test-token';
    dto.user = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
      authProvider: 'google',
      isEmailVerified: true,
    };

    expect(dto.user.authProvider).toBe('google');
  });

  it('should create instance without avatar', () => {
    const dto = new AuthResponseDto();
    dto.access_token = 'test-token';
    dto.user = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      authProvider: 'local',
      isEmailVerified: false,
    };

    expect(dto.user.avatar).toBeUndefined();
    expect(dto.user.isEmailVerified).toBe(false);
  });
});
