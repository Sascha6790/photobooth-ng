import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';
import { SentryService } from '../sentry/sentry.service';
import { Request } from 'express';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: LoggerService,
    private readonly sentryService: SentryService,
  ) {
    this.logger.setContext('ErrorLoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const request = context.switchToHttp().getRequest<Request>();
        const { method, url, body, headers, ip } = request;
        const userAgent = headers['user-agent'] || 'unknown';
        const correlationId = headers['x-correlation-id'] as string || 'unknown';

        // Determine error type and status
        const isHttpException = error instanceof HttpException;
        const status = isHttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
        const message = isHttpException
          ? error.getResponse()
          : error.message || 'Internal server error';

        // Create error context
        const errorContext = {
          correlationId,
          method,
          url,
          statusCode: status,
          ip,
          userAgent,
          body: this.sanitizeBody(body),
          headers: this.sanitizeHeaders(headers),
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        };

        // Log based on error severity
        if (status >= 500) {
          // Server errors - log as error and send to Sentry
          this.logger.error(
            `Server error: ${error.message}`,
            error.stack,
            errorContext,
          );

          // Send to Sentry with additional context
          this.sentryService.withScope((scope) => {
            scope.setTag('error.type', 'server_error');
            scope.setLevel('error');
            scope.setContext('request', {
              method,
              url,
              correlationId,
            });
            
            if (request['user']) {
              const user = request['user'] as any;
              scope.setUser({
                id: user.id,
                username: user.username,
              });
            }

            this.sentryService.captureException(error, errorContext);
          });
        } else if (status >= 400) {
          // Client errors - log as warning
          this.logger.warn(`Client error: ${error.message}`, errorContext);

          // Only send specific client errors to Sentry
          if (this.shouldReportClientError(status, error)) {
            this.sentryService.addBreadcrumb({
              category: 'client_error',
              message: error.message,
              level: 'warning',
              data: errorContext,
            });
          }
        }

        // Track specific error patterns
        this.trackErrorPatterns(error, errorContext);

        // Re-throw the error to maintain normal error flow
        return throwError(() => error);
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'authorization',
      'creditCard',
      'ssn',
    ];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;
    
    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private shouldReportClientError(status: number, error: any): boolean {
    // Report specific client errors that might indicate issues
    const reportableStatuses = [
      HttpStatus.UNAUTHORIZED, // Authentication issues
      HttpStatus.FORBIDDEN, // Authorization issues
      HttpStatus.NOT_FOUND, // Only if it's a valid route
      HttpStatus.CONFLICT, // Data conflicts
      HttpStatus.UNPROCESSABLE_ENTITY, // Validation errors (in bulk)
    ];

    return reportableStatuses.includes(status);
  }

  private trackErrorPatterns(error: any, context: any): void {
    // Track database connection errors
    if (error.message?.includes('database') || error.message?.includes('connection')) {
      this.logger.error('Database connection error detected', error.stack, {
        ...context,
        pattern: 'database_connection',
      });
      
      this.sentryService.captureMessage(
        'Database connection issue',
        'error',
        context,
      );
    }

    // Track timeout errors
    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      this.logger.error('Timeout error detected', error.stack, {
        ...context,
        pattern: 'timeout',
      });
    }

    // Track memory errors
    if (error.message?.includes('heap') || error.message?.includes('memory')) {
      this.logger.error('Memory error detected', error.stack, {
        ...context,
        pattern: 'memory',
      });
      
      this.sentryService.captureMessage(
        'Memory issue detected',
        'fatal',
        context,
      );
    }

    // Track rate limiting
    if (error.status === 429 || error.message?.includes('rate limit')) {
      this.logger.warn('Rate limit exceeded', {
        ...context,
        pattern: 'rate_limit',
      });
    }
  }
}