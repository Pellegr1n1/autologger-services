import { LoggerService } from '../logger/logger.service';

/**
 * Helper para criar mocks do LoggerService em testes
 * Elimina duplicação nos testes que precisam do LoggerService
 */
export class LoggerServiceTestHelper {
  /**
   * Cria um mock completo do LoggerService
   */
  static createMockLoggerService(): jest.Mocked<LoggerService> {
    return {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      logRequest: jest.fn(),
      logBlockchainTransaction: jest.fn(),
      logDatabaseOperation: jest.fn(),
    } as any;
  }
}
