import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { LoggerService } from '../../common/logger/logger.service';
import { LoggerServiceTestHelper } from '../../common/test-helpers/logger-service.test-helper';
import { Resend } from 'resend';

jest.mock('resend');

describe('EmailService', () => {
  let service: EmailService;
  let mockResend: jest.Mocked<Resend>;
  let mockEmails: { send: jest.Mock };

  const testEmail = 'test@example.com';
  const testToken = 'token-123';
  const testUserName = 'Test User';

  beforeEach(async () => {
    // Configurar variáveis de ambiente para testes
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'noreply@autologger.online';
    process.env.FRONTEND_URL = 'http://localhost:3000';

    // Mock do Resend
    mockEmails = {
      send: jest
        .fn()
        .mockResolvedValue({ data: { id: 'mock-email-id' }, error: null }),
    };

    mockResend = {
      emails: mockEmails,
    } as any;

    (Resend as jest.MockedClass<typeof Resend>).mockImplementation(
      () => mockResend,
    );

    const mockLoggerService = LoggerServiceTestHelper.createMockLoggerService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.FRONTEND_URL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      await service.sendVerificationEmail(testEmail, testToken, testUserName);

      expect(mockEmails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@autologger.online',
          to: testEmail,
          subject: 'Verifique seu email - AutoLogger',
        }),
      );
      expect(mockEmails.send.mock.calls[0][0].html).toContain(testToken);
      expect(mockEmails.send.mock.calls[0][0].html).toContain(testUserName);
    });

    it('should handle email sending errors', async () => {
      const error = new Error('SMTP Error');
      mockEmails.send.mockRejectedValueOnce(error);

      await expect(
        service.sendVerificationEmail(testEmail, testToken, testUserName),
      ).rejects.toThrow();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      await service.sendPasswordResetEmail(testEmail, testToken, testUserName);

      expect(mockEmails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@autologger.online',
          to: testEmail,
          subject: 'Redefinição de senha - AutoLogger',
        }),
      );
      expect(mockEmails.send.mock.calls[0][0].html).toContain(testToken);
      expect(mockEmails.send.mock.calls[0][0].html).toContain(testUserName);
    });

    it('should handle email sending errors', async () => {
      const error = new Error('SMTP Error');
      mockEmails.send.mockRejectedValueOnce(error);

      await expect(
        service.sendPasswordResetEmail(testEmail, testToken, testUserName),
      ).rejects.toThrow();
    });

    it('should handle Resend API error response', async () => {
      const apiError = { message: 'Invalid API key' };
      mockEmails.send.mockResolvedValueOnce({ data: null, error: apiError });

      await expect(
        service.sendPasswordResetEmail(testEmail, testToken, testUserName),
      ).rejects.toEqual(apiError);
    });
  });

  describe('sendPasswordChangeNotification', () => {
    it('should send password change notification successfully', async () => {
      await service.sendPasswordChangeNotification(testEmail, testUserName);

      expect(mockEmails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@autologger.online',
          to: testEmail,
          subject: 'Senha alterada - AutoLogger',
        }),
      );
      expect(mockEmails.send.mock.calls[0][0].html).toContain(testUserName);
    });

    it('should handle email sending errors', async () => {
      const error = new Error('SMTP Error');
      mockEmails.send.mockRejectedValueOnce(error);

      await expect(
        service.sendPasswordChangeNotification(testEmail, testUserName),
      ).rejects.toThrow();
    });

    it('should handle Resend API error response', async () => {
      const apiError = { message: 'Invalid API key' };
      mockEmails.send.mockResolvedValueOnce({ data: null, error: apiError });

      await expect(
        service.sendPasswordChangeNotification(testEmail, testUserName),
      ).rejects.toEqual(apiError);
    });
  });

  describe('sendAccountDeletionNotification', () => {
    it('should send account deletion notification successfully', async () => {
      await service.sendAccountDeletionNotification(testEmail, testUserName);

      expect(mockEmails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@autologger.online',
          to: testEmail,
          subject: 'Conta excluída - AutoLogger',
        }),
      );
      expect(mockEmails.send.mock.calls[0][0].html).toContain(testUserName);
    });

    it('should not throw error when email sending fails', async () => {
      const error = new Error('SMTP Error');
      mockEmails.send.mockRejectedValueOnce(error);

      // Não deve lançar erro, apenas logar
      await expect(
        service.sendAccountDeletionNotification(testEmail, testUserName),
      ).resolves.not.toThrow();
    });

    it('should handle Resend API error response without throwing', async () => {
      const apiError = { message: 'Invalid API key' };
      mockEmails.send.mockResolvedValueOnce({ data: null, error: apiError });

      // Não deve lançar erro, apenas logar
      await expect(
        service.sendAccountDeletionNotification(testEmail, testUserName),
      ).resolves.not.toThrow();
    });
  });

  describe('sendEmailChangeNotification', () => {
    const oldEmail = 'old@example.com';
    const newEmail = 'new@example.com';

    it('should send email change notification successfully', async () => {
      await service.sendEmailChangeNotification(
        oldEmail,
        newEmail,
        testUserName,
      );

      expect(mockEmails.send).toHaveBeenCalledTimes(2);

      // Verificar email para endereço antigo
      expect(mockEmails.send.mock.calls[0][0]).toMatchObject({
        from: 'noreply@autologger.online',
        to: oldEmail,
        subject: 'Email alterado - AutoLogger',
      });
      expect(mockEmails.send.mock.calls[0][0].html).toContain(oldEmail);
      expect(mockEmails.send.mock.calls[0][0].html).toContain(newEmail);

      // Verificar email para novo endereço
      expect(mockEmails.send.mock.calls[1][0]).toMatchObject({
        from: 'noreply@autologger.online',
        to: newEmail,
        subject: 'Bem-vindo ao seu novo email - AutoLogger',
      });
      expect(mockEmails.send.mock.calls[1][0].html).toContain(newEmail);
    });

    it('should handle error when sending to old email but continue to new email', async () => {
      const oldEmailError = { message: 'Invalid email' };
      mockEmails.send
        .mockResolvedValueOnce({ data: null, error: oldEmailError })
        .mockResolvedValueOnce({ data: { id: 'mock-id' }, error: null });

      await service.sendEmailChangeNotification(
        oldEmail,
        newEmail,
        testUserName,
      );

      expect(mockEmails.send).toHaveBeenCalledTimes(2);
    });

    it('should throw error when sending to new email fails', async () => {
      const newEmailError = { message: 'Invalid email' };
      mockEmails.send
        .mockResolvedValueOnce({ data: { id: 'mock-id' }, error: null })
        .mockResolvedValueOnce({ data: null, error: newEmailError });

      await expect(
        service.sendEmailChangeNotification(oldEmail, newEmail, testUserName),
      ).rejects.toEqual(newEmailError);
    });

    it('should handle error when both emails fail', async () => {
      const error = new Error('SMTP Error');
      mockEmails.send.mockRejectedValueOnce(error);

      await expect(
        service.sendEmailChangeNotification(oldEmail, newEmail, testUserName),
      ).rejects.toThrow();
    });
  });

  describe('initializeResend', () => {
    it('should handle initialization error gracefully', async () => {
      // Simular erro na inicialização do Resend
      const originalMock = (Resend as jest.MockedClass<typeof Resend>).mock;
      (Resend as jest.MockedClass<typeof Resend>).mockImplementationOnce(() => {
        throw new Error('Failed to initialize');
      });

      await expect(
        Test.createTestingModule({
          providers: [
            EmailService,
            {
              provide: LoggerService,
              useValue: LoggerServiceTestHelper.createMockLoggerService(),
            },
          ],
        }).compile(),
      ).rejects.toThrow('Configuração de email inválida');

      // Restaurar mock
      (Resend as jest.MockedClass<typeof Resend>).mock = originalMock;
    });
  });
});
