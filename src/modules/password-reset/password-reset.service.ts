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
    // Buscar usuário usando UserService
    const user = await this.userService.findByEmail(email);
    
    // Por segurança, não revelar se o email existe
    if (!user) {
      // Simular envio mesmo se não existe (segurança)
      return;
    }

    // Invalidar tokens anteriores
    await this.tokenRepository.invalidateUserTokens(user.id);

    // Gerar novo token
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expira em 1 hora

    // Salvar token
    await this.tokenRepository.create(token, user.id, expiresAt);

    // Enviar email
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
    // Validar senhas coincidem
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    // Validar força da senha
    if (!this.isPasswordStrong(newPassword)) {
      throw new BadRequestException('A senha não atende aos requisitos mínimos de segurança');
    }

    // Validar token
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

    // Marcar token como usado
    await this.tokenRepository.markAsUsed(token);

    // Criptografar nova senha
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar senha do usuário
    await this.userRepository.update(resetToken.userId, {
      password: hashedPassword,
    });
  }

  /**
   * Validar força da senha
   */
  private isPasswordStrong(password: string): boolean {
    // Mínimo 8 caracteres
    if (password.length < 8) return false;
    
    // Deve conter letra minúscula
    if (!/[a-z]/.test(password)) return false;
    
    // Deve conter letra maiúscula
    if (!/[A-Z]/.test(password)) return false;
    
    // Deve conter número
    if (!/\d/.test(password)) return false;
    
    // Deve conter caractere especial
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

