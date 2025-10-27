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
          avatar: user.avatar,
          authProvider: user.authProvider,
          isEmailVerified: user.isEmailVerified,
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

    if (user.authProvider !== 'local') {
      throw new UnauthorizedException('Use o login com Google para esta conta');
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
        avatar: user.avatar,
        authProvider: user.authProvider,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async validateGoogleUser(googleUser: any) {
    console.log('Validating Google user:', googleUser);
    
    if (!googleUser.googleId || !googleUser.email) {
      throw new BadRequestException('Dados do usuário Google inválidos');
    }

    const existingUser = await this.userService.findByGoogleId(googleUser.googleId);
    
    if (existingUser) {
      console.log('Found existing user by Google ID:', existingUser.id);
      return existingUser;
    }

    const userByEmail = await this.userService.findByEmail(googleUser.email);
    if (userByEmail) {
      console.log('Found existing user by email:', userByEmail.id, 'authProvider:', userByEmail.authProvider);
      if (userByEmail.authProvider === 'local') {
        throw new BadRequestException('Já existe uma conta com este email. Use login com senha.');
      }
      // Atualizar usuário existente com Google ID se necessário
      if (!userByEmail.googleId) {
        console.log('Updating existing user with Google ID');
        await this.userService.updateProfile(userByEmail.id, {
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          authProvider: 'google'
        });
      }
      return userByEmail;
    }

    console.log('Creating new Google user');
    const newUser = await this.userService.createGoogleUser(googleUser);
    return newUser;
  }

  async googleLogin(user: any): Promise<AuthResponseDto> {
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
        avatar: user.avatar,
        authProvider: user.authProvider,
        isEmailVerified: user.isEmailVerified || true, // Google users are pre-verified
      },
    };
  }
}