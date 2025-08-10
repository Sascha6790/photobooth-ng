import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../services/metrics.service';
import { LoggerService } from '../logger/logger.service';
import { Request, Response } from 'express';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('PerformanceInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const correlationId = headers['x-correlation-id'] as string || this.generateCorrelationId();
    
    // Add correlation ID to response headers
    response.setHeader('X-Correlation-Id', correlationId);

    // Log request start
    this.logger.verbose(`Incoming request`, {
      correlationId,
      method,
      url,
      ip,
      userAgent,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          // Record metrics
          this.metricsService.recordHttpRequest(
            method,
            this.normalizeRoute(url),
            statusCode,
            duration / 1000, // Convert to seconds
          );
          
          this.metricsService.recordApiResponseTime(
            this.normalizeRoute(url),
            method,
            duration / 1000,
          );

          // Log request completion
          this.logger.log(`Request completed`, {
            correlationId,
            method,
            url,
            statusCode,
            duration,
            ip,
            userAgent,
          });

          // Log slow requests
          if (duration > 3000) {
            this.logger.warn(`Slow request detected`, {
              correlationId,
              method,
              url,
              duration,
              threshold: '3000ms',
            });
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          
          // Record error metrics
          this.metricsService.recordHttpRequest(
            method,
            this.normalizeRoute(url),
            statusCode,
            duration / 1000,
          );

          // Log request error
          this.logger.error(`Request failed`, error.stack, {
            correlationId,
            method,
            url,
            statusCode,
            duration,
            error: error.message,
            ip,
            userAgent,
          });
        },
      }),
    );
  }

  private normalizeRoute(url: string): string {
    // Remove query parameters and normalize dynamic segments
    const [path] = url.split('?');
    
    // Replace common dynamic segments with placeholders
    return path
      .replace(/\/\d+/g, '/:id') // Replace numeric IDs
      .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:uuid') // Replace UUIDs
      .replace(/\/[a-f0-9]{24}/gi, '/:objectId'); // Replace MongoDB ObjectIds
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}