import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/services/user.service';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthLoginDto } from './dto/auth-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRepository } from '../user/repositories/user.repository';
import { isPasswordStrong } from '../../common/utils/password.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
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
    
    if (!user?.isActive) {
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
    if (!googleUser.googleId || !googleUser.email) {
      throw new BadRequestException('Dados do usuário Google inválidos');
    }

    const existingUser = await this.userService.findByGoogleId(googleUser.googleId);
    
    if (existingUser) {
      // Se o usuário existe mas está inativo, reativá-lo
      if (!existingUser.isActive) {
        await this.userService.updateProfileAllowInactive(existingUser.id, {
          isActive: true,
          avatar: googleUser.avatar,
          name: googleUser.name
        });
        // Buscar o usuário atualizado
        const reactivatedUser = await this.userService.findByGoogleId(googleUser.googleId);
        return reactivatedUser;
      }
      
      return existingUser;
    }

    const userByEmail = await this.userService.findByEmail(googleUser.email);
    if (userByEmail) {
      if (userByEmail.authProvider === 'local') {
        throw new BadRequestException('Já existe uma conta com este email. Use login com senha.');
      }
      
      // Se o usuário existe mas está inativo, reativá-lo e atualizar com Google ID
      if (!userByEmail.isActive) {
        await this.userService.updateProfileAllowInactive(userByEmail.id, {
          isActive: true,
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          authProvider: 'google',
          name: googleUser.name
        });
        // Buscar o usuário atualizado
        const reactivatedUser = await this.userService.findByEmail(googleUser.email);
        return reactivatedUser;
      }
      
      // Atualizar usuário existente com Google ID se necessário
      if (!userByEmail.googleId) {
        await this.userService.updateProfile(userByEmail.id, {
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          authProvider: 'google'
        });
      }
      return userByEmail;
    }

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

  /**
   * Alterar senha do usuário autenticado
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    if (!isPasswordStrong(changePasswordDto.newPassword)) {
      throw new BadRequestException('A senha não atende aos requisitos mínimos de segurança');
    }

    const user = await this.userRepository.findById(userId);
    if (!user?.isActive) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (user.authProvider !== 'local') {
      throw new BadRequestException('Usuários autenticados via Google não podem alterar senha');
    }

    if (!user.password) {
      throw new BadRequestException('Usuário não possui senha cadastrada');
    }

    const isCurrentPasswordValid = await this.userService.validatePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

    await this.userRepository.update(userId, {
      password: hashedPassword,
    });

    return { message: 'Senha alterada com sucesso' };
  }

}