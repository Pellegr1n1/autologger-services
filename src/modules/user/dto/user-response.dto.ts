export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  authProvider: 'local' | 'google';
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}