import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationToken } from './entities/email-verification-token.entity';

@Injectable()
export class EmailVerificationRepository {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepository: Repository<EmailVerificationToken>,
  ) {}

  async create(token: string, userId: string, expiresAt: Date): Promise<EmailVerificationToken> {
    const emailToken = this.tokenRepository.create({
      token,
      userId,
      expiresAt,
      used: false,
    });
    return await this.tokenRepository.save(emailToken);
  }

  async findByToken(token: string): Promise<EmailVerificationToken | null> {
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

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.tokenRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .execute();
  }

  async deleteUserTokens(userId: string): Promise<void> {
    await this.tokenRepository.delete({ userId });
  }
}

