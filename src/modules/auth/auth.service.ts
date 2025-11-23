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
import { LoggerService } from '../../common/logger/logger.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly logger: LoggerService,
    private readonly emailService: EmailService,
  ) {
    this.logger.setContext('AuthService');
  }

  async register(authRegisterDto: AuthRegisterDto): Promise<AuthResponseDto> {
    if (authRegisterDto.password !== authRegisterDto.confirmPassword) {
      this.logger.warn(
        'Tentativa de registro com senhas não coincidentes',
        'AuthService',
        {
          email: authRegisterDto.email,
        },
      );
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

      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
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
      this.logger.error(
        'Erro ao registrar usuário',
        error.stack,
        'AuthService',
        {
          email: authRegisterDto.email,
          errorMessage: error.message,
        },
      );
      throw new BadRequestException(error.message);
    }
  }

  async login(authLoginDto: AuthLoginDto): Promise<AuthResponseDto> {
    const user = await this.userService.findByEmail(authLoginDto.email);

    if (!user?.isActive) {
      this.logger.warn(
        'Tentativa de login com usuário inativo ou inexistente',
        'AuthService',
        {
          email: authLoginDto.email,
        },
      );
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.authProvider !== 'local') {
      this.logger.warn(
        'Tentativa de login local para conta Google',
        'AuthService',
        {
          email: authLoginDto.email,
          authProvider: user.authProvider,
        },
      );
      throw new UnauthorizedException('Use o login com Google para esta conta');
    }

    const isPasswordValid = await this.userService.validatePassword(
      authLoginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn('Tentativa de login com senha inválida', 'AuthService', {
        email: authLoginDto.email,
        userId: user.id,
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
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
    this.logger.log('Validação de usuário Google', 'AuthService', {
      email: googleUser.email,
      googleId: googleUser.googleId,
    });

    if (!googleUser.googleId || !googleUser.email) {
      this.logger.warn('Dados do usuário Google inválidos', 'AuthService', {
        hasGoogleId: !!googleUser.googleId,
        hasEmail: !!googleUser.email,
      });
      throw new BadRequestException('Dados do usuário Google inválidos');
    }

    const existingUser = await this.userService.findByGoogleId(
      googleUser.googleId,
    );

    if (existingUser) {
      if (!existingUser.isActive) {
        this.logger.log('Reativando usuário Google inativo', 'AuthService', {
          userId: existingUser.id,
          email: existingUser.email,
        });
        await this.userService.updateProfileAllowInactive(existingUser.id, {
          isActive: true,
          avatar: googleUser.avatar,
          name: googleUser.name,
        });
        const reactivatedUser = await this.userService.findByGoogleId(
          googleUser.googleId,
        );
        this.logger.log('Usuário Google reativado', 'AuthService', {
          userId: reactivatedUser.id,
        });
        return reactivatedUser;
      }

      this.logger.log('Usuário Google existente encontrado', 'AuthService', {
        userId: existingUser.id,
      });
      return existingUser;
    }

    const userByEmail = await this.userService.findByEmail(googleUser.email);
    if (userByEmail) {
      if (userByEmail.authProvider === 'local') {
        this.logger.warn(
          'Tentativa de login Google com email já cadastrado localmente',
          'AuthService',
          {
            email: googleUser.email,
          },
        );
        throw new BadRequestException(
          'Já existe uma conta com este email. Use login com senha.',
        );
      }

      if (!userByEmail.isActive) {
        this.logger.log(
          'Reativando e vinculando conta Google a usuário existente',
          'AuthService',
          {
            userId: userByEmail.id,
            email: userByEmail.email,
          },
        );
        await this.userService.updateProfileAllowInactive(userByEmail.id, {
          isActive: true,
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          authProvider: 'google',
          name: googleUser.name,
        });
        const reactivatedUser = await this.userService.findByEmail(
          googleUser.email,
        );
        return reactivatedUser;
      }

      if (!userByEmail.googleId) {
        this.logger.log(
          'Vinculando Google ID a usuário existente',
          'AuthService',
          {
            userId: userByEmail.id,
          },
        );
        await this.userService.updateProfile(userByEmail.id, {
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          authProvider: 'google',
        });
      }
      return userByEmail;
    }

    this.logger.log('Criando novo usuário Google', 'AuthService', {
      email: googleUser.email,
    });
    const newUser = await this.userService.createGoogleUser(googleUser);
    this.logger.log('Usuário Google criado com sucesso', 'AuthService', {
      userId: newUser.id,
      email: newUser.email,
    });
    return newUser;
  }

  async googleLogin(user: any): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
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
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      this.logger.warn(
        'Tentativa de alteração de senha com confirmação incorreta',
        'AuthService',
        {
          userId,
        },
      );
      throw new BadRequestException('As senhas não coincidem');
    }

    if (!isPasswordStrong(changePasswordDto.newPassword)) {
      this.logger.warn(
        'Tentativa de alteração de senha com senha fraca',
        'AuthService',
        {
          userId,
        },
      );
      throw new BadRequestException(
        'A senha não atende aos requisitos mínimos de segurança',
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user?.isActive) {
      this.logger.warn(
        'Tentativa de alteração de senha para usuário inativo',
        'AuthService',
        {
          userId,
        },
      );
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (user.authProvider !== 'local') {
      this.logger.warn(
        'Tentativa de alteração de senha para usuário Google',
        'AuthService',
        {
          userId,
          authProvider: user.authProvider,
        },
      );
      throw new BadRequestException(
        'Usuários autenticados via Google não podem alterar senha',
      );
    }

    if (!user.password) {
      this.logger.warn(
        'Tentativa de alteração de senha para usuário sem senha',
        'AuthService',
        {
          userId,
        },
      );
      throw new BadRequestException('Usuário não possui senha cadastrada');
    }

    const isCurrentPasswordValid = await this.userService.validatePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      this.logger.warn(
        'Tentativa de alteração de senha com senha atual incorreta',
        'AuthService',
        {
          userId,
        },
      );
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      saltRounds,
    );

    await this.userRepository.update(userId, {
      password: hashedPassword,
    });

    // Enviar notificação de alteração de senha
    try {
      await this.emailService.sendPasswordChangeNotification(
        user.email,
        user.name,
      );
    } catch (error) {
      // Log do erro mas não falha a operação
      this.logger.warn(
        'Falha ao enviar email de notificação de alteração de senha',
        'AuthService',
        {
          userId,
          email: user.email,
          errorMessage: error.message,
        },
      );
    }

    return { message: 'Senha alterada com sucesso' };
  }
}
