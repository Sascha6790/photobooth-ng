import { Injectable, Inject, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { LoggerCategory } from './winston.config';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;
  private category?: LoggerCategory;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  setContext(context: string) {
    this.context = context;
  }

  setCategory(category: LoggerCategory) {
    this.category = category;
  }

  log(message: any, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.log('info', message, { context: context || this.context, category: this.category });
    } else {
      this.logger.log('info', message, { 
        context: this.context, 
        category: this.category,
        ...context 
      });
    }
  }

  error(message: any, trace?: string, context?: string | LogContext): void {
    const errorContext = typeof context === 'string' 
      ? { context: context || this.context }
      : { context: this.context, ...context };
    
    this.logger.log('error', message, { 
      ...errorContext,
      category: this.category,
      trace,
      stack: trace,
    });
  }

  warn(message: any, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.log('warn', message, { context: context || this.context, category: this.category });
    } else {
      this.logger.log('warn', message, { 
        context: this.context, 
        category: this.category,
        ...context 
      });
    }
  }

  debug?(message: any, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.log('debug', message, { context: context || this.context, category: this.category });
    } else {
      this.logger.log('debug', message, { 
        context: this.context, 
        category: this.category,
        ...context 
      });
    }
  }

  verbose?(message: any, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.log('verbose', message, { context: context || this.context, category: this.category });
    } else {
      this.logger.log('verbose', message, { 
        context: this.context, 
        category: this.category,
        ...context 
      });
    }
  }

  // Performance logging
  logPerformance(operation: string, duration: number, metadata?: any): void {
    this.logger.log('info', `Performance: ${operation}`, {
      context: this.context,
      category: 'Performance',
      operation,
      duration,
      ...metadata,
    });
  }

  // Business event logging
  logBusinessEvent(event: string, metadata?: any): void {
    this.logger.log('info', `Business Event: ${event}`, {
      context: this.context,
      category: 'Business',
      event,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  // Security event logging
  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: any): void {
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.logger.log(logLevel, `Security Event: ${event}`, {
      context: this.context,
      category: 'Security',
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  // Audit logging
  logAudit(action: string, userId: string, resource: string, metadata?: any): void {
    this.logger.log('info', `Audit: ${action}`, {
      context: this.context,
      category: 'Audit',
      action,
      userId,
      resource,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
}