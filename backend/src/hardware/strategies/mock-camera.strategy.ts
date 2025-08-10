import { Injectable, Logger } from '@nestjs/common';
import {
  ICameraStrategy,
  CameraCapabilities,
  CameraSettings,
  CaptureResult,
  LiveViewStream,
  Resolution,
} from '../interfaces/camera.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';

class MockLiveViewStream implements LiveViewStream {
  private isStreaming = false;
  private frameInterval: NodeJS.Timer | null = null;
  private readonly eventEmitter = new EventEmitter();
  private readonly logger = new Logger(MockLiveViewStream.name);

  async start(): Promise<void> {
    if (this.isStreaming) {
      return;
    }

    this.isStreaming = true;
    this.logger.debug('Mock live view stream started');

    this.frameInterval = setInterval(() => {
      const mockFrame = this.generateMockFrame();
      this.eventEmitter.emit('frame', mockFrame);
    }, 33);
  }

  async stop(): Promise<void> {
    if (!this.isStreaming) {
      return;
    }

    this.isStreaming = false;
    
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    this.eventEmitter.removeAllListeners();
    this.logger.debug('Mock live view stream stopped');
  }

  async getFrame(): Promise<Buffer> {
    return this.generateMockFrame();
  }

  onFrame(callback: (frame: Buffer) => void): void {
    this.eventEmitter.on('frame', callback);
  }

  private generateMockFrame(): Buffer {
    const width = 1920;
    const height = 1080;
    const channelCount = 3;
    const headerSize = 14 + 40;
    const dataSize = width * height * channelCount;
    const fileSize = headerSize + dataSize;

    const buffer = Buffer.alloc(fileSize);

    buffer.write('BM', 0);
    buffer.writeInt32LE(fileSize, 2);
    buffer.writeInt32LE(0, 6);
    buffer.writeInt32LE(headerSize, 10);

    buffer.writeInt32LE(40, 14);
    buffer.writeInt32LE(width, 18);
    buffer.writeInt32LE(height, 22);
    buffer.writeInt16LE(1, 26);
    buffer.writeInt16LE(24, 28);
    buffer.writeInt32LE(0, 30);
    buffer.writeInt32LE(dataSize, 34);
    buffer.writeInt32LE(2835, 38);
    buffer.writeInt32LE(2835, 42);
    buffer.writeInt32LE(0, 46);
    buffer.writeInt32LE(0, 50);

    const timestamp = Date.now();
    const color = Math.floor((Math.sin(timestamp / 1000) + 1) * 127.5);
    
    for (let i = headerSize; i < fileSize; i += 3) {
      buffer[i] = color;
      buffer[i + 1] = 128;
      buffer[i + 2] = 255 - color;
    }

    return buffer;
  }
}

@Injectable()
export class MockCameraStrategy implements ICameraStrategy {
  readonly name = 'MockCamera';
  private readonly logger = new Logger(MockCameraStrategy.name);
  private settings: CameraSettings = {
    iso: 200,
    aperture: 'f/2.8',
    shutterSpeed: '1/125',
    whiteBalance: 'auto',
    focusMode: 'auto',
    imageFormat: 'jpeg',
    imageQuality: 'fine',
  };
  private videoStartTime: Date | null = null;
  private outputPath: string = '/tmp/photobooth/captures';

  async initialize(): Promise<void> {
    this.logger.log('Mock Camera Strategy initialized');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create output directory:', error);
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getCapabilities(): CameraCapabilities {
    return {
      canTakePicture: true,
      canRecordVideo: true,
      canLiveView: true,
      canAdjustSettings: true,
      supportedFormats: ['jpeg', 'png', 'raw'],
      supportedResolutions: [
        { width: 640, height: 480, label: 'VGA' },
        { width: 1280, height: 720, label: 'HD' },
        { width: 1920, height: 1080, label: 'Full HD' },
        { width: 3840, height: 2160, label: '4K' },
      ],
    };
  }

  async takePicture(settings?: CameraSettings): Promise<CaptureResult> {
    const appliedSettings = { ...this.settings, ...settings };
    
    this.logger.debug('Taking mock picture with settings:', appliedSettings);
    
    await this.simulateDelay(500);
    
    const timestamp = new Date();
    const fileName = `IMG_${timestamp.getTime()}.jpg`;
    const filePath = path.join(this.outputPath, fileName);
    
    const mockImageData = await this.generateMockImage();
    await fs.writeFile(filePath, mockImageData);
    
    const thumbnailName = `thumb_${fileName}`;
    const thumbnailPath = path.join(this.outputPath, 'thumbnails', thumbnailName);
    
    try {
      await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
      const thumbnailData = await this.generateMockImage(200, 150);
      await fs.writeFile(thumbnailPath, thumbnailData);
    } catch (error) {
      this.logger.warn('Failed to create thumbnail:', error);
    }
    
    return {
      filePath,
      fileName,
      timestamp,
      thumbnailPath,
      metadata: {
        width: 1920,
        height: 1080,
        size: mockImageData.length,
        format: 'jpeg',
        camera: 'Mock Camera',
        settings: appliedSettings,
        exif: {
          Make: 'Mock',
          Model: 'MockCamera v1.0',
          DateTime: timestamp.toISOString(),
          ISO: appliedSettings.iso,
          FNumber: appliedSettings.aperture,
          ExposureTime: appliedSettings.shutterSpeed,
        },
      },
    };
  }

  async startVideo(): Promise<void> {
    this.logger.debug('Starting mock video recording');
    this.videoStartTime = new Date();
    
    await this.simulateDelay(100);
  }

  async stopVideo(): Promise<CaptureResult> {
    if (!this.videoStartTime) {
      throw new Error('Video recording not started');
    }
    
    const duration = Date.now() - this.videoStartTime.getTime();
    this.logger.debug(`Stopping mock video recording after ${duration}ms`);
    
    await this.simulateDelay(200);
    
    const timestamp = new Date();
    const fileName = `VID_${timestamp.getTime()}.mp4`;
    const filePath = path.join(this.outputPath, fileName);
    
    const mockVideoData = Buffer.from('Mock video data');
    await fs.writeFile(filePath, mockVideoData);
    
    this.videoStartTime = null;
    
    return {
      filePath,
      fileName,
      timestamp,
      metadata: {
        width: 1920,
        height: 1080,
        size: mockVideoData.length,
        format: 'mp4',
        camera: 'Mock Camera',
        settings: this.settings,
      },
    };
  }

  async getLiveView(): Promise<LiveViewStream> {
    this.logger.debug('Creating mock live view stream');
    const stream = new MockLiveViewStream();
    await stream.start();
    return stream;
  }

  async getSettings(): Promise<CameraSettings> {
    return { ...this.settings };
  }

  async updateSettings(settings: Partial<CameraSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    this.logger.debug('Updated mock camera settings:', this.settings);
    
    await this.simulateDelay(100);
  }

  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up mock camera resources');
    this.videoStartTime = null;
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateMockImage(width = 1920, height = 1080): Promise<Buffer> {
    const headerSize = 14 + 40;
    const dataSize = width * height * 3;
    const fileSize = headerSize + dataSize;
    
    const buffer = Buffer.alloc(fileSize);
    
    buffer.write('BM', 0);
    buffer.writeInt32LE(fileSize, 2);
    buffer.writeInt32LE(0, 6);
    buffer.writeInt32LE(headerSize, 10);
    
    buffer.writeInt32LE(40, 14);
    buffer.writeInt32LE(width, 18);
    buffer.writeInt32LE(height, 22);
    buffer.writeInt16LE(1, 26);
    buffer.writeInt16LE(24, 28);
    buffer.writeInt32LE(0, 30);
    buffer.writeInt32LE(dataSize, 34);
    buffer.writeInt32LE(2835, 38);
    buffer.writeInt32LE(2835, 42);
    buffer.writeInt32LE(0, 46);
    buffer.writeInt32LE(0, 50);
    
    const randomData = randomBytes(Math.min(dataSize, 1000));
    for (let i = 0; i < dataSize; i += randomData.length) {
      randomData.copy(buffer, headerSize + i, 0, Math.min(randomData.length, dataSize - i));
    }
    
    return buffer;
  }
}