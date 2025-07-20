import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Verifica se o usuário já existe
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    // Criptografa a senha
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Cria o usuário
    const userData = {
      ...createUserDto,
      password: hashedPassword,
    };

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
    // Verifica se o usuário existe
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser || !existingUser.isActive) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Se o email está sendo alterado, verifica se já não está em uso por outro usuário
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(updateUserDto.email);
      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictException('Email já está em uso por outro usuário');
      }
    }

    // Atualiza apenas os campos fornecidos
    const updateData: Partial<User> = {};
    
    if (updateUserDto.name) {
      updateData.name = updateUserDto.name;
    }
    
    if (updateUserDto.email) {
      updateData.email = updateUserDto.email;
    }
    
    if (updateUserDto.phone !== undefined) {
      updateData.phone = updateUserDto.phone;
    }

    // Atualiza no banco
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
    await this.userRepository.softDelete(userId);
  }

  private toUserResponseDto(user: User): UserResponseDto {
    const { password, ...userResponse } = user;
    return userResponse;
  }
}