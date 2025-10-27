import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private getTransporter(): nodemailer.Transporter {
    // Configurar o transporter dinamicamente
    // Para desenvolvimento, usa Ethereal Email (fake SMTP)
    // Para produção, configure com SendGrid, AWS SES, ou Gmail
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'default_user',
        pass: process.env.SMTP_PASS || 'default_pass',
      },
    });
  }

  /**
   * Enviar email de verificação
   */
  async sendVerificationEmail(email: string, token: string, userName: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@autologger.com',
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
            
            <p>Olá ${userName},</p>
            
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
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@autologger.com',
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
            
            <p>Olá ${userName},</p>
            
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

