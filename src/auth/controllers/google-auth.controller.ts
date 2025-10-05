import { Controller, Get, Post, Req, Res, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get()
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {
    return { message: 'Redirecting to Google...' };
  }

  @Public()
  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as any;
      const result = await this.authService.googleLogin(user);
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${result.access_token}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
      
      console.log('Redirecting to frontend:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error in OAuth2 callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message)}`;
      res.redirect(redirectUrl);
    }
  }

  @Public()
  @Post('authenticate')
  async authenticateWithGoogle(@Body() body: { credential?: string; code?: string }): Promise<AuthResponseDto> {
    console.log('Google Auth Request:', { 
      credential: body.credential ? 'present' : 'missing', 
      code: body.code ? 'present' : 'missing',
      bodyKeys: Object.keys(body)
    });
    
    const { credential, code } = body;
    
    // Processar código OAuth2
    if (code) {
      return await this.handleOAuth2Code(code);
    }
    
    // Processar JWT token do Google (fallback)
    if (!credential) {
      console.error('No credential or code provided');
      throw new BadRequestException('Credential or code is required');
    }

    try {
      // Validar formato do JWT
      const parts = credential.split('.');
      if (parts.length !== 3) {
        throw new BadRequestException('Invalid JWT format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('Google payload:', payload);
      
      // Validar campos obrigatórios
      if (!payload.sub || !payload.email) {
        throw new BadRequestException('Invalid Google credential: missing required fields');
      }
      
      const googleUser = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.given_name + ' ' + payload.family_name || 'Google User',
        avatar: payload.picture,
        authProvider: 'google' as const,
      };

      console.log('Google user data:', googleUser);
      const validatedUser = await this.authService.validateGoogleUser(googleUser);
      console.log('Validated user:', validatedUser);
      
      const result = await this.authService.googleLogin(validatedUser);
      console.log('Google login result:', result);
      
      return result;
    } catch (error) {
      console.error('Error processing Google credential:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid Google credential: ' + error.message);
    }
  }

  private async handleOAuth2Code(code: string): Promise<AuthResponseDto> {
    try {
      console.log('Processing OAuth2 code:', code);
      
      // Trocar código por token de acesso
      const tokenResponse = await this.exchangeCodeForToken(code);
      console.log('Token response:', tokenResponse);
      
      // Obter informações do usuário
      const userInfo = await this.getUserInfo(tokenResponse.access_token);
      console.log('User info:', userInfo);
      
      const googleUser = {
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name || userInfo.given_name + ' ' + userInfo.family_name || 'Google User',
        avatar: userInfo.picture,
        authProvider: 'google' as const,
      };

      console.log('Google user data from OAuth2:', googleUser);
      const validatedUser = await this.authService.validateGoogleUser(googleUser);
      console.log('Validated user:', validatedUser);
      
      const result = await this.authService.googleLogin(validatedUser);
      console.log('Google login result:', result);
      
      return result;
    } catch (error) {
      console.error('Error processing OAuth2 code:', error);
      throw new BadRequestException('Invalid OAuth2 code: ' + error.message);
    }
  }

  private async exchangeCodeForToken(code: string): Promise<any> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.FRONTEND_URL}/auth/callback`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return await response.json();
  }

  private async getUserInfo(accessToken: string): Promise<any> {
    const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
    
    const response = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`User info fetch failed: ${error}`);
    }

    return await response.json();
  }
}
