import { IsEmail, IsString, MinLength, IsOptional, Matches, MaxLength } from 'class-validator';

export class AuthRegisterDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name: string;

  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email: string;

  @IsOptional()
  @IsString({ message: 'Telefone deve ser uma string' })
  @Matches(/^\d{10,11}$/, {
    message: 'Telefone deve conter apenas números e ter 10 ou 11 dígitos'
  })
  phone?: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'
  })
  password: string;

  @IsString({ message: 'Confirmação de senha deve ser uma string' })
  @MinLength(8, { message: 'Confirmação de senha deve ter pelo menos 8 caracteres' })
  confirmPassword: string;
}