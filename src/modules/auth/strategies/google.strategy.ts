import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly isConfigured: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const isDevelopment =
      configService.get<string>('NODE_ENV') !== 'production';

    const isConfigured = !!(clientID && clientSecret);

    // Em produção, exigir credenciais válidas
    if (!isDevelopment && !isConfigured) {
      throw new Error(
        'GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem ser configurados em produção',
      );
    }

    // Em desenvolvimento, permitir valores dummy apenas para inicialização
    // O controller valida antes de usar a estratégia
    super({
      clientID: clientID || 'dummy-client-id-for-dev',
      clientSecret: clientSecret || 'dummy-client-secret-for-dev',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });

    // Atribuir após super() devido a restrições do TypeScript
    this.isConfigured = isConfigured;
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    // Validar que as credenciais estão configuradas antes de processar
    // (o controller também valida, mas esta é uma camada extra de segurança)
    if (!this.isConfigured) {
      return done(
        new Error(
          'Google OAuth não está configurado. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.',
        ),
        null,
      );
    }

    const { id, name, emails, photos } = profile;
    const user = {
      googleId: id,
      email: emails[0].value,
      name: name.givenName + ' ' + name.familyName,
      avatar: photos[0].value,
      authProvider: 'google',
    };

    const validatedUser = await this.authService.validateGoogleUser(user);
    done(null, validatedUser);
  }
}
