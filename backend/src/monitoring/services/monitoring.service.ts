import { Injectable } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { LoggerService } from '../logger/logger.service';
import { SentryService } from '../sentry/sentry.service';

export interface MonitoringEvent {
  type: 'performance' | 'business' | 'error' | 'security' | 'system';
  name: string;
  data?: any;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class MonitoringService {
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();

  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService,
    private readonly sentryService: SentryService,
  ) {
    this.logger.setContext('MonitoringService');
  }

  // Start performance monitoring
  startPerformanceMonitoring(operationId: string, operation: string, metadata?: Record<string, any>): void {
    this.performanceMetrics.set(operationId, {
      operation,
      startTime: Date.now(),
      metadata,
    });
  }

  // End performance monitoring
  endPerformanceMonitoring(operationId: string, success: boolean = true): PerformanceMetric | undefined {
    const metric = this.performanceMetrics.get(operationId);
    if (!metric) {
      this.logger.warn(`Performance metric not found for operation: ${operationId}`);
      return undefined;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;

    this.logger.logPerformance(metric.operation, metric.duration, {
      success,
      ...metric.metadata,
    });

    this.performanceMetrics.delete(operationId);
    return metric;
  }

  // Track business event
  trackBusinessEvent(event: string, data?: any): void {
    this.logger.logBusinessEvent(event, data);
    
    // Track specific business metrics
    switch (event) {
      case 'photo_captured':
        this.metricsService.incrementPhotoCapture(
          data?.cameraType || 'unknown',
          data?.mode || 'standard'
        );
        break;
      case 'print_job_created':
        this.metricsService.incrementPrintJob(
          data?.status || 'pending',
          data?.printer || 'default'
        );
        break;
      case 'gallery_viewed':
        this.metricsService.incrementGalleryView(data?.type || 'standard');
        break;
    }

    // Send important events to Sentry as breadcrumbs
    this.sentryService.addBreadcrumb({
      category: 'business',
      message: event,
      level: 'info',
      data,
    });
  }

  // Track security event
  trackSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    data?: any
  ): void {
    this.logger.logSecurityEvent(event, severity, data);

    // Send high severity events to Sentry
    if (severity === 'high' || severity === 'critical') {
      this.sentryService.captureMessage(
        `Security Event: ${event}`,
        severity === 'critical' ? 'fatal' : 'warning',
        data
      );
    }
  }

  // Track error
  trackError(error: Error, context?: any): void {
    this.logger.error(error.message, error.stack, context);
    this.sentryService.captureException(error, context);
  }

  // Track custom event
  trackEvent(event: MonitoringEvent): void {
    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
    };

    switch (event.type) {
      case 'performance':
        this.logger.logPerformance(event.name, 0, event.data);
        break;
      case 'business':
        this.trackBusinessEvent(event.name, event.data);
        break;
      case 'error':
        if (event.data instanceof Error) {
          this.trackError(event.data, event.metadata);
        }
        break;
      case 'security':
        this.trackSecurityEvent(
          event.name,
          event.data?.severity || 'low',
          event.metadata
        );
        break;
      case 'system':
        this.logger.log(`System Event: ${event.name}`, event.data);
        break;
    }
  }

  // Update system metrics
  updateSystemMetrics(metrics: {
    activeConnections?: number;
    cacheHitRate?: { type: string; rate: number };
    queueSize?: { name: string; size: number };
  }): void {
    if (metrics.activeConnections !== undefined) {
      this.metricsService.setActiveWebsocketConnections(metrics.activeConnections);
    }

    if (metrics.cacheHitRate) {
      this.metricsService.setCacheHitRate(
        metrics.cacheHitRate.type,
        metrics.cacheHitRate.rate
      );
    }

    if (metrics.queueSize) {
      this.metricsService.setQueueSize(
        metrics.queueSize.name,
        metrics.queueSize.size
      );
    }
  }

  // Set user context for monitoring
  setUserContext(user: { id: string; username?: string; email?: string }): void {
    this.sentryService.setUser(user);
  }

  // Clear user context
  clearUserContext(): void {
    this.sentryService.setUser(null);
  }

  // Add monitoring tag
  addTag(key: string, value: string): void {
    this.sentryService.setTag(key, value);
  }

  // Set monitoring context
  setMonitoringContext(name: string, context: any): void {
    this.sentryService.setContext(name, context);
  }

  // Get current metrics
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}