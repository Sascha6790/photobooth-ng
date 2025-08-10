import * as winston from 'winston';
const DailyRotateFile = require('winston-daily-rotate-file');
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'context', 'trace'],
  }),
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.ms(),
  nestWinstonModuleUtilities.format.nestLike('Photobooth', {
    prettyPrint: true,
    colors: true,
  }),
);

// Daily rotate transport for application logs
const appRotateTransport = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: structuredFormat,
  level: isDevelopment ? 'debug' : 'info',
});

// Daily rotate transport for error logs
const errorRotateTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: structuredFormat,
  level: 'error',
});

// Daily rotate transport for performance logs
const performanceRotateTransport = new DailyRotateFile({
  filename: 'logs/performance-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '7d',
  format: structuredFormat,
  level: 'info',
});

export const winstonConfig: winston.LoggerOptions = {
  level: isDevelopment ? 'debug' : 'info',
  format: structuredFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: isDevelopment ? consoleFormat : structuredFormat,
    }),
    // File transports
    appRotateTransport,
    errorRotateTransport,
    performanceRotateTransport,
  ],
  // Exception handling
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/exceptions.log',
      format: structuredFormat,
    }),
  ],
  // Rejection handling
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/rejections.log',
      format: structuredFormat,
    }),
  ],
  exitOnError: false,
};

// Custom logger categories
export const loggerCategories = {
  APP: 'Application',
  API: 'API',
  DATABASE: 'Database',
  WEBSOCKET: 'WebSocket',
  HARDWARE: 'Hardware',
  PERFORMANCE: 'Performance',
  SECURITY: 'Security',
  BUSINESS: 'Business',
} as const;

export type LoggerCategory = typeof loggerCategories[keyof typeof loggerCategories];