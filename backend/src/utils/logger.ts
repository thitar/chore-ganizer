import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Create format with correlation ID
const correlationFormat = winston.format((info) => {
  info.correlationId = info.correlationId || uuidv4();
  info.timestamp = new Date().toISOString();
  return info;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    correlationFormat(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'chore-ganizer-backend',
    version: process.env.APP_VERSION || '1.5.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
          const correlationIdStr = correlationId ? String(correlationId).slice(0, 8) : 'unknown';
          const metaStr = Object.keys(meta).length > 1 ? JSON.stringify(meta) : '';
          return `${timestamp} [${correlationIdStr}] ${level}: ${message} ${metaStr}`;
        })
      )
    })
  ]
});
