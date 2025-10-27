import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { EmailVerificationService } from '../modules/email-verification/email-verification.service';
import { PasswordResetService } from '../modules/password-reset/password-reset.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() authRegisterDto: AuthRegisterDto): Promise<AuthResponseDto> {
    return await this.authService.register(authRegisterDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() authLoginDto: AuthLoginDto): Promise<AuthResponseDto> {
    return await this.authService.login(authLoginDto);
  }

  /**
   * Enviar email de verificação
   */
  @UseGuards(JwtAuthGuard)
  @Post('send-verification-email')
  async sendVerificationEmail(@Req() request): Promise<{ message: string }> {
    const userId = request.user?.id;
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    
    await this.emailVerificationService.sendVerificationEmail(userId);
    return { message: 'Email de verificação enviado com sucesso' };
  }

  /**
   * Verificar email com token
   */
  @Public()
  @Post('verify-email/:token')
  async verifyEmail(@Param('token') token: string): Promise<{ message: string }> {
    await this.emailVerificationService.verifyEmail(token);
    return { message: 'Email verificado com sucesso' };
  }

  /**
   * Reenviar email de verificação
   */
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  async resendVerificationEmail(@Req() request): Promise<{ message: string }> {
    console.log('Request user:', request.user);
    const userId = request.user?.id;
    
    if (!userId) {
      console.error('Usuário não autenticado. request.user:', request.user);
      throw new Error('Usuário não autenticado');
    }
    
    try {
      await this.emailVerificationService.resendVerificationEmail(userId);
      return { message: 'Email de verificação reenviado com sucesso' };
    } catch (error) {
      console.error('Erro ao reenviar email de verificação:', error);
      throw error;
    }
  }

  /**
   * Verificar status de verificação
   */
  @UseGuards(JwtAuthGuard)
  @Get('verification-status')
  async checkVerificationStatus(@Req() request): Promise<{ isEmailVerified: boolean }> {
    const userId = request.user?.id;
    if (!userId) {
      return { isEmailVerified: false };
    }
    
    const isVerified = await this.emailVerificationService.checkVerificationStatus(userId);
    return { isEmailVerified: isVerified };
  }

  /**
   * Solicitar reset de senha
   */
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string): Promise<{ message: string }> {
    await this.passwordResetService.requestPasswordReset(email);
    return { message: 'Se o email estiver cadastrado, você receberá instruções' };
  }

  /**
   * Resetar senha com token
   */
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() data: { token: string; newPassword: string; confirmPassword: string }): Promise<{ message: string }> {
    await this.passwordResetService.resetPassword(data.token, data.newPassword, data.confirmPassword);
    return { message: 'Senha alterada com sucesso' };
  }
}