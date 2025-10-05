export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  authProvider: 'local' | 'google';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}