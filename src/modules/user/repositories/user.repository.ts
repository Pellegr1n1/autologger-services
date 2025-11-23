import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined),
    );

    await this.userRepository.update(id, filteredData);
    return await this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: false });
  }

  async hardDelete(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { googleId } });
  }

  async createGoogleUser(userData: {
    name: string;
    email: string;
    googleId: string;
    avatar?: string;
    authProvider: 'google';
    isActive: boolean;
  }): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }
}
