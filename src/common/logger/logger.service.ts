import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { Logger } from 'winston';
import { createWinstonLogger } from './logger.config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: Logger;
  private context?: string;

  constructor() {
    this.logger = createWinstonLogger();
  }

  /**
   * Define o contexto do logger (nome do módulo/classe)
   */
  setContext(context: string) {
    this.context = context;
  }

  /**
   * Log de nível info
   */
  log(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.info(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  /**
   * Log de erro
   */
  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: Record<string, any>,
  ) {
    this.logger.error(message, {
      context: context || this.context,
      trace,
      ...metadata,
    });
  }

  /**
   * Log de warning
   */
  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.warn(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  /**
   * Log de debug
   */
  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.debug(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  /**
   * Log de nível verbose
   */
  verbose(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.verbose(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  /**
   * Log de requisição HTTP
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string,
  ) {
    this.logger.info('HTTP Request', {
      context: 'HTTP',
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      userId,
    });
  }

  /**
   * Log de transação blockchain
   */
  logBlockchainTransaction(
    action: string,
    txHash?: string,
    status?: string,
    metadata?: Record<string, any>,
  ) {
    this.logger.info('Blockchain Transaction', {
      context: 'Blockchain',
      action,
      txHash,
      status,
      ...metadata,
    });
  }

  /**
   * Log de operação de banco de dados
   */
  logDatabaseOperation(
    operation: string,
    entity: string,
    duration?: number,
    metadata?: Record<string, any>,
  ) {
    this.logger.debug('Database Operation', {
      context: 'Database',
      operation,
      entity,
      duration: duration ? `${duration}ms` : undefined,
      ...metadata,
    });
  }
}
