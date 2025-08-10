import { Module } from '@nestjs/common';
import { CaptureController } from './controllers/capture.controller';
import { GalleryController } from './controllers/gallery.controller';
import { SettingsController } from './controllers/settings.controller';
import { PrintController } from './controllers/print.controller';
import { QrcodeController } from './controllers/qrcode.controller';
import { ChromakeyingController } from './controllers/chromakeying.controller';
import { AdminController } from './controllers/admin.controller';
import { CaptureService } from './services/capture.service';
import { GalleryService } from './services/gallery.service';
import { ImageProcessingService } from './services/image-processing.service';
import { PrintService } from './services/print.service';
import { QrcodeService } from './services/qrcode.service';
import { CameraService } from './services/camera.service';
import { ConfigModule } from '../config/config.module';
import { LoggerService } from '../services/logger.service';
import { FileService } from '../services/file.service';

@Module({
  imports: [ConfigModule],
  controllers: [
    CaptureController,
    GalleryController,
    SettingsController,
    PrintController,
    QrcodeController,
    ChromakeyingController,
    AdminController,
  ],
  providers: [
    CaptureService,
    GalleryService,
    ImageProcessingService,
    PrintService,
    QrcodeService,
    CameraService,
    LoggerService,
    FileService,
  ],
  exports: [
    CaptureService,
    GalleryService,
    ImageProcessingService,
    PrintService,
    QrcodeService,
    CameraService,
  ],
})
export class ApiModule {}