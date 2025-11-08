import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailService } from '../email/email.service';
import { UserService } from '../user/services/user.service';
import { UserRepository } from '../user/repositories/user.repository';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly tokenRepository: PasswordResetRepository,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Gerar token de reset
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Solicitar reset de senha
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    
    if (!user) {
      return;
    }

    await this.tokenRepository.invalidateUserTokens(user.id);

    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.tokenRepository.create(token, user.id, expiresAt);
    await this.emailService.sendPasswordResetEmail(
      user.email,
      token,
      user.name,
    );
  }

  /**
   * Resetar senha com token
   */
  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<void> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    if (!this.isPasswordStrong(newPassword)) {
      throw new BadRequestException('A senha não atende aos requisitos mínimos de segurança');
    }

    const resetToken = await this.tokenRepository.findByToken(token);

    if (!resetToken) {
      throw new NotFoundException('Token inválido');
    }

    if (resetToken.used) {
      throw new BadRequestException('Este link já foi utilizado');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado. Solicite um novo link.');
    }

    await this.tokenRepository.markAsUsed(token);

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(resetToken.userId, {
      password: hashedPassword,
    });
  }

  /**
   * Validar força da senha
   */
  private isPasswordStrong(password: string): boolean {
    if (password.length < 8) return false;
    
    if (!/[a-z]/.test(password)) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/\d/.test(password)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
    
    return true;
  }

  /**
   * Validar token de reset
   */
  async validateResetToken(token: string): Promise<boolean> {
    const resetToken = await this.tokenRepository.findByToken(token);
    
    if (!resetToken) return false;
    if (resetToken.used) return false;
    if (resetToken.expiresAt < new Date()) return false;
    
    return true;
  }
}

