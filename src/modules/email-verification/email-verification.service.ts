import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { EmailService } from '../email/email.service';
import { UserService } from '../user/services/user.service';
import * as crypto from 'crypto';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly tokenRepository: EmailVerificationRepository,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
  ) {}

  /**
   * Gerar token de verificação
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Enviar email de verificação
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    // Buscar usuário
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email já verificado');
    }

    // Invalidar tokens anteriores
    await this.tokenRepository.invalidateUserTokens(userId);

    // Gerar novo token
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expira em 24 horas

    // Salvar token
    await this.tokenRepository.create(token, userId, expiresAt);

    // Enviar email
    await this.emailService.sendVerificationEmail(
      user.email,
      token,
      user.name,
    );
  }

  /**
   * Verificar email com token
   */
  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await this.tokenRepository.findByToken(token);

    if (!verificationToken) {
      throw new NotFoundException('Token inválido');
    }

    if (verificationToken.used) {
      throw new BadRequestException('Este link já foi utilizado');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado. Solicite um novo link.');
    }

    // Marcar token como usado
    await this.tokenRepository.markAsUsed(token);

    // Marcar email como verificado no usuário
    await this.userService.markEmailAsVerified(verificationToken.userId);

    // Invalidar outros tokens do usuário
    await this.tokenRepository.invalidateUserTokens(verificationToken.userId);
  }

  /**
   * Reenviar email de verificação
   */
  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userService.findById(userId);
    
    if (user.isEmailVerified) {
      throw new BadRequestException('Email já verificado');
    }

    await this.sendVerificationEmail(userId);
  }

  /**
   * Verificar status de verificação
   */
  async checkVerificationStatus(userId: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    return user.isEmailVerified;
  }
}

