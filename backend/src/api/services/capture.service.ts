import { Injectable } from '@nestjs/common';
import { CaptureRequestDto, CaptureResponseDto, PreviewRequestDto } from '../dto/capture.dto';
import { CameraService } from './camera.service';
import { ImageProcessingService } from './image-processing.service';
import { ConfigurationService } from '../../config/configuration.service';
import { FileService } from '../../services/file.service';
import { LoggerService } from '../../services/logger.service';
import * as path from 'path';

@Injectable()
export class CaptureService {
  private countdownTimer: NodeJS.Timeout | null = null;
  private readonly logger: LoggerService;
  
  constructor(
    private readonly cameraService: CameraService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly configService: ConfigurationService,
    private readonly fileService: FileService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('CaptureService');
  }
  
  async capture(captureDto: CaptureRequestDto): Promise<CaptureResponseDto> {
    const config = this.configService.get();
    const timestamp = Date.now();
    const filename = `photo_${timestamp}.jpg`;
    const filepath = path.join(config.paths.images, filename);
    
    try {
      // Capture image based on mode
      let capturedImage: Buffer;
      
      switch (captureDto.mode) {
        case 'photo':
          capturedImage = await this.cameraService.capturePhoto();
          break;
        case 'collage':
          capturedImage = await this.captureCollageImage(captureDto);
          break;
        case 'video':
          capturedImage = await this.captureVideoFrame(captureDto);
          break;
        case 'chromakey':
          capturedImage = await this.captureChromakeyImage(captureDto);
          break;
        default:
          throw new Error(`Unknown capture mode: ${captureDto.mode}`);
      }
      
      // Apply filters if requested
      if (captureDto.filter) {
        capturedImage = await this.imageProcessingService.applyFilter(
          capturedImage,
          captureDto.filter
        );
      }
      
      // Apply frame if requested
      if (captureDto.frame) {
        capturedImage = await this.imageProcessingService.applyFrame(
          capturedImage,
          captureDto.frame
        );
      }
      
      // Save image
      await this.fileService.writeFile(filepath, capturedImage);
      
      // Generate thumbnail
      const thumbnailPath = await this.imageProcessingService.generateThumbnail(filepath);
      
      // Generate QR code if enabled
      let qrcodePath: string | undefined;
      if (config.qr.enabled) {
        qrcodePath = await this.generateQrCode(filename);
      }
      
      // Auto print if requested
      let printJobId: string | undefined;
      if (captureDto.autoPrint && config.print.enabled) {
        // TODO: Implement print service
        printJobId = 'print-job-id';
      }
      
      return {
        success: true,
        filename,
        path: filepath,
        thumbnail: thumbnailPath,
        qrcode: qrcodePath,
        printJobId,
        timestamp: new Date(timestamp),
        metadata: {
          mode: captureDto.mode,
          filter: captureDto.filter,
          frame: captureDto.frame,
        },
      };
    } catch (error) {
      this.logger.error(`Capture failed: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async processUploadedImage(
    file: Express.Multer.File,
    captureDto: CaptureRequestDto
  ): Promise<CaptureResponseDto> {
    const config = this.configService.get();
    const timestamp = Date.now();
    const filename = `upload_${timestamp}.jpg`;
    const filepath = path.join(config.paths.images, filename);
    
    try {
      // Move uploaded file to images directory
      await this.fileService.moveFile(file.path, filepath);
      
      // Generate thumbnail
      const thumbnailPath = await this.imageProcessingService.generateThumbnail(filepath);
      
      return {
        success: true,
        filename,
        path: filepath,
        thumbnail: thumbnailPath,
        timestamp: new Date(timestamp),
        metadata: {
          mode: captureDto.mode,
          uploaded: true,
        },
      };
    } catch (error) {
      this.logger.error(`Upload processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async getPreviewStream(previewDto: PreviewRequestDto) {
    try {
      return await this.cameraService.getPreviewStream(
        previewDto.width || 1280,
        previewDto.height || 720,
        previewDto.format || 'jpeg'
      );
    } catch (error) {
      this.logger.error(`Preview stream failed: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async startCountdown(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      let remaining = seconds;
      
      this.countdownTimer = setInterval(() => {
        this.logger.debug(`Countdown: ${remaining}`);
        remaining--;
        
        if (remaining <= 0) {
          this.cancelCountdown();
          resolve();
        }
      }, 1000);
    });
  }
  
  async cancelCountdown(): Promise<void> {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
  
  private async captureCollageImage(captureDto: CaptureRequestDto): Promise<Buffer> {
    // TODO: Implement collage capture logic
    return await this.cameraService.capturePhoto();
  }
  
  private async captureVideoFrame(captureDto: CaptureRequestDto): Promise<Buffer> {
    // TODO: Implement video capture logic
    return await this.cameraService.capturePhoto();
  }
  
  private async captureChromakeyImage(captureDto: CaptureRequestDto): Promise<Buffer> {
    const photo = await this.cameraService.capturePhoto();
    
    if (captureDto.chromakeyBackground) {
      return await this.imageProcessingService.applyChromakeyBuffer(
        photo,
        captureDto.chromakeyBackground
      );
    }
    
    return photo;
  }
  
  private async generateQrCode(filename: string): Promise<string> {
    // TODO: Implement QR code generation
    return '';
  }
}