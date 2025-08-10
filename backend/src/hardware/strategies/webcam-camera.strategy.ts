import { Injectable, Logger } from '@nestjs/common';
import {
  ICameraStrategy,
  CameraCapabilities,
  CameraSettings,
  CaptureResult,
  LiveViewStream,
} from '../interfaces/camera.interface';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

class WebcamLiveViewStream implements LiveViewStream {
  private ffmpegProcess: ChildProcess | null = null;
  private readonly eventEmitter = new EventEmitter();
  private readonly logger = new Logger(WebcamLiveViewStream.name);
  
  constructor(private readonly device: string) {}

  async start(): Promise<void> {
    if (this.ffmpegProcess) {
      return;
    }

    const args = [
      '-f', this.getInputFormat(),
      '-i', this.device,
      '-f', 'mjpeg',
      '-q:v', '5',
      '-r', '30',
      '-'
    ];

    this.ffmpegProcess = spawn('ffmpeg', args);
    
    this.ffmpegProcess.stdout?.on('data', (data: Buffer) => {
      this.eventEmitter.emit('frame', data);
    });

    this.ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      this.logger.debug(`FFmpeg: ${data.toString()}`);
    });

    this.ffmpegProcess.on('error', (error) => {
      this.logger.error('FFmpeg process error:', error);
    });

    this.ffmpegProcess.on('close', (code) => {
      this.logger.debug(`FFmpeg process closed with code ${code}`);
      this.ffmpegProcess = null;
    });

    this.logger.debug('Webcam live view stream started');
  }

  async stop(): Promise<void> {
    if (!this.ffmpegProcess) {
      return;
    }

    this.ffmpegProcess.kill('SIGTERM');
    this.ffmpegProcess = null;
    this.eventEmitter.removeAllListeners();
    
    this.logger.debug('Webcam live view stream stopped');
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

  private getInputFormat(): string {
    const platform = process.platform;
    
    switch (platform) {
      case 'linux':
        return 'v4l2';
      case 'darwin':
        return 'avfoundation';
      case 'win32':
        return 'dshow';
      default:
        return 'v4l2';
    }
  }
}

@Injectable()
export class WebcamCameraStrategy implements ICameraStrategy {
  readonly name = 'WebcamCamera';
  private readonly logger = new Logger(WebcamCameraStrategy.name);
  private device: string;
  private outputPath: string = '/tmp/photobooth/captures';
  private settings: CameraSettings = {
    imageFormat: 'jpeg',
    imageQuality: 'fine',
  };
  private videoProcess: ChildProcess | null = null;
  private videoOutputPath: string | null = null;

  constructor(device?: string) {
    this.device = device || this.getDefaultDevice();
  }

  async initialize(): Promise<void> {
    this.logger.log(`Webcam Camera Strategy initialized with device: ${this.device}`);
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      await fs.mkdir(path.join(this.outputPath, 'thumbnails'), { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create output directories:', error);
    }

    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new Error(`Webcam device ${this.device} not available`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const platform = process.platform;
      
      if (platform === 'linux') {
        await fs.access(this.device);
        return true;
      } else if (platform === 'darwin') {
        const result = await this.executeCommand('ffmpeg', [
          '-f', 'avfoundation',
          '-list_devices', 'true',
          '-i', '""'
        ]);
        return result.includes(this.device);
      } else if (platform === 'win32') {
        const result = await this.executeCommand('ffmpeg', [
          '-f', 'dshow',
          '-list_devices', 'true',
          '-i', 'dummy'
        ]);
        return result.includes(this.device);
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error checking webcam availability:', error);
      return false;
    }
  }

  getCapabilities(): CameraCapabilities {
    return {
      canTakePicture: true,
      canRecordVideo: true,
      canLiveView: true,
      canAdjustSettings: false,
      supportedFormats: ['jpeg', 'png'],
      supportedResolutions: [
        { width: 640, height: 480, label: 'VGA' },
        { width: 1280, height: 720, label: 'HD' },
        { width: 1920, height: 1080, label: 'Full HD' },
      ],
    };
  }

  async takePicture(settings?: CameraSettings): Promise<CaptureResult> {
    const timestamp = new Date();
    const fileName = `IMG_${timestamp.getTime()}.jpg`;
    const filePath = path.join(this.outputPath, fileName);
    
    this.logger.debug(`Taking picture with webcam to ${filePath}`);
    
    const inputFormat = this.getInputFormat();
    const args = [
      '-f', inputFormat,
      '-i', this.device,
      '-frames:v', '1',
      '-q:v', '2',
      filePath
    ];

    await this.executeCommand('ffmpeg', args);
    
    const thumbnailName = `thumb_${fileName}`;
    const thumbnailPath = path.join(this.outputPath, 'thumbnails', thumbnailName);
    
    await this.executeCommand('ffmpeg', [
      '-i', filePath,
      '-vf', 'scale=200:-1',
      '-q:v', '5',
      thumbnailPath
    ]);
    
    const stats = await fs.stat(filePath);
    
    return {
      filePath,
      fileName,
      timestamp,
      thumbnailPath,
      metadata: {
        width: 1920,
        height: 1080,
        size: stats.size,
        format: 'jpeg',
        camera: 'Webcam',
        settings: { ...this.settings, ...settings },
      },
    };
  }

  async startVideo(): Promise<void> {
    if (this.videoProcess) {
      throw new Error('Video recording already in progress');
    }

    const timestamp = new Date();
    const fileName = `VID_${timestamp.getTime()}.mp4`;
    this.videoOutputPath = path.join(this.outputPath, fileName);
    
    this.logger.debug(`Starting video recording to ${this.videoOutputPath}`);
    
    const inputFormat = this.getInputFormat();
    const args = [
      '-f', inputFormat,
      '-i', this.device,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      this.videoOutputPath
    ];

    this.videoProcess = spawn('ffmpeg', args);
    
    this.videoProcess.stderr?.on('data', (data: Buffer) => {
      this.logger.debug(`FFmpeg video: ${data.toString()}`);
    });

    this.videoProcess.on('error', (error) => {
      this.logger.error('FFmpeg video process error:', error);
      this.videoProcess = null;
      this.videoOutputPath = null;
    });
  }

  async stopVideo(): Promise<CaptureResult> {
    if (!this.videoProcess || !this.videoOutputPath) {
      throw new Error('No video recording in progress');
    }

    this.logger.debug('Stopping video recording');
    
    this.videoProcess.stdin?.write('q');
    
    await new Promise<void>((resolve) => {
      this.videoProcess?.on('close', () => {
        resolve();
      });
      
      setTimeout(() => {
        this.videoProcess?.kill('SIGTERM');
        resolve();
      }, 5000);
    });

    const filePath = this.videoOutputPath;
    const fileName = path.basename(filePath);
    const timestamp = new Date();
    
    this.videoProcess = null;
    this.videoOutputPath = null;
    
    const stats = await fs.stat(filePath);
    
    return {
      filePath,
      fileName,
      timestamp,
      metadata: {
        width: 1920,
        height: 1080,
        size: stats.size,
        format: 'mp4',
        camera: 'Webcam',
        settings: this.settings,
      },
    };
  }

  async getLiveView(): Promise<LiveViewStream> {
    const stream = new WebcamLiveViewStream(this.device);
    await stream.start();
    return stream;
  }

  async getSettings(): Promise<CameraSettings> {
    return { ...this.settings };
  }

  async updateSettings(settings: Partial<CameraSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    this.logger.debug('Updated webcam settings:', this.settings);
  }

  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up webcam resources');
    
    if (this.videoProcess) {
      this.videoProcess.kill('SIGTERM');
      this.videoProcess = null;
    }
  }

  private getDefaultDevice(): string {
    const platform = process.platform;
    
    switch (platform) {
      case 'linux':
        return '/dev/video0';
      case 'darwin':
        return '0';
      case 'win32':
        return 'video="USB Camera"';
      default:
        return '/dev/video0';
    }
  }

  private getInputFormat(): string {
    const platform = process.platform;
    
    switch (platform) {
      case 'linux':
        return 'v4l2';
      case 'darwin':
        return 'avfoundation';
      case 'win32':
        return 'dshow';
      default:
        return 'v4l2';
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
        if (code === 0 || (command === 'ffmpeg' && stderr.includes('Output'))) {
          resolve(stdout || stderr);
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