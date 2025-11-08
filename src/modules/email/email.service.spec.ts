import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let mockTransporter: jest.Mocked<nodemailer.Transporter>;

  beforeEach(async () => {
    const mockSendMail = jest.fn().mockResolvedValue({
      messageId: 'mock-message-id',
    });

    mockTransporter = {
      sendMail: mockSendMail,
    } as any;

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      process.env.FRONTEND_URL = 'http://localhost:3000';
      process.env.SMTP_FROM = 'noreply@autologger.com';

      await service.sendVerificationEmail(
        'test@example.com',
        'token-123',
        'Test User',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('test@example.com');
      expect(callArgs.subject).toBe('Verifique seu email - AutoLogger');
      expect(callArgs.html).toContain('token-123');
      expect(callArgs.html).toContain('Test User');
    });

    it('should handle email sending errors', async () => {
      const error = new Error('SMTP Error');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        service.sendVerificationEmail(
          'test@example.com',
          'token-123',
          'Test User',
        ),
      ).rejects.toThrow('SMTP Error');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      process.env.FRONTEND_URL = 'http://localhost:3000';
      process.env.SMTP_FROM = 'noreply@autologger.com';

      await service.sendPasswordResetEmail(
        'test@example.com',
        'token-123',
        'Test User',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('test@example.com');
      expect(callArgs.subject).toBe('Redefinição de senha - AutoLogger');
      expect(callArgs.html).toContain('token-123');
      expect(callArgs.html).toContain('Test User');
    });

    it('should handle email sending errors', async () => {
      const error = new Error('SMTP Error');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        service.sendPasswordResetEmail(
          'test@example.com',
          'token-123',
          'Test User',
        ),
      ).rejects.toThrow('SMTP Error');
    });
  });
});

