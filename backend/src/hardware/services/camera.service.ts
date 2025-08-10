import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ICameraStrategy,
  CameraConfig,
  CameraCapabilities,
  CameraSettings,
  CaptureResult,
  LiveViewStream,
} from '../interfaces/camera.interface';
import { MockCameraStrategy } from '../strategies/mock-camera.strategy';
import { WebcamCameraStrategy } from '../strategies/webcam-camera.strategy';
import { GPhoto2CameraStrategy } from '../strategies/gphoto2-camera.strategy';

export enum CameraEvent {
  CAPTURE_STARTED = 'camera.capture.started',
  CAPTURE_COMPLETED = 'camera.capture.completed',
  CAPTURE_FAILED = 'camera.capture.failed',
  VIDEO_STARTED = 'camera.video.started',
  VIDEO_STOPPED = 'camera.video.stopped',
  SETTINGS_CHANGED = 'camera.settings.changed',
  CONNECTION_LOST = 'camera.connection.lost',
  CONNECTION_RESTORED = 'camera.connection.restored',
}

export interface CaptureOptions {
  countdown?: number;
  sound?: boolean;
  flash?: boolean;
  settings?: CameraSettings;
  saveToGallery?: boolean;
}

@Injectable()
export class CameraService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CameraService.name);
  private strategy: ICameraStrategy;
  private config: CameraConfig;
  private isInitialized = false;
  private reconnectTimer: NodeJS.Timer | null = null;
  private currentLiveView: LiveViewStream | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.config = this.loadConfig();
    this.strategy = this.createStrategy(this.config.strategy);
  }

  async onModuleInit(): Promise<void> {
    if (this.config.autoConnect) {
      await this.initialize();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.cleanup();
  }

  private loadConfig(): CameraConfig {
    const defaultConfig: CameraConfig = {
      strategy: 'mock',
      outputPath: '/tmp/photobooth/captures',
      thumbnailPath: '/tmp/photobooth/captures/thumbnails',
      autoConnect: true,
      reconnectAttempts: 3,
      reconnectDelay: 5000,
    };

    const userConfig = this.configService.get<Partial<CameraConfig>>('hardware.camera', {});
    
    const env = process.env.NODE_ENV || 'development';
    if (env === 'development' && !userConfig.strategy) {
      userConfig.strategy = 'mock';
    }

    return { ...defaultConfig, ...userConfig };
  }

  private createStrategy(type: string): ICameraStrategy {
    this.logger.log(`Creating camera strategy: ${type}`);

    switch (type) {
      case 'webcam':
        return new WebcamCameraStrategy(this.config.device);
      
      case 'gphoto2':
        return new GPhoto2CameraStrategy();
      
      case 'mock':
      default:
        return new MockCameraStrategy();
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.log(`Initializing camera with ${this.strategy.name} strategy`);
      
      await this.strategy.initialize();
      
      if (this.config.settings) {
        await this.strategy.updateSettings(this.config.settings);
      }
      
      this.isInitialized = true;
      
      this.logger.log('Camera initialized successfully');
      
      this.eventEmitter.emit(CameraEvent.CONNECTION_RESTORED);
    } catch (error) {
      this.logger.error('Failed to initialize camera:', error);
      
      if (this.config.reconnectAttempts && this.config.reconnectAttempts > 0) {
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    let attempts = 0;
    const maxAttempts = this.config.reconnectAttempts || 3;
    const delay = this.config.reconnectDelay || 5000;

    this.reconnectTimer = setInterval(async () => {
      attempts++;
      
      this.logger.log(`Attempting to reconnect to camera (${attempts}/${maxAttempts})`);
      
      try {
        await this.initialize();
        
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      } catch (error) {
        this.logger.error(`Reconnection attempt ${attempts} failed:`, error);
        
        if (attempts >= maxAttempts) {
          this.logger.error('Max reconnection attempts reached');
          
          if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          
          this.eventEmitter.emit(CameraEvent.CONNECTION_LOST);
        }
      }
    }, delay);
  }

  async switchStrategy(type: 'mock' | 'webcam' | 'gphoto2'): Promise<void> {
    this.logger.log(`Switching camera strategy to: ${type}`);
    
    await this.cleanup();
    
    this.strategy = this.createStrategy(type);
    this.config.strategy = type;
    this.isInitialized = false;
    
    await this.initialize();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      return await this.strategy.isAvailable();
    } catch (error) {
      this.logger.error('Error checking camera availability:', error);
      return false;
    }
  }

  getCapabilities(): CameraCapabilities {
    return this.strategy.getCapabilities();
  }

  async capture(options: CaptureOptions = {}): Promise<CaptureResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.logger.debug('Starting capture with options:', options);
    
    this.eventEmitter.emit(CameraEvent.CAPTURE_STARTED, options);

    try {
      if (options.countdown && options.countdown > 0) {
        await this.countdown(options.countdown);
      }

      if (options.sound) {
        this.eventEmitter.emit('sound.play', 'shutter');
      }

      if (options.flash) {
        this.eventEmitter.emit('gpio.led.flash', 'flash');
      }

      const result = await this.strategy.takePicture(options.settings);
      
      this.eventEmitter.emit(CameraEvent.CAPTURE_COMPLETED, result);
      
      if (options.saveToGallery) {
        this.eventEmitter.emit('gallery.add', result);
      }
      
      return result;
    } catch (error) {
      this.logger.error('Capture failed:', error);
      
      this.eventEmitter.emit(CameraEvent.CAPTURE_FAILED, error);
      
      throw error;
    }
  }

  async captureMultiple(count: number, interval: number, options: CaptureOptions = {}): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];
    
    for (let i = 0; i < count; i++) {
      this.logger.debug(`Capturing image ${i + 1}/${count}`);
      
      const result = await this.capture(options);
      results.push(result);
      
      if (i < count - 1) {
        await this.delay(interval);
      }
    }
    
    return results;
  }

  async startVideo(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const capabilities = this.getCapabilities();
    if (!capabilities.canRecordVideo) {
      throw new Error('Video recording not supported by current camera');
    }

    this.logger.debug('Starting video recording');
    
    await this.strategy.startVideo();
    
    this.eventEmitter.emit(CameraEvent.VIDEO_STARTED);
  }

  async stopVideo(): Promise<CaptureResult> {
    if (!this.isInitialized) {
      throw new Error('Camera not initialized');
    }

    this.logger.debug('Stopping video recording');
    
    const result = await this.strategy.stopVideo();
    
    this.eventEmitter.emit(CameraEvent.VIDEO_STOPPED, result);
    
    return result;
  }

  async startLiveView(): Promise<LiveViewStream> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const capabilities = this.getCapabilities();
    if (!capabilities.canLiveView) {
      throw new Error('Live view not supported by current camera');
    }

    if (this.currentLiveView) {
      return this.currentLiveView;
    }

    this.logger.debug('Starting live view');
    
    this.currentLiveView = await this.strategy.getLiveView();
    
    return this.currentLiveView;
  }

  async stopLiveView(): Promise<void> {
    if (!this.currentLiveView) {
      return;
    }

    this.logger.debug('Stopping live view');
    
    await this.currentLiveView.stop();
    this.currentLiveView = null;
  }

  async getSettings(): Promise<CameraSettings> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.strategy.getSettings();
  }

  async updateSettings(settings: Partial<CameraSettings>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.logger.debug('Updating camera settings:', settings);
    
    await this.strategy.updateSettings(settings);
    
    this.eventEmitter.emit(CameraEvent.SETTINGS_CHANGED, settings);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      const available = await this.isAvailable();
      
      if (available) {
        const testCapture = await this.strategy.takePicture();
        this.logger.log(`Test capture successful: ${testCapture.fileName}`);
      }
      
      return available;
    } catch (error) {
      this.logger.error('Camera connection test failed:', error);
      return false;
    }
  }

  private async countdown(seconds: number): Promise<void> {
    for (let i = seconds; i > 0; i--) {
      this.eventEmitter.emit('countdown.tick', i);
      await this.delay(1000);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async cleanup(): Promise<void> {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.currentLiveView) {
      await this.currentLiveView.stop();
      this.currentLiveView = null;
    }

    if (this.isInitialized) {
      await this.strategy.cleanup();
      this.isInitialized = false;
    }
  }

  getCurrentStrategy(): string {
    return this.strategy.name;
  }

  getConfig(): CameraConfig {
    return { ...this.config };
  }
}