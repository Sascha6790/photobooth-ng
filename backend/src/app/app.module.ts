import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '../config/config.module';
import { LoggerService } from '../services/logger.service';
import { ApiModule } from '../api/api.module';
import { HardwareModule } from '../hardware/hardware.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { SessionModule } from '../session/session.module';
import { SoundModule } from '../sound/sound.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { PerformanceInterceptor } from '../monitoring/interceptors/performance.interceptor';
import { ErrorLoggingInterceptor } from '../monitoring/interceptors/error-logging.interceptor';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    MonitoringModule,
    AuthModule,
    MailModule,
    SessionModule,
    SoundModule,
    ApiModule,
    HardwareModule,
    WebsocketModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorLoggingInterceptor,
    },
  ],
})
export class AppModule {}
