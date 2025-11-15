import { Repository } from 'typeorm';

/**
 * Interface base para entidades de token
 */
export interface BaseTokenEntity {
  id: string;
  token: string;
  userId: string;
  used: boolean;
  expiresAt: Date;
  createdAt: Date;
  user?: any;
}

/**
 * Classe base abstrata para repositories de tokens
 * Elimina duplicação de código entre EmailVerificationRepository e PasswordResetRepository
 */
export abstract class BaseTokenRepository<T extends BaseTokenEntity> {
  constructor(protected readonly tokenRepository: Repository<T>) {}

  async create(token: string, userId: string, expiresAt: Date): Promise<T> {
    const tokenEntity = this.tokenRepository.create({
      token,
      userId,
      expiresAt,
      used: false,
    } as any);
    const saved = await this.tokenRepository.save(tokenEntity);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findByToken(token: string): Promise<T | null> {
    return await this.tokenRepository.findOne({
      where: { token } as any,
      relations: ['user'],
    });
  }

  async markAsUsed(token: string): Promise<void> {
    await this.tokenRepository.update({ token } as any, { used: true } as any);
  }

  async invalidateUserTokens(userId: string): Promise<void> {
    await this.tokenRepository.update(
      { userId, used: false } as any,
      { used: true } as any
    );
  }

  async deleteUserTokens(userId: string): Promise<void> {
    await this.tokenRepository.delete({ userId } as any);
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.tokenRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .execute();
  }
}

