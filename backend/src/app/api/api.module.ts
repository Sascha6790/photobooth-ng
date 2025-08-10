import { Module } from '@nestjs/common';
import { CaptureController, GalleryController, SettingsController } from './controllers';

@Module({
  controllers: [
    CaptureController,
    GalleryController,
    SettingsController
  ],
  providers: []
})
export class ApiModule {}
