import * as nodemailer from 'nodemailer';

/**
 * Helper para testes do EmailService
 * Elimina duplicação nos testes de envio de emails
 */
export class EmailServiceTestHelper {
  /**
   * Configura o ambiente para testes de email
   */
  static setupEnvironment(): void {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.SMTP_FROM = 'noreply@autologger.com';
  }

  /**
   * Cria um mock do transportador nodemailer
   */
  static createMockTransporter(): jest.Mocked<nodemailer.Transporter> {
    const mockSendMail = jest.fn().mockResolvedValue({
      messageId: 'mock-message-id',
    });

    return {
      sendMail: mockSendMail,
    } as any;
  }

  /**
   * Verifica se um email foi enviado corretamente
   */
  static expectEmailSent(
    mockTransporter: jest.Mocked<nodemailer.Transporter>,
    expectedTo: string,
    expectedSubject: string,
    shouldContain: string[],
  ): void {
    expect(mockTransporter.sendMail).toHaveBeenCalled();
    const callArgs = mockTransporter.sendMail.mock.calls[0][0];
    expect(callArgs.to).toBe(expectedTo);
    expect(callArgs.subject).toBe(expectedSubject);

    shouldContain.forEach((content) => {
      expect(callArgs.html).toContain(content);
    });
  }

  /**
   * Testa tratamento de erros de envio de email
   */
  static async expectEmailError(
    mockTransporter: jest.Mocked<nodemailer.Transporter>,
    sendFunction: () => Promise<any>,
    errorMessage: string = 'SMTP Error',
  ): Promise<void> {
    const error = new Error(errorMessage);
    mockTransporter.sendMail.mockRejectedValue(error);

    await expect(sendFunction()).rejects.toThrow(errorMessage);
  }
}
