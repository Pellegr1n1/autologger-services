import * as winston from 'winston';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LokiTransport = require('winston-loki');

const { combine, timestamp, printf, colorize, errors } = winston.format;

const customFormat = printf(
  ({ level, message, timestamp, context, trace, ...metadata }) => {
    const contextStr = typeof context === 'string' ? context : 'Application';
    const timestampStr =
      typeof timestamp === 'string'
        ? timestamp
        : typeof timestamp === 'object' && timestamp !== null
          ? JSON.stringify(timestamp)
          : String(timestamp);
    const messageStr =
      typeof message === 'string'
        ? message
        : typeof message === 'object' && message !== null
          ? JSON.stringify(message)
          : String(message);
    let log = `${timestampStr} [${contextStr}] ${level}: ${messageStr}`;

    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    if (trace) {
      const traceStr =
        typeof trace === 'string'
          ? trace
          : typeof trace === 'object' && trace !== null
            ? JSON.stringify(trace)
            : String(trace);
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
    transports.push(
      new LokiTransport({
        host: process.env.LOKI_HOST || 'http://localhost:3100',
        labels: {
          app: 'autologger-service',
          environment: process.env.NODE_ENV || 'development',
        },
        json: true,
        format: combine(timestamp(), errors({ stack: true }), jsonFormat),
        replaceTimestamp: true,
        onConnectionError: (err) => {
          console.error('Erro na conexão com Loki:', err);
        },
      }),
    );
  }

  const defaultLogLevel =
    process.env.NODE_ENV === 'production' ? 'warn' : 'info';
  const logLevel = process.env.LOG_LEVEL || defaultLogLevel;

  return winston.createLogger({
    level: logLevel,
    transports,
    exitOnError: false,
  });
};
