import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { BaseTokenRepository } from '../../common/repositories/base-token.repository';

@Injectable()
export class EmailVerificationRepository extends BaseTokenRepository<EmailVerificationToken> {
  constructor(
    @InjectRepository(EmailVerificationToken)
    tokenRepository: Repository<EmailVerificationToken>,
  ) {
    super(tokenRepository);
  }
}
