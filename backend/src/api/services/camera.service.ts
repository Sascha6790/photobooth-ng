import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '../../config/configuration.service';
import { LoggerService } from '../../services/logger.service';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';

export interface CameraStrategy {
  capturePhoto(): Promise<Buffer>;
  getPreviewStream(width: number, height: number, format: string): Promise<any>;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

@Injectable()
export class CameraService implements OnModuleInit {
  private strategy: CameraStrategy;
  private readonly logger: LoggerService;
  
  constructor(
    private readonly configService: ConfigurationService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('CameraService');
  }
  
  async onModuleInit() {
    await this.initializeCamera();
  }
  
  private async initializeCamera() {
    const config = this.configService.get();
    
    switch (config.camera.mode) {
      case 'gphoto2':
        this.strategy = new GPhoto2Strategy(this.logger, config);
        break;
      case 'webcam':
        this.strategy = new WebcamStrategy(this.logger, config);
        break;
      case 'raspistill':
        this.strategy = new RaspistillStrategy(this.logger, config);
        break;
      case 'mock':
      default:
        this.strategy = new MockCameraStrategy(this.logger, config);
        break;
    }
    
    await this.strategy.initialize();
    this.logger.log(`Camera initialized with strategy: ${config.camera.mode}`);
  }
  
  async capturePhoto(): Promise<Buffer> {
    return this.strategy.capturePhoto();
  }
  
  async getPreviewStream(width: number, height: number, format: string): Promise<any> {
    return this.strategy.getPreviewStream(width, height, format);
  }
  
  async cleanup() {
    await this.strategy.cleanup();
  }
}

// Mock Camera Strategy for development
class MockCameraStrategy implements CameraStrategy {
  constructor(
    private logger: LoggerService,
    private config: any
  ) {}
  
  async initialize(): Promise<void> {
    this.logger.debug('Mock camera initialized');
  }
  
  async capturePhoto(): Promise<Buffer> {
    // Return a placeholder image for development
    const placeholderPath = 'resources/img/demo/seal-station-norddeich-01.jpg';
    try {
      return await fs.readFile(placeholderPath);
    } catch {
      // Create a test image with timestamp for better test debugging
      const sharp = await import('sharp');
      const timestamp = new Date().toISOString();
      return sharp.default({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: { r: 100, g: 150, b: 200 }
        }
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    }
  }
  
  async getPreviewStream(width: number, height: number, format: string): Promise<any> {
    // Return a static image for mock preview
    return this.capturePhoto();
  }
  
  async cleanup(): Promise<void> {
    this.logger.debug('Mock camera cleanup');
  }
}

// GPhoto2 Strategy for DSLR cameras
class GPhoto2Strategy implements CameraStrategy {
  constructor(
    private logger: LoggerService,
    private config: any
  ) {}
  
  async initialize(): Promise<void> {
    // Check if gphoto2 is available
    try {
      await this.executeCommand('gphoto2', ['--version']);
      this.logger.debug('GPhoto2 camera initialized');
    } catch (error) {
      throw new Error('gphoto2 not found. Please install gphoto2.');
    }
  }
  
  async capturePhoto(): Promise<Buffer> {
    const tempFile = `/tmp/capture_${Date.now()}.jpg`;
    
    try {
      // Capture image and download to temp file
      await this.executeCommand('gphoto2', [
        '--capture-image-and-download',
        '--filename', tempFile,
        '--force-overwrite'
      ]);
      
      // Read the captured image
      const imageBuffer = await fs.readFile(tempFile);
      
      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {});
      
      return imageBuffer;
    } catch (error) {
      this.logger.error(`GPhoto2 capture failed: ${error.message}`);
      throw error;
    }
  }
  
  async getPreviewStream(width: number, height: number, format: string): Promise<any> {
    // GPhoto2 doesn't support live preview easily, return a capture instead
    return this.capturePhoto();
  }
  
  async cleanup(): Promise<void> {
    this.logger.debug('GPhoto2 camera cleanup');
  }
  
  private executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr}`));
        }
      });
    });
  }
}

// Webcam Strategy for USB webcams
class WebcamStrategy implements CameraStrategy {
  constructor(
    private logger: LoggerService,
    private config: any
  ) {}
  
  async initialize(): Promise<void> {
    // Check if ffmpeg is available for webcam capture
    try {
      await this.executeCommand('ffmpeg', ['-version']);
      this.logger.debug('Webcam initialized');
    } catch (error) {
      throw new Error('ffmpeg not found. Please install ffmpeg for webcam support.');
    }
  }
  
  async capturePhoto(): Promise<Buffer> {
    const tempFile = `/tmp/webcam_${Date.now()}.jpg`;
    
    try {
      // Detect platform and use appropriate capture method
      const platform = process.platform;
      let ffmpegArgs: string[];
      
      if (platform === 'darwin') {
        // macOS - use AVFoundation
        ffmpegArgs = [
          '-f', 'avfoundation',
          '-video_size', '1280x720',
          '-framerate', '30',
          '-i', '0:0',  // First video device
          '-frames:v', '1',
          '-y',
          tempFile
        ];
      } else if (platform === 'win32') {
        // Windows - use DirectShow
        ffmpegArgs = [
          '-f', 'dshow',
          '-i', 'video="Integrated Camera"',
          '-frames:v', '1',
          '-y',
          tempFile
        ];
      } else {
        // Linux - use v4l2
        ffmpegArgs = [
          '-f', 'v4l2',
          '-i', '/dev/video0',
          '-frames:v', '1',
          '-y',
          tempFile
        ];
      }
      
      // Capture single frame from webcam using ffmpeg
      await this.executeCommand('ffmpeg', ffmpegArgs);
      
      // Read the captured image
      const imageBuffer = await fs.readFile(tempFile);
      
      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {});
      
      return imageBuffer;
    } catch (error) {
      this.logger.error(`Webcam capture failed: ${error.message}`);
      throw error;
    }
  }
  
  async getPreviewStream(width: number, height: number, format: string): Promise<any> {
    // For now, return a single capture
    return this.capturePhoto();
  }
  
  async cleanup(): Promise<void> {
    this.logger.debug('Webcam cleanup');
  }
  
  private executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr}`));
        }
      });
    });
  }
}

// Raspistill Strategy for Raspberry Pi Camera Module
class RaspistillStrategy implements CameraStrategy {
  constructor(
    private logger: LoggerService,
    private config: any
  ) {}
  
  async initialize(): Promise<void> {
    // Check if raspistill is available
    try {
      await this.executeCommand('raspistill', ['--version']);
      this.logger.debug('Raspistill camera initialized');
    } catch (error) {
      throw new Error('raspistill not found. This strategy only works on Raspberry Pi.');
    }
  }
  
  async capturePhoto(): Promise<Buffer> {
    const tempFile = `/tmp/raspistill_${Date.now()}.jpg`;
    
    try {
      // Capture image with raspistill
      await this.executeCommand('raspistill', [
        '-o', tempFile,
        '-w', '1920',
        '-h', '1080',
        '-q', '90',
        '-t', '100' // Minimal delay
      ]);
      
      // Read the captured image
      const imageBuffer = await fs.readFile(tempFile);
      
      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {});
      
      return imageBuffer;
    } catch (error) {
      this.logger.error(`Raspistill capture failed: ${error.message}`);
      throw error;
    }
  }
  
  async getPreviewStream(width: number, height: number, format: string): Promise<any> {
    // For now, return a single capture
    return this.capturePhoto();
  }
  
  async cleanup(): Promise<void> {
    this.logger.debug('Raspistill camera cleanup');
  }
  
  private executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr}`));
        }
      });
    });
  }
}