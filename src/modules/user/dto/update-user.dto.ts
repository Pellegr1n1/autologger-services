import { IsEmail, IsString, MinLength, IsOptional, Matches, IsEnum, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email?: string;


  @IsOptional()
  @IsString({ message: 'Google ID deve ser uma string' })
  googleId?: string;

  @IsOptional()
  @IsString({ message: 'Avatar deve ser uma string' })
  avatar?: string;

  @IsOptional()
  @IsEnum(['local', 'google'], { message: 'Provedor de autenticação deve ser local ou google' })
  authProvider?: 'local' | 'google';

  @IsOptional()
  @IsBoolean({ message: 'isActive deve ser um boolean' })
  isActive?: boolean;
}