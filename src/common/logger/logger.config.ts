import * as winston from 'winston';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LokiTransport = require('winston-loki');

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Converte um valor para string de forma segura, evitando '[object Object]'
 */
function safeStringify(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Obtém o contexto do log ou retorna o padrão
 */
function getContext(context: unknown): string {
  return typeof context === 'string' ? context : 'Application';
}

const customFormat = printf(
  ({ level, message, timestamp, context, trace, ...metadata }) => {
    const contextStr = getContext(context);
    const timestampStr = safeStringify(timestamp);
    const messageStr = safeStringify(message);
    let log = `${timestampStr} [${contextStr}] ${level}: ${messageStr}`;

    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    if (trace) {
      const traceStr = safeStringify(trace);
      log += `\n${traceStr}`;
    }

    return log;
  },
);

const jsonFormat = winston.format.json();

export const createWinstonLogger = () => {
  const transports: winston.transport[] = [];

  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        customFormat,
      ),
    }),
  );

  if (process.env.LOG_TO_FILE === 'true') {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: combine(timestamp(), errors({ stack: true }), jsonFormat),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: combine(timestamp(), errors({ stack: true }), jsonFormat),
      }),
    );
  }

  if (process.env.LOKI_HOST && process.env.LOKI_ENABLED === 'true') {
    let lokiErrorLogged = false;
    const lokiHost = process.env.LOKI_HOST || 'http://localhost:3100';

    try {
      transports.push(
        new LokiTransport({
          host: lokiHost,
          labels: {
            app: 'autologger-service',
            environment: process.env.NODE_ENV || 'development',
          },
          json: true,
          format: combine(timestamp(), errors({ stack: true }), jsonFormat),
          replaceTimestamp: true,
          onConnectionError: (err: Error) => {
            if (!lokiErrorLogged) {
              console.warn(
                `⚠️  Loki não está disponível em ${lokiHost}. Logs continuarão sendo enviados apenas para console/arquivo.`,
              );
              lokiErrorLogged = true;
            }
          },
        }),
      );
    } catch (error) {
      console.warn(
        `⚠️  Não foi possível configurar Loki. Logs continuarão sendo enviados apenas para console/arquivo.`,
      );
    }
  }

  const defaultLogLevel = 'info';
  const logLevel = process.env.LOG_LEVEL || defaultLogLevel;

  return winston.createLogger({
    level: logLevel,
    transports,
    exitOnError: false,
  });
};
