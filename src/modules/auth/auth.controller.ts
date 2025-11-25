import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Req,
  UseGuards,
  Res,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthLoginDto } from './dto/auth-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { LoggerService } from '../../common/logger/logger.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuthController');
  }

  private setTokenCookie(res: Response, token: string, req?: Request): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 24 * 60 * 60 * 1000;

    const envHttps =
      process.env.FRONTEND_URL?.startsWith('https://') ||
      process.env.CORS_ORIGINS?.includes('https://') ||
      false;

    const requestHttps =
      req?.protocol === 'https' ||
      req?.headers['x-forwarded-proto'] === 'https' ||
      false;

    const isHttps =
      requestHttps ||
      envHttps ||
      (isProduction && !process.env.FRONTEND_URL?.startsWith('http://'));

    const frontendUrl = process.env.FRONTEND_URL || '';
    let isCrossDomain = false;

    try {
      if (frontendUrl) {
        const frontendHost = new URL(frontendUrl).hostname;
        // Se frontend não contém 'api', provavelmente é cross-domain
        // (assumindo que backend está em api.autologger.online)
        isCrossDomain =
          !frontendHost.includes('api') &&
          (frontendHost.includes('autologger.online') ||
            frontendHost.includes('app.autologger.online'));
      }
    } catch {
      // Se não conseguir parsear, assumir cross-domain em produção com HTTPS
      isCrossDomain = isProduction && isHttps;
    }

    // Se não conseguir determinar, em produção assumir cross-domain se usar HTTPS
    const useSameSiteNone =
      isProduction && isHttps && (isCrossDomain || !frontendUrl);

    const cookieOptions: any = {
      httpOnly: true,
      secure: isHttps,
      sameSite: useSameSiteNone ? 'none' : 'lax',
      maxAge,
      path: '/',
    };

    if (!isProduction) {
      cookieOptions.domain = 'localhost';
    }

    // Log para debug (apenas em desenvolvimento)
    if (!isProduction) {
      this.logger.debug('Configurando cookie', 'AuthController', {
        isHttps,
        useSameSiteNone,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        requestProtocol: req?.protocol,
        forwardedProto: req?.headers['x-forwarded-proto'],
      });
    }

    res.cookie('autologger_token', token, cookieOptions);
  }

  @Public()
  @Post('register')
  async register(
    @Body() authRegisterDto: AuthRegisterDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    const result = await this.authService.register(authRegisterDto);
    this.setTokenCookie(res, result.access_token, req);
    // Token está no cookie httpOnly (não retornamos no body por segurança)
    res.json({
      user: result.user,
    });
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() authLoginDto: AuthLoginDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    const result = await this.authService.login(authLoginDto);
    this.setTokenCookie(res, result.access_token, req);
    res.json({
      user: result.user,
    });
  }

  /**
   * Enviar email de verificação
   */
  @UseGuards(JwtAuthGuard)
  @Post('send-verification-email')
  async sendVerificationEmail(@Req() request): Promise<{ message: string }> {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    await this.emailVerificationService.sendVerificationEmail(userId);
    return { message: 'Email de verificação enviado com sucesso' };
  }

  /**
   * Verificar email com token
   */
  @Public()
  @Post('verify-email/:token')
  async verifyEmail(
    @Param('token') token: string,
  ): Promise<{ message: string }> {
    await this.emailVerificationService.verifyEmail(token);
    return { message: 'Email verificado com sucesso' };
  }

  /**
   * Reenviar email de verificação
   */
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  async resendVerificationEmail(@Req() request): Promise<{ message: string }> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    await this.emailVerificationService.resendVerificationEmail(userId);
    return { message: 'Email de verificação reenviado com sucesso' };
  }

  /**
   * Verificar status de verificação
   */
  @UseGuards(JwtAuthGuard)
  @Get('verification-status')
  async checkVerificationStatus(
    @Req() request,
  ): Promise<{ isEmailVerified: boolean }> {
    const userId = request.user?.id;
    if (!userId) {
      return { isEmailVerified: false };
    }

    const isVerified =
      await this.emailVerificationService.checkVerificationStatus(userId);
    return { isEmailVerified: isVerified };
  }

  /**
   * Solicitar reset de senha
   */
  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    await this.passwordResetService.requestPasswordReset(email);
    return {
      message: 'Se o email estiver cadastrado, você receberá instruções',
    };
  }

  /**
   * Validar token de reset de senha
   */
  @Public()
  @Get('validate-reset-token/:token')
  async validateResetToken(
    @Param('token') token: string,
  ): Promise<{ valid: boolean }> {
    const isValid = await this.passwordResetService.validateResetToken(token);
    return { valid: isValid };
  }

  /**
   * Resetar senha com token
   */
  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body()
    data: {
      token: string;
      newPassword: string;
      confirmPassword: string;
    },
  ): Promise<{ message: string }> {
    await this.passwordResetService.resetPassword(
      data.token,
      data.newPassword,
      data.confirmPassword,
    );
    return { message: 'Senha alterada com sucesso' };
  }

  /**
   * Alterar senha do usuário autenticado
   */
  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(
    @CurrentUser() user: UserResponseDto,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return await this.authService.changePassword(user.id, changePasswordDto);
  }

  /**
   * Logout - limpa o cookie
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res() res: Response): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';

    // Verificar se está usando HTTPS
    const isHttps =
      process.env.FRONTEND_URL?.startsWith('https://') ||
      process.env.CORS_ORIGINS?.includes('https://') ||
      false;

    const cookieOptions: any = {
      httpOnly: true,
      secure: isHttps,
      // IMPORTANTE: sameSite: 'none' REQUER secure: true
      sameSite: isProduction && isHttps ? 'none' : 'lax',
      path: '/',
    };

    if (!isProduction) {
      cookieOptions.domain = 'localhost';
    }

    res.clearCookie('autologger_token', cookieOptions);
    res.json({ message: 'Logout realizado com sucesso' });
  }
}
