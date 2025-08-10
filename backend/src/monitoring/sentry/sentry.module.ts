import { Module, Global, DynamicModule } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { SentryService } from './sentry.service';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryInterceptor } from './sentry.interceptor';
import { SentryExceptionFilter } from './sentry-exception.filter';

@Global()
@Module({})
export class SentryModule {
  static forRoot(options?: Sentry.NodeOptions): DynamicModule {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const dsn = process.env.SENTRY_DSN;

    if (!isDevelopment && dsn) {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
        integrations: [
          Sentry.httpIntegration(),
          Sentry.nativeNodeFetchIntegration(),
          Sentry.expressIntegration(),
        ],
        beforeSend: (event, hint) => {
          // Filter out sensitive data
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers?.authorization;
            delete event.request.headers?.cookie;
          }
          return event;
        },
        ...options,
      });
    }

    return {
      module: SentryModule,
      providers: [
        SentryService,
        {
          provide: APP_INTERCEPTOR,
          useClass: SentryInterceptor,
        },
        {
          provide: APP_FILTER,
          useClass: SentryExceptionFilter,
        },
      ],
      exports: [SentryService],
    };
  }
}