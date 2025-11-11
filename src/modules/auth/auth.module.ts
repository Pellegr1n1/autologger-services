import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleAuthController } from './controllers/google-auth.controller';
import { UserModule } from '../user/user.module';
import { EmailVerificationModule } from '../email-verification/email-verification.module';
import { PasswordResetModule } from '../password-reset/password-reset.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    UserModule,
    EmailVerificationModule,
    PasswordResetModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isDevelopment = configService.get<string>('NODE_ENV') !== 'production';
        const jwtSecret = configService.get<string>('JWT_SECRET', isDevelopment ? 'your-secret-key' : undefined);
        
        if (!jwtSecret) {
          throw new Error('JWT_SECRET não está configurada. Configure esta variável de ambiente antes de iniciar a aplicação.');
        }
        
        // Avisar se estiver usando valor padrão em desenvolvimento
        if (isDevelopment && jwtSecret === 'your-secret-key') {
          console.warn('⚠️  AVISO: Usando JWT_SECRET padrão. Configure JWT_SECRET em produção!');
        }
        
        return {
          secret: jwtSecret,
          signOptions: { 
            expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h') 
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, GoogleAuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
})
export class AuthModule {}