import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../modules/user/services/user.service';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { CreateUserDto } from '../modules/user/dto/create-user.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(authRegisterDto: AuthRegisterDto): Promise<AuthResponseDto> {
    if (authRegisterDto.password !== authRegisterDto.confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    try {
      const createUserDto: CreateUserDto = {
        name: authRegisterDto.name,
        email: authRegisterDto.email,
        phone: authRegisterDto.phone,
        password: authRegisterDto.password,
      };

      const user = await this.userService.create(createUserDto);
      
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        name: user.name,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async login(authLoginDto: AuthLoginDto): Promise<AuthResponseDto> {
    const user = await this.userService.findByEmail(authLoginDto.email);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await this.userService.validatePassword(
      authLoginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    };
  }
}