import { Module, forwardRef } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationRepository } from './email-verification.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { EmailModule } from '../email/email.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerificationToken]),
    EmailModule,
    forwardRef(() => UserModule),
  ],
  providers: [EmailVerificationService, EmailVerificationRepository],
  exports: [EmailVerificationService, EmailVerificationRepository],
})
export class EmailVerificationModule {}
