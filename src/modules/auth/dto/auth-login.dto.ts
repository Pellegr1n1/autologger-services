import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class AuthLoginDto {
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(1, { message: 'Senha é obrigatória' })
  password: string;

  @IsOptional()
  @IsBoolean({ message: 'Remember me deve ser um booleano' })
  rememberMe?: boolean;
}
