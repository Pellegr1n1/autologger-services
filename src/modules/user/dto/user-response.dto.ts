export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}