import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { validateEmailEnvVars } from '../../common/utils/env.util';
import { sanitizeUserName } from '../../common/utils/sanitize.util';
import { LoggerService } from '../../common/logger/logger.service';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('EmailService');
    this.initializeResend();
  }

  private initializeResend(): void {
    try {
      const { resendApiKey } = validateEmailEnvVars();
      this.resend = new Resend(resendApiKey);
    } catch (error) {
      this.logger.error(
        'Erro ao inicializar Resend',
        error.stack,
        'EmailService',
        {
          errorMessage: error.message,
        },
      );
      throw new Error(`Configuração de email inválida: ${error.message}`);
    }
  }

  /**
   * Enviar email de verificação
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    userName: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const encodedToken = encodeURIComponent(token);
    const verificationUrl = `${frontendUrl}/verify-email/${encodedToken}`;
    const { emailFrom } = validateEmailEnvVars();
    const sanitizedUserName = sanitizeUserName(userName);

    try {
      const { data, error } = await this.resend.emails.send({
        from: emailFrom,
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
      });

      if (error) {
        throw error;
      }

      this.logger.log('Email de verificação enviado', 'EmailService', {
        email,
        messageId: data?.id,
      });
    } catch (error) {
      this.logger.error(
        'Erro ao enviar email de verificação',
        error.stack,
        'EmailService',
        {
          email,
          errorMessage: error.message,
        },
      );
      throw error;
    }
  }

  /**
   * Enviar email de recuperação de senha
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    userName: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    const { emailFrom } = validateEmailEnvVars();
    const sanitizedUserName = sanitizeUserName(userName);

    try {
      const { data, error } = await this.resend.emails.send({
        from: emailFrom,
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
      });

      if (error) {
        throw error;
      }

      this.logger.log('Email de recuperação de senha enviado', 'EmailService', {
        email,
        messageId: data?.id,
      });
    } catch (error) {
      this.logger.error(
        'Erro ao enviar email de recuperação de senha',
        error.stack,
        'EmailService',
        {
          email,
          errorMessage: error.message,
        },
      );
      throw error;
    }
  }

  /**
   * Enviar email de notificação de alteração de senha
   */
  async sendPasswordChangeNotification(
    email: string,
    userName: string,
  ): Promise<void> {
    const { emailFrom } = validateEmailEnvVars();
    const sanitizedUserName = sanitizeUserName(userName);
    const currentDate = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      const { data, error } = await this.resend.emails.send({
        from: emailFrom,
        to: email,
        subject: 'Senha alterada - AutoLogger',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Senha alterada</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8b5cf6;">Senha Alterada com Sucesso</h1>
            
            <p>Olá ${sanitizedUserName},</p>
            
            <p>Este é um aviso de segurança informando que a senha da sua conta AutoLogger foi alterada com sucesso.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Data e hora:</strong> ${currentDate}</p>
            </div>
            
            <p>Se você não realizou esta alteração, entre em contato conosco imediatamente através do nosso suporte.</p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              Por segurança, recomendamos que você:
            </p>
            <ul style="font-size: 12px; color: #999;">
              <li>Use uma senha forte e única</li>
              <li>Não compartilhe sua senha com ninguém</li>
              <li>Ative a autenticação de dois fatores, se disponível</li>
            </ul>
            
            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              Se você realizou esta alteração, pode ignorar este email com segurança.
            </p>
          </div>
        </body>
        </html>
      `,
      });

      if (error) {
        throw error;
      }

      this.logger.log(
        'Email de notificação de alteração de senha enviado',
        'EmailService',
        {
          email,
          messageId: data?.id,
        },
      );
    } catch (error) {
      this.logger.error(
        'Erro ao enviar email de notificação de alteração de senha',
        error.stack,
        'EmailService',
        {
          email,
          errorMessage: error.message,
        },
      );
      throw error;
    }
  }

  /**
   * Enviar email de notificação de exclusão de conta
   */
  async sendAccountDeletionNotification(
    email: string,
    userName: string,
  ): Promise<void> {
    const { emailFrom } = validateEmailEnvVars();
    const sanitizedUserName = sanitizeUserName(userName);
    const currentDate = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      const { data, error } = await this.resend.emails.send({
        from: emailFrom,
        to: email,
        subject: 'Conta excluída - AutoLogger',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Conta excluída</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8b5cf6;">Conta Excluída</h1>
            
            <p>Olá ${sanitizedUserName},</p>
            
            <p>Confirmamos que sua conta no AutoLogger foi excluída com sucesso.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Data e hora da exclusão:</strong> ${currentDate}</p>
            </div>
            
            <p>Todos os seus dados foram removidos permanentemente do nosso sistema, de acordo com nossa política de privacidade.</p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              Se você não solicitou a exclusão da sua conta, entre em contato conosco imediatamente através do nosso suporte.
            </p>
            
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              Esperamos vê-lo novamente no futuro!
            </p>
          </div>
        </body>
        </html>
      `,
      });

      if (error) {
        throw error;
      }

      this.logger.log(
        'Email de notificação de exclusão de conta enviado',
        'EmailService',
        {
          email,
          messageId: data?.id,
        },
      );
    } catch (error) {
      this.logger.error(
        'Erro ao enviar email de notificação de exclusão de conta',
        error.stack,
        'EmailService',
        {
          email,
          errorMessage: error.message,
        },
      );
      // Não lançamos o erro aqui para não impedir a exclusão da conta
      this.logger.warn(
        'Falha ao enviar email de notificação, mas a conta foi excluída',
        'EmailService',
        {
          email,
        },
      );
    }
  }

  /**
   * Enviar email de notificação de alteração de email
   */
  async sendEmailChangeNotification(
    oldEmail: string,
    newEmail: string,
    userName: string,
  ): Promise<void> {
    const { emailFrom } = validateEmailEnvVars();
    const sanitizedUserName = sanitizeUserName(userName);
    const currentDate = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      // Enviar para o email antigo
      const { data: oldEmailData, error: oldEmailError } =
        await this.resend.emails.send({
          from: emailFrom,
          to: oldEmail,
          subject: 'Email alterado - AutoLogger',
          html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Email alterado</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8b5cf6;">Email da Conta Alterado</h1>
            
            <p>Olá ${sanitizedUserName},</p>
            
            <p>Este é um aviso de segurança informando que o email da sua conta AutoLogger foi alterado.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email anterior:</strong> ${oldEmail}</p>
              <p style="margin: 5px 0 0 0;"><strong>Novo email:</strong> ${newEmail}</p>
              <p style="margin: 5px 0 0 0;"><strong>Data e hora:</strong> ${currentDate}</p>
            </div>
            
            <p>Se você não realizou esta alteração, entre em contato conosco imediatamente através do nosso suporte.</p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              A partir de agora, você receberá todas as notificações no novo email cadastrado.
            </p>
          </div>
        </body>
        </html>
      `,
        });

      if (oldEmailError) {
        this.logger.warn(
          'Erro ao enviar notificação para email antigo',
          'EmailService',
          {
            oldEmail,
            errorMessage: oldEmailError.message,
          },
        );
      } else {
        this.logger.log(
          'Email de notificação enviado para email antigo',
          'EmailService',
          {
            oldEmail,
            messageId: oldEmailData?.id,
          },
        );
      }

      // Enviar para o novo email
      const { data: newEmailData, error: newEmailError } =
        await this.resend.emails.send({
          from: emailFrom,
          to: newEmail,
          subject: 'Bem-vindo ao seu novo email - AutoLogger',
          html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Email alterado</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8b5cf6;">Email da Conta Atualizado</h1>
            
            <p>Olá ${sanitizedUserName},</p>
            
            <p>Confirmamos que o email da sua conta AutoLogger foi alterado com sucesso.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Novo email:</strong> ${newEmail}</p>
              <p style="margin: 5px 0 0 0;"><strong>Data e hora:</strong> ${currentDate}</p>
            </div>
            
            <p>A partir de agora, você receberá todas as notificações e comunicações importantes neste email.</p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              Se você não realizou esta alteração, entre em contato conosco imediatamente através do nosso suporte.
            </p>
          </div>
        </body>
        </html>
      `,
        });

      if (newEmailError) {
        throw newEmailError;
      }

      this.logger.log(
        'Email de notificação enviado para novo email',
        'EmailService',
        {
          newEmail,
          messageId: newEmailData?.id,
        },
      );
    } catch (error) {
      this.logger.error(
        'Erro ao enviar email de notificação de alteração de email',
        error.stack,
        'EmailService',
        {
          oldEmail,
          newEmail,
          errorMessage: error.message,
        },
      );
      throw error;
    }
  }
}
