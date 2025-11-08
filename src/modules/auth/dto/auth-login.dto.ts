import { IsEmail, IsString, MinLength } from 'class-validator';

export class AuthLoginDto {
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(1, { message: 'Senha é obrigatória' })
  password: string;
}