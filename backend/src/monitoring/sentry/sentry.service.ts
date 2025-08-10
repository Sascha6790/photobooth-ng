import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService {
  captureException(exception: Error, context?: any): string {
    return Sentry.captureException(exception, {
      extra: context,
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: any): string {
    return Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }

  captureEvent(event: Sentry.Event): string {
    return Sentry.captureEvent(event);
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  setUser(user: Sentry.User | null): void {
    Sentry.setUser(user);
  }

  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  setContext(name: string, context: any): void {
    Sentry.setContext(name, context);
  }

  startTransaction(context: any): any {
    // Transaction API has changed in newer Sentry versions
    // Use spans instead
    return Sentry.startSpan({ name: context.name || 'transaction' }, () => {
      return { finish: () => {} };
    });
  }

  getCurrentScope(): any {
    return Sentry.getCurrentScope();
  }

  withScope(callback: (scope: any) => void): void {
    Sentry.withScope(callback);
  }
}