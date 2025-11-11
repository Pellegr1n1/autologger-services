import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { validateEmailEnvVars } from '../../common/utils/env.util';
import { sanitizeUserName } from '../../common/utils/sanitize.util';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private getTransporter(): nodemailer.Transporter {
    try {
      const { smtpHost, smtpPort, smtpUser, smtpPass } = validateEmailEnvVars();
      
      return nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } catch (error) {
      this.logger.error(`Erro ao configurar transporte de email: ${error.message}`);
      throw new Error(`Configuração de email inválida: ${error.message}`);
    }
  }

  /**
   * Enviar email de verificação
   */
  async sendVerificationEmail(email: string, token: string, userName: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email/${token}`;
    const { smtpFrom } = validateEmailEnvVars();
    const sanitizedUserName = sanitizeUserName(userName);

    const mailOptions = {
      from: smtpFrom,
      to: email,
      subject: 'Verifique seu email - AutoLogger',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verifique seu email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8b5cf6;">Bem-vindo ao AutoLogger!</h1>
            
            <p>Olá ${sanitizedUserName},</p>
            
            <p>Obrigado por se cadastrar no AutoLogger. Para completar seu cadastro, 
            por favor verifique seu email clicando no botão abaixo:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; padding: 12px 30px; 
                 background-color: #8b5cf6; color: white; 
                 text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verificar Email
              </a>
            </div>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              Se você não se cadastrou no AutoLogger, ignore este email.
            </p>
            
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              Este link expira em 24 horas.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      this.logger.log(`Email de verificação enviado para ${email}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar email para ${email}:`, error);
      throw error;
    }
  }

  /**
   * Enviar email de recuperação de senha
   */
  async sendPasswordResetEmail(email: string, token: string, userName: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    const { smtpFrom } = validateEmailEnvVars();
    const sanitizedUserName = sanitizeUserName(userName);

    const mailOptions = {
      from: smtpFrom,
      to: email,
      subject: 'Redefinição de senha - AutoLogger',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Redefinir senha</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8b5cf6;">Redefinir Senha</h1>
            
            <p>Olá ${sanitizedUserName},</p>
            
            <p>Você solicitou a redefinição de senha para sua conta no AutoLogger.</p>
            
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; padding: 12px 30px; 
                 background-color: #8b5cf6; color: white; 
                 text-decoration: none; border-radius: 5px; font-weight: bold;">
                Redefinir Senha
              </a>
            </div>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              Se você não solicitou esta redefinição, ignore este email. 
              Sua senha permanecerá a mesma.
            </p>
            
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              Este link expira em 1 hora.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      this.logger.log(`Email de recuperação enviado para ${email}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar email para ${email}:`, error);
      throw error;
    }
  }
}

