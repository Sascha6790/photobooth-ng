import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { GpioService } from './services/gpio.service';
import { CameraService } from './services/camera.service';

import { HardwareController } from './controllers/hardware.controller';

import { ButtonEventListener } from './listeners/button-event.listener';

import hardwareConfig from './config/hardware.config';

@Module({
  imports: [
    ConfigModule.forFeature(hardwareConfig),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  controllers: [HardwareController],
  providers: [
    GpioService,
    CameraService,
    ButtonEventListener,
  ],
  exports: [
    GpioService,
    CameraService,
  ],
})
export class HardwareModule {}
