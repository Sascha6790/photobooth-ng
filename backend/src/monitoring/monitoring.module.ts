import { Module, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { LoggerModule } from './logger/logger.module';
import { MonitoringService } from './services/monitoring.service';
import { MetricsService } from './services/metrics.service';
import { HealthController } from './controllers/health.controller';
import { MetricsController } from './controllers/metrics.controller';
import { SentryModule } from './sentry/sentry.module';
import { LogAggregationService } from './services/log-aggregation.service';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';

@Global()
@Module({
  imports: [
    TerminusModule,
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/metrics',
      defaultLabels: {
        app: 'photobooth-backend',
      },
    }),
    LoggerModule,
    SentryModule.forRoot(),
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    MonitoringService,
    MetricsService,
    LogAggregationService,
    PerformanceInterceptor,
    ErrorLoggingInterceptor,
  ],
  exports: [
    MonitoringService,
    MetricsService,
    LogAggregationService,
    LoggerModule,
    PerformanceInterceptor,
    ErrorLoggingInterceptor,
  ],
})
export class MonitoringModule {}