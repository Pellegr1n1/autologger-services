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

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => EmailVerificationRepository))
    private readonly emailVerificationRepository: EmailVerificationRepository,
    @Inject(forwardRef(() => PasswordResetRepository))
    private readonly passwordResetRepository: PasswordResetRepository,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Verifica se o usuário já existe
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
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

  async updateProfile(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser || !existingUser.isActive) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (existingUser.authProvider === 'google' && updateUserDto.email && updateUserDto.email !== existingUser.email) {
      throw new BadRequestException('Não é possível alterar o email de uma conta autenticada via Google. O email é sincronizado automaticamente com sua conta Google.');
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(updateUserDto.email);
      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictException('Email já está em uso por outro usuário');
      }
    }

    const updateData: Partial<User> = {};
    
    if (updateUserDto.name) {
      updateData.name = updateUserDto.name;
    }
    
    // Para contas Google, não atualizar o email mesmo se fornecido
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

    const updatedUser = await this.userRepository.update(id, updateData);
    
    if (!updatedUser) {
      throw new NotFoundException('Erro ao atualizar usuário');
    }
    
    return this.toUserResponseDto(updatedUser);
  }

  /**
   * Atualiza o usuário mesmo se estiver inativo (usado para reativação via OAuth)
   */
  async updateProfileAllowInactive(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(updateUserDto.email);
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
      throw new NotFoundException('Usuário não encontrado');
    }
    
    await this.emailVerificationRepository.deleteUserTokens(userId);
    await this.passwordResetRepository.deleteUserTokens(userId);
    await this.userRepository.hardDelete(userId);
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

    return await this.userRepository.createGoogleUser(userData);
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
    const { password, ...userResponse } = user;
    return userResponse;
  }
}