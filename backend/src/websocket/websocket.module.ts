import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebsocketGateway } from './websocket.gateway';
import { RemoteBuzzerService } from './services/remote-buzzer.service';
import { LiveUpdateService } from './services/live-update.service';
import { CollaborationService } from './services/collaboration.service';
import { MonitoringService } from './services/monitoring.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  providers: [
    WebsocketGateway,
    RemoteBuzzerService,
    LiveUpdateService,
    CollaborationService,
    MonitoringService,
  ],
  exports: [
    RemoteBuzzerService,
    LiveUpdateService,
    CollaborationService,
    MonitoringService,
  ],
})
export class WebsocketModule {}