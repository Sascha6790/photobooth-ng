import { Injectable, Logger } from '@nestjs/common';
import {
  ICameraStrategy,
  CameraCapabilities,
  CameraSettings,
  CaptureResult,
  LiveViewStream,
} from '../interfaces/camera.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { GPhoto2NodeService } from '../services/gphoto2-node.service';

class GPhoto2LiveViewStream implements LiveViewStream {
  private gphotoProcess: ChildProcess | null = null;
  private readonly eventEmitter = new EventEmitter();
  private readonly logger = new Logger(GPhoto2LiveViewStream.name);
  private isStreaming = false;

  async start(): Promise<void> {
    if (this.isStreaming) {
      return;
    }

    this.isStreaming = true;
    
    const args = [
      '--capture-movie',
      '--stdout'
    ];

    this.gphotoProcess = spawn('gphoto2', args);
    
    let buffer = Buffer.alloc(0);
    const jpegStart = Buffer.from([0xFF, 0xD8]);
    const jpegEnd = Buffer.from([0xFF, 0xD9]);
    
    this.gphotoProcess.stdout?.on('data', (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      
      let startIndex = buffer.indexOf(jpegStart);
      while (startIndex !== -1) {
        const endIndex = buffer.indexOf(jpegEnd, startIndex + 2);
        
        if (endIndex !== -1) {
          const frame = buffer.slice(startIndex, endIndex + 2);
          this.eventEmitter.emit('frame', frame);
          
          buffer = buffer.slice(endIndex + 2);
          startIndex = buffer.indexOf(jpegStart);
        } else {
          break;
        }
      }
      
      if (buffer.length > 1024 * 1024) {
        buffer = Buffer.alloc(0);
      }
    });

    this.gphotoProcess.stderr?.on('data', (data: Buffer) => {
      this.logger.debug(`gphoto2 live view: ${data.toString()}`);
    });

    this.gphotoProcess.on('error', (error) => {
      this.logger.error('gphoto2 live view process error:', error);
      this.isStreaming = false;
    });

    this.gphotoProcess.on('close', (code) => {
      this.logger.debug(`gphoto2 live view process closed with code ${code}`);
      this.gphotoProcess = null;
      this.isStreaming = false;
    });

    this.logger.debug('GPhoto2 live view stream started');
  }

  async stop(): Promise<void> {
    if (!this.gphotoProcess) {
      return;
    }

    this.gphotoProcess.kill('SIGTERM');
    this.gphotoProcess = null;
    this.isStreaming = false;
    this.eventEmitter.removeAllListeners();
    
    this.logger.debug('GPhoto2 live view stream stopped');
  }

  async getFrame(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for frame'));
      }, 5000);

      this.eventEmitter.once('frame', (frame: Buffer) => {
        clearTimeout(timeout);
        resolve(frame);
      });
    });
  }

  onFrame(callback: (frame: Buffer) => void): void {
    this.eventEmitter.on('frame', callback);
  }
}

@Injectable()
export class GPhoto2CameraStrategy implements ICameraStrategy {
  readonly name = 'GPhoto2Camera';
  private readonly logger = new Logger(GPhoto2CameraStrategy.name);
  private readonly gphoto2Service = new GPhoto2NodeService();
  private outputPath: string = '/tmp/photobooth/captures';
  private settings: CameraSettings = {
    iso: 200,
    aperture: 'f/5.6',
    shutterSpeed: '1/125',
    whiteBalance: 'auto',
    focusMode: 'auto',
    imageFormat: 'jpeg',
    imageQuality: 'fine',
  };
  private cameraInfo: any = null;
  private cameraPort: string | null = null;
  private cameraModel: string | null = null;

  async initialize(): Promise<void> {
    this.logger.log('GPhoto2 Camera Strategy initializing...');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      await fs.mkdir(path.join(this.outputPath, 'thumbnails'), { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create output directories:', error);
    }

    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new Error('No gphoto2 compatible camera detected');
    }

    await this.detectCamera();
    await this.configureCamera();
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.executeCommand('gphoto2', ['--auto-detect']);
      
      const lines = result.split('\n');
      const cameraLine = lines.find(line => 
        line.includes('usb:') || line.includes('ptpip:')
      );
      
      return !!cameraLine;
    } catch (error) {
      this.logger.error('gphoto2 not available or no camera detected:', error);
      return false;
    }
  }

  private async detectCamera(): Promise<void> {
    try {
      const result = await this.executeCommand('gphoto2', ['--auto-detect']);
      const lines = result.split('\n');
      
      for (const line of lines) {
        if (line.includes('usb:') || line.includes('ptpip:')) {
          const parts = line.split(/\s+/);
          const port = parts[parts.length - 1];
          const model = parts.slice(0, -1).join(' ').trim();
          
          this.cameraPort = port;
          this.cameraModel = model;
          
          this.logger.log(`Detected camera: ${model} on ${port}`);
          break;
        }
      }
    } catch (error) {
      this.logger.error('Failed to detect camera:', error);
    }
  }

  private async configureCamera(): Promise<void> {
    try {
      await this.executeCommand('gphoto2', [
        '--set-config', 'capturetarget=1'
      ]);
      
      this.logger.debug('Camera configured for tethered shooting');
    } catch (error) {
      this.logger.warn('Failed to configure camera:', error);
    }
  }

  getCapabilities(): CameraCapabilities {
    return {
      canTakePicture: true,
      canRecordVideo: false,
      canLiveView: true,
      canAdjustSettings: true,
      supportedFormats: ['jpeg', 'raw', 'raw+jpeg'],
      supportedResolutions: [
        { width: 6000, height: 4000, label: '24MP' },
        { width: 4500, height: 3000, label: '13.5MP' },
        { width: 3000, height: 2000, label: '6MP' },
      ],
    };
  }

  async takePicture(settings?: CameraSettings): Promise<CaptureResult> {
    const appliedSettings = { ...this.settings, ...settings };
    
    if (settings) {
      await this.applySettings(appliedSettings);
    }

    const timestamp = new Date();
    const fileName = `IMG_${timestamp.getTime()}.jpg`;
    const filePath = path.join(this.outputPath, fileName);
    
    this.logger.debug(`Taking picture with gphoto2 to ${filePath}`);
    
    const args = [
      '--capture-image-and-download',
      '--filename', filePath,
      '--force-overwrite'
    ];

    if (this.cameraPort) {
      args.push('--port', this.cameraPort);
    }

    await this.executeCommand('gphoto2', args);
    
    const thumbnailName = `thumb_${fileName}`;
    const thumbnailPath = path.join(this.outputPath, 'thumbnails', thumbnailName);
    
    await this.executeCommand('convert', [
      filePath,
      '-resize', '200x150',
      '-quality', '85',
      thumbnailPath
    ]).catch(() => {
      this.logger.warn('ImageMagick not available for thumbnail generation');
    });
    
    const stats = await fs.stat(filePath);
    
    const exifData = await this.extractExifData(filePath);
    
    return {
      filePath,
      fileName,
      timestamp,
      thumbnailPath,
      metadata: {
        width: exifData.width || 6000,
        height: exifData.height || 4000,
        size: stats.size,
        format: 'jpeg',
        camera: this.cameraModel || 'DSLR Camera',
        settings: appliedSettings,
        exif: exifData,
      },
    };
  }

  async startVideo(): Promise<void> {
    throw new Error('Video recording not supported with gphoto2');
  }

  async stopVideo(): Promise<CaptureResult> {
    throw new Error('Video recording not supported with gphoto2');
  }

  async getLiveView(): Promise<LiveViewStream> {
    const stream = new GPhoto2LiveViewStream();
    await stream.start();
    return stream;
  }

  async getSettings(): Promise<CameraSettings> {
    const currentSettings: CameraSettings = { ...this.settings };
    
    try {
      const iso = await this.getConfig('iso');
      if (iso) currentSettings.iso = parseInt(iso);
      
      const aperture = await this.getConfig('aperture');
      if (aperture) currentSettings.aperture = aperture;
      
      const shutterSpeed = await this.getConfig('shutterspeed');
      if (shutterSpeed) currentSettings.shutterSpeed = shutterSpeed;
      
      const whiteBalance = await this.getConfig('whitebalance');
      if (whiteBalance) currentSettings.whiteBalance = whiteBalance;
      
      const imageFormat = await this.getConfig('imageformat');
      if (imageFormat) {
        if (imageFormat.includes('RAW')) {
          currentSettings.imageFormat = imageFormat.includes('JPEG') ? 'raw+jpeg' : 'raw';
        } else {
          currentSettings.imageFormat = 'jpeg';
        }
      }
    } catch (error) {
      this.logger.warn('Failed to read some camera settings:', error);
    }
    
    return currentSettings;
  }

  async updateSettings(settings: Partial<CameraSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await this.applySettings(this.settings);
  }

  private async applySettings(settings: CameraSettings): Promise<void> {
    const configCommands: string[] = [];
    
    if (settings.iso !== undefined) {
      configCommands.push(`iso=${settings.iso}`);
    }
    
    if (settings.aperture) {
      const apertureValue = settings.aperture.replace('f/', '');
      configCommands.push(`aperture=${apertureValue}`);
    }
    
    if (settings.shutterSpeed) {
      configCommands.push(`shutterspeed=${settings.shutterSpeed}`);
    }
    
    if (settings.whiteBalance) {
      configCommands.push(`whitebalance=${settings.whiteBalance}`);
    }
    
    if (settings.focusMode) {
      const focusValue = settings.focusMode === 'auto' ? 'AF-S' : 'MF';
      configCommands.push(`focusmode=${focusValue}`);
    }
    
    if (settings.imageFormat) {
      let formatValue = 'JPEG Fine';
      if (settings.imageFormat === 'raw') {
        formatValue = 'RAW';
      } else if (settings.imageFormat === 'raw+jpeg') {
        formatValue = 'RAW+JPEG Fine';
      }
      configCommands.push(`imageformat=${formatValue}`);
    }
    
    for (const config of configCommands) {
      try {
        await this.executeCommand('gphoto2', ['--set-config', config]);
        this.logger.debug(`Applied setting: ${config}`);
      } catch (error) {
        this.logger.warn(`Failed to apply setting ${config}:`, error);
      }
    }
  }

  private async getConfig(name: string): Promise<string | null> {
    try {
      const result = await this.executeCommand('gphoto2', ['--get-config', name]);
      const match = result.match(/Current:\s*(.+)/);
      return match ? match[1].trim() : null;
    } catch (error) {
      return null;
    }
  }

  private async extractExifData(filePath: string): Promise<Record<string, any>> {
    try {
      const result = await this.executeCommand('exiftool', ['-j', filePath]);
      const data = JSON.parse(result)[0];
      
      return {
        Make: data.Make,
        Model: data.Model,
        DateTime: data.DateTimeOriginal || data.CreateDate,
        ISO: data.ISO,
        FNumber: data.FNumber,
        ExposureTime: data.ExposureTime,
        FocalLength: data.FocalLength,
        WhiteBalance: data.WhiteBalance,
        width: data.ImageWidth,
        height: data.ImageHeight,
      };
    } catch (error) {
      this.logger.warn('Failed to extract EXIF data:', error);
      return {};
    }
  }

  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up gphoto2 resources');
    
    try {
      await this.executeCommand('gphoto2', ['--reset']);
    } catch (error) {
      this.logger.warn('Failed to reset camera:', error);
    }
  }

  private executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }
}