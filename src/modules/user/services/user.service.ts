import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository';
import { EmailVerificationRepository } from '../../email-verification/email-verification.repository';
import { PasswordResetRepository } from '../../password-reset/password-reset.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { User } from '../entities/user.entity';
import { LoggerService } from '../../../common/logger/logger.service';
import { EmailService } from '../../email/email.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => EmailVerificationRepository))
    private readonly emailVerificationRepository: EmailVerificationRepository,
    @Inject(forwardRef(() => PasswordResetRepository))
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly logger: LoggerService,
    private readonly emailService: EmailService,
  ) {
    this.logger.setContext('UserService');
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      this.logger.warn(
        'Tentativa de criar usuário com email já existente',
        'UserService',
        {
          email: createUserDto.email,
        },
      );
      throw new ConflictException('Email já está em uso');
    }

    const userData = {
      ...createUserDto,
    };

    if (createUserDto.password) {
      const saltRounds = 12;
      userData.password = await bcrypt.hash(createUserDto.password, saltRounds);
    }

    const user = await this.userRepository.create(userData);
    return this.toUserResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user || !user.isActive) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.toUserResponseDto(user);
  }

  async updateProfile(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser || !existingUser.isActive) {
      this.logger.warn(
        'Tentativa de atualizar perfil de usuário inexistente ou inativo',
        'UserService',
        {
          userId: id,
        },
      );
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.validateEmailUpdate(id, existingUser, updateUserDto);

    // Verificar se o email está sendo alterado para enviar notificação
    const emailChanged =
      updateUserDto.email && updateUserDto.email !== existingUser.email;
    const oldEmail = existingUser.email;
    const userName = existingUser.name;

    const updateData = this.buildUpdateData(existingUser, updateUserDto);
    const updatedUser = await this.userRepository.update(id, updateData);

    if (!updatedUser) {
      this.logger.error(
        'Erro ao atualizar usuário no banco de dados',
        null,
        'UserService',
        {
          userId: id,
        },
      );
      throw new NotFoundException('Erro ao atualizar usuário');
    }

    // Enviar notificação de alteração de email se o email foi alterado
    if (emailChanged && updateUserDto.email) {
      try {
        await this.emailService.sendEmailChangeNotification(
          oldEmail,
          updateUserDto.email,
          userName,
        );
      } catch (error) {
        // Log do erro mas não falha a operação
        this.logger.warn(
          'Falha ao enviar email de notificação de alteração de email',
          'UserService',
          {
            userId: id,
            oldEmail,
            newEmail: updateUserDto.email,
            errorMessage: error.message,
          },
        );
      }
    }

    return this.toUserResponseDto(updatedUser);
  }

  /**
   * Valida se a atualização de email é permitida
   */
  private async validateEmailUpdate(
    id: string,
    existingUser: User,
    updateUserDto: UpdateUserDto,
  ): Promise<void> {
    if (!updateUserDto.email || updateUserDto.email === existingUser.email) {
      return;
    }

    if (existingUser.authProvider === 'google') {
      throw new BadRequestException(
        'Não é possível alterar o email de uma conta autenticada via Google. O email é sincronizado automaticamente com sua conta Google.',
      );
    }

    const userWithEmail = await this.userRepository.findByEmail(
      updateUserDto.email,
    );
    if (userWithEmail && userWithEmail.id !== id) {
      throw new ConflictException('Email já está em uso por outro usuário');
    }
  }

  /**
   * Constrói o objeto de dados para atualização
   */
  private buildUpdateData(
    existingUser: User,
    updateUserDto: UpdateUserDto,
  ): Partial<User> {
    const updateData: Partial<User> = {};

    if (updateUserDto.name) {
      updateData.name = updateUserDto.name;
    }

    if (updateUserDto.email && existingUser.authProvider !== 'google') {
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.googleId !== undefined) {
      updateData.googleId = updateUserDto.googleId;
    }

    if (updateUserDto.avatar !== undefined) {
      updateData.avatar = updateUserDto.avatar;
    }

    if (updateUserDto.authProvider !== undefined) {
      updateData.authProvider = updateUserDto.authProvider;
    }

    if (updateUserDto.isActive !== undefined) {
      updateData.isActive = updateUserDto.isActive;
    }

    return updateData;
  }

  /**
   * Atualiza o usuário mesmo se estiver inativo (usado para reativação via OAuth)
   */
  async updateProfileAllowInactive(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(
        updateUserDto.email,
      );
      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictException('Email já está em uso por outro usuário');
      }
    }

    const updateData: Partial<User> = {};

    if (updateUserDto.name) {
      updateData.name = updateUserDto.name;
    }
    if (updateUserDto.email) {
      updateData.email = updateUserDto.email;
    }
    if (updateUserDto.googleId !== undefined) {
      updateData.googleId = updateUserDto.googleId;
    }
    if (updateUserDto.avatar !== undefined) {
      updateData.avatar = updateUserDto.avatar;
    }
    if (updateUserDto.authProvider !== undefined) {
      updateData.authProvider = updateUserDto.authProvider;
    }
    if (updateUserDto.isActive !== undefined) {
      updateData.isActive = updateUserDto.isActive;
    }

    const updatedUser = await this.userRepository.update(id, updateData);
    if (!updatedUser) {
      throw new NotFoundException('Erro ao atualizar usuário');
    }
    return this.toUserResponseDto(updatedUser);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.warn(
        'Tentativa de excluir conta de usuário inexistente',
        'UserService',
        {
          userId,
        },
      );
      throw new NotFoundException('Usuário não encontrado');
    }

    // Salvar dados do usuário antes de excluir para enviar email
    const userEmail = user.email;
    const userName = user.name;

    await this.emailVerificationRepository.deleteUserTokens(userId);
    await this.passwordResetRepository.deleteUserTokens(userId);
    await this.userRepository.hardDelete(userId);

    // Enviar notificação de exclusão de conta
    try {
      await this.emailService.sendAccountDeletionNotification(
        userEmail,
        userName,
      );
    } catch (error) {
      // Log do erro mas não falha a operação (conta já foi excluída)
      this.logger.warn(
        'Falha ao enviar email de notificação de exclusão de conta',
        'UserService',
        {
          userId,
          email: userEmail,
          errorMessage: error.message,
        },
      );
    }

    this.logger.log('Conta de usuário excluída', 'UserService', {
      userId,
      email: userEmail,
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return await this.userRepository.findByGoogleId(googleId);
  }

  async createGoogleUser(googleUser: any): Promise<User> {
    const userData = {
      name: googleUser.name,
      email: googleUser.email,
      googleId: googleUser.googleId,
      avatar: googleUser.avatar,
      authProvider: 'google' as const,
      isActive: true,
    };

    const user = await this.userRepository.createGoogleUser(userData);
    return user;
  }

  /**
   * Marcar email como verificado
   */
  async markEmailAsVerified(userId: string): Promise<void> {
    await this.userRepository.update(userId, { isEmailVerified: true });
  }

  /**
   * Marcar email como não verificado
   */
  async markEmailAsUnverified(userId: string): Promise<void> {
    await this.userRepository.update(userId, { isEmailVerified: false });
  }

  private toUserResponseDto(user: User): UserResponseDto {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userResponse } = user;
    return userResponse;
  }
}
