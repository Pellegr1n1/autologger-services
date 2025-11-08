import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';

@Injectable()
export class PasswordResetRepository {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepository: Repository<PasswordResetToken>,
  ) {}

  async create(token: string, userId: string, expiresAt: Date): Promise<PasswordResetToken> {
    const resetToken = this.tokenRepository.create({
      token,
      userId,
      expiresAt,
      used: false,
    });
    return await this.tokenRepository.save(resetToken);
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    return await this.tokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });
  }

  async markAsUsed(token: string): Promise<void> {
    await this.tokenRepository.update({ token }, { used: true });
  }

  async invalidateUserTokens(userId: string): Promise<void> {
    await this.tokenRepository.update(
      { userId, used: false },
      { used: true }
    );
  }

  async deleteUserTokens(userId: string): Promise<void> {
    await this.tokenRepository.delete({ userId });
  }
}

