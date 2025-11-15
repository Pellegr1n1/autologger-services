import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';
import { EmailServiceTestHelper } from '../../common/test-helpers/email-service.test-helper';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let mockTransporter: jest.Mocked<nodemailer.Transporter>;

  const testEmail = 'test@example.com';
  const testToken = 'token-123';
  const testUserName = 'Test User';

  beforeEach(async () => {
    mockTransporter = EmailServiceTestHelper.createMockTransporter();
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
    EmailServiceTestHelper.setupEnvironment();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      await service.sendVerificationEmail(testEmail, testToken, testUserName);

      EmailServiceTestHelper.expectEmailSent(
        mockTransporter,
        testEmail,
        'Verifique seu email - AutoLogger',
        [testToken, testUserName]
      );
    });

    it('should handle email sending errors', async () => {
      await EmailServiceTestHelper.expectEmailError(
        mockTransporter,
        () => service.sendVerificationEmail(testEmail, testToken, testUserName)
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      await service.sendPasswordResetEmail(testEmail, testToken, testUserName);

      EmailServiceTestHelper.expectEmailSent(
        mockTransporter,
        testEmail,
        'Redefinição de senha - AutoLogger',
        [testToken, testUserName]
      );
    });

    it('should handle email sending errors', async () => {
      await EmailServiceTestHelper.expectEmailError(
        mockTransporter,
        () => service.sendPasswordResetEmail(testEmail, testToken, testUserName)
      );
    });
  });
});

