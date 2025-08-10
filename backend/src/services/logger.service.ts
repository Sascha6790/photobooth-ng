import { Injectable, LoggerService as NestLoggerService, OnModuleInit } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import { ConfigurationService } from '../config/configuration.service';

@Injectable()
export class LoggerService implements NestLoggerService, OnModuleInit {
  private logger: winston.Logger;
  private context: string = 'Application';
  
  constructor(private readonly configService: ConfigurationService) {
    // Initialize logger immediately to avoid null reference errors
    this.initializeBasicLogger();
  }
  
  async onModuleInit() {
    // Re-initialize with full configuration after module init
    this.initializeLogger();
  }
  
  private initializeBasicLogger() {
    // Create a basic logger for use before full initialization
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });
  }
  
  private initializeLogger() {
    const config = this.configService.get();
    if (!config || !config.app) {
      // Config not ready yet, keep basic logger
      return;
    }
    const logDir = path.join(process.cwd(), 'logs');
    
    // Custom format for logs
    const customFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}] [${context || this.context}] ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        
        // Add stack trace if present
        if (trace) {
          log += `\n${trace}`;
        }
        
        return log;
      })
    );
    
    // Console transport configuration
    const consoleTransport = new winston.transports.Console({
      level: config.app.logLevel,
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        customFormat
      ),
    });
    
    // File transport configuration (daily rotate)
    const fileTransport = new DailyRotateFile({
      dirname: logDir,
      filename: 'photobooth-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: config.app.logLevel,
      format: customFormat,
    } as DailyRotateFile.DailyRotateFileTransportOptions);
    
    // Error file transport (only errors)
    const errorTransport = new DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: customFormat,
    } as DailyRotateFile.DailyRotateFileTransportOptions);
    
    // Create logger instance
    this.logger = winston.createLogger({
      level: config.app.logLevel,
      transports: [
        consoleTransport,
        fileTransport,
        errorTransport,
      ],
      exitOnError: false,
    });
    
    // Add debug transport in development
    if (config.app.debug) {
      const debugTransport = new winston.transports.File({
        filename: path.join(logDir, 'debug.log'),
        level: 'debug',
        format: customFormat,
      });
      this.logger.add(debugTransport);
    }
  }
  
  /**
   * Set the context for logging
   */
  setContext(context: string): void {
    this.context = context;
  }
  
  /**
   * Create a child logger with specific context
   */
  createChild(context: string): LoggerService {
    const childLogger = Object.create(this);
    childLogger.context = context;
    return childLogger;
  }
  
  /**
   * Log a message with info level
   */
  log(message: any, context?: string): void {
    this.logger.info(message, { context: context || this.context });
  }
  
  /**
   * Log an error message
   */
  error(message: any, trace?: string, context?: string): void {
    this.logger.error(message, { 
      context: context || this.context,
      trace,
    });
  }
  
  /**
   * Log a warning message
   */
  warn(message: any, context?: string): void {
    this.logger.warn(message, { context: context || this.context });
  }
  
  /**
   * Log a debug message
   */
  debug(message: any, context?: string): void {
    this.logger.debug(message, { context: context || this.context });
  }
  
  /**
   * Log a verbose message
   */
  verbose(message: any, context?: string): void {
    this.logger.verbose(message, { context: context || this.context });
  }
  
  /**
   * Log with custom level
   */
  logWithLevel(level: string, message: any, context?: string): void {
    this.logger.log(level, message, { context: context || this.context });
  }
  
  /**
   * Log HTTP request
   */
  logHttpRequest(req: any, res: any, duration: number): void {
    const { method, url, ip, headers } = req;
    const { statusCode } = res;
    
    const message = `${method} ${url} ${statusCode} ${duration}ms`;
    const metadata = {
      context: 'HTTP',
      ip,
      userAgent: headers['user-agent'],
      duration,
      statusCode,
    };
    
    if (statusCode >= 500) {
      this.logger.error(message, metadata);
    } else if (statusCode >= 400) {
      this.logger.warn(message, metadata);
    } else {
      this.logger.info(message, metadata);
    }
  }
  
  /**
   * Log database query
   */
  logQuery(query: string, params?: any[], duration?: number): void {
    this.logger.debug('Database Query', {
      context: 'Database',
      query,
      params,
      duration,
    });
  }
  
  /**
   * Log performance metric
   */
  logPerformance(operation: string, duration: number, metadata?: any): void {
    const message = `Performance: ${operation} took ${duration}ms`;
    
    if (duration > 1000) {
      this.logger.warn(message, {
        context: 'Performance',
        operation,
        duration,
        ...metadata,
      });
    } else {
      this.logger.debug(message, {
        context: 'Performance',
        operation,
        duration,
        ...metadata,
      });
    }
  }
  
  /**
   * Log system event
   */
  logEvent(event: string, data?: any): void {
    this.logger.info(`Event: ${event}`, {
      context: 'Event',
      event,
      data,
    });
  }
  
  /**
   * Log security event
   */
  logSecurity(event: string, data?: any): void {
    this.logger.warn(`Security: ${event}`, {
      context: 'Security',
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * Create a timer for performance logging
   */
  startTimer(operation: string): () => void {
    const start = Date.now();
    
    return (metadata?: any) => {
      const duration = Date.now() - start;
      this.logPerformance(operation, duration, metadata);
    };
  }
  
  /**
   * Flush logs (useful for graceful shutdown)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.end(() => resolve());
    });
  }
  
  /**
   * Get recent logs
   */
  async getRecentLogs(options?: {
    level?: string;
    limit?: number;
    from?: Date;
    to?: Date;
  }): Promise<any[]> {
    // This would require implementing a custom transport or query mechanism
    // For now, return empty array as placeholder
    return [];
  }
  
  /**
   * Clear old log files
   */
  async clearOldLogs(daysToKeep: number = 30): Promise<void> {
    const logDir = path.join(process.cwd(), 'logs');
    const { FileService } = await import('./file.service');
    const fileService = new FileService();
    
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    await fileService.cleanOldFiles(logDir, maxAge);
  }
}