import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { BaseTokenRepository } from '../../common/repositories/base-token.repository';

@Injectable()
export class PasswordResetRepository extends BaseTokenRepository<PasswordResetToken> {
  constructor(
    @InjectRepository(PasswordResetToken)
    tokenRepository: Repository<PasswordResetToken>,
  ) {
    super(tokenRepository);
  }
}
