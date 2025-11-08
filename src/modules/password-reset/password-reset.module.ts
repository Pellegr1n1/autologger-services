import { Module, forwardRef } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetRepository } from './password-reset.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailModule } from '../email/email.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordResetToken]),
    EmailModule,
    forwardRef(() => UserModule),
  ],
  providers: [PasswordResetService, PasswordResetRepository],
  exports: [PasswordResetService, PasswordResetRepository],
})
export class PasswordResetModule {}

