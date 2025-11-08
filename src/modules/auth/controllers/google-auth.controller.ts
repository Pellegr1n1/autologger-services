import { Controller, Get, Post, Req, Res, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { Public } from '../../../common/decorators/public.decorator';
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
      
      // Configurar cookie httpOnly
      const isProduction = process.env.NODE_ENV === 'production';
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      
      res.cookie('autologger_token', result.access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge,
        path: '/',
      });
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?user=${encodeURIComponent(JSON.stringify(result.user))}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message)}`;
      res.redirect(redirectUrl);
    }
  }

  @Public()
  @Post('authenticate')
  async authenticateWithGoogle(@Body() body: { credential?: string; code?: string }, @Res() res: Response): Promise<void> {
    const { credential, code } = body;
    
    let result: AuthResponseDto;
    
    if (code) {
      result = await this.handleOAuth2Code(code);
    } else if (credential) {
      try {
        const parts = credential.split('.');
        if (parts.length !== 3) {
          throw new BadRequestException('Invalid JWT format');
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        
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

        const validatedUser = await this.authService.validateGoogleUser(googleUser);
        result = await this.authService.googleLogin(validatedUser);
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Invalid Google credential: ' + error.message);
      }
    } else {
      throw new BadRequestException('Credential or code is required');
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    res.cookie('autologger_token', result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
    
    res.json({
      user: result.user,
    });
  }

  private async handleOAuth2Code(code: string): Promise<AuthResponseDto> {
    try {
      const tokenResponse = await this.exchangeCodeForToken(code);
      
      const userInfo = await this.getUserInfo(tokenResponse.access_token);
      
      const googleUser = {
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name || userInfo.given_name + ' ' + userInfo.family_name || 'Google User',
        avatar: userInfo.picture,
        authProvider: 'google' as const,
      };

      const validatedUser = await this.authService.validateGoogleUser(googleUser);
      const result = await this.authService.googleLogin(validatedUser);
      
      return result;
    } catch (error) {
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
