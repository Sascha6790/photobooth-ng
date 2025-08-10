import { Injectable, Logger } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface WebcamInfo {
  device: string;
  name: string;
  capabilities: string[];
  resolutions: string[];
}

export interface CaptureOptions {
  device?: string;
  resolution?: string;
  quality?: number;
  format?: 'jpeg' | 'png' | 'bmp';
  brightness?: number;
  contrast?: number;
  saturation?: number;
  skipFrames?: number;
}

@Injectable()
export class WebcamNodeService {
  private readonly logger = new Logger(WebcamNodeService.name);
  private streamProcess: any = null;
  private defaultDevice = '/dev/video0';

  /**
   * List available webcams
   */
  async listWebcams(): Promise<WebcamInfo[]> {
    try {
      const { stdout } = await execAsync('v4l2-ctl --list-devices');
      const devices: WebcamInfo[] = [];
      
      // Parse v4l2-ctl output
      const sections = stdout.split('\n\n');
      for (const section of sections) {
        const lines = section.split('\n');
        if (lines.length >= 2) {
          const name = lines[0].replace(':', '').trim();
          const deviceMatch = lines[1].match(/\/dev\/video\d+/);
          
          if (deviceMatch) {
            const device = deviceMatch[0];
            devices.push({
              device,
              name,
              capabilities: await this.getCapabilities(device),
              resolutions: await this.getSupportedResolutions(device)
            });
          }
        }
      }
      
      return devices;
    } catch (error) {
      this.logger.error('Failed to list webcams:', error);
      
      // Fallback: check if default device exists
      try {
        await fs.access(this.defaultDevice);
        return [{
          device: this.defaultDevice,
          name: 'Default Camera',
          capabilities: ['capture'],
          resolutions: ['640x480', '1280x720', '1920x1080']
        }];
      } catch {
        return [];
      }
    }
  }

  /**
   * Get webcam capabilities
   */
  private async getCapabilities(device: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`v4l2-ctl --device=${device} --all`);
      const capabilities = [];
      
      if (stdout.includes('Video Capture')) capabilities.push('capture');
      if (stdout.includes('Streaming')) capabilities.push('streaming');
      if (stdout.includes('Extended Pix Format')) capabilities.push('extended');
      
      return capabilities;
    } catch {
      return ['capture'];
    }
  }

  /**
   * Get supported resolutions
   */
  private async getSupportedResolutions(device: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `v4l2-ctl --device=${device} --list-framesizes=MJPG`
      );
      
      const resolutions: string[] = [];
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const match = line.match(/(\d+)x(\d+)/);
        if (match) {
          resolutions.push(`${match[1]}x${match[2]}`);
        }
      }
      
      // Add common resolutions if none found
      if (resolutions.length === 0) {
        return ['640x480', '1280x720', '1920x1080'];
      }
      
      return resolutions;
    } catch {
      return ['640x480', '1280x720', '1920x1080'];
    }
  }

  /**
   * Capture image from webcam using fswebcam
   */
  async captureImage(
    filename: string,
    options: CaptureOptions = {}
  ): Promise<{ path: string; size: number }> {
    const device = options.device || this.defaultDevice;
    const resolution = options.resolution || '1920x1080';
    const quality = options.quality || 95;
    const format = options.format || 'jpeg';
    
    // Build fswebcam command
    const args = [
      '-d', device,
      '-r', resolution,
      '--jpeg', quality.toString(),
      '--no-banner',
      '--no-timestamp',
      '--no-overlay',
      '--no-title',
      '--no-info',
      '--no-underlay'
    ];
    
    // Add optional parameters
    if (options.brightness !== undefined) {
      args.push('--set', `brightness=${options.brightness}`);
    }
    if (options.contrast !== undefined) {
      args.push('--set', `contrast=${options.contrast}`);
    }
    if (options.saturation !== undefined) {
      args.push('--set', `saturation=${options.saturation}`);
    }
    
    // Skip frames to allow camera to adjust
    if (options.skipFrames) {
      args.push('--skip', options.skipFrames.toString());
    } else {
      args.push('--skip', '10'); // Default: skip first 10 frames
    }
    
    // Output file
    args.push(filename);
    
    try {
      await execAsync(`fswebcam ${args.join(' ')}`);
      
      // Verify file was created
      const stats = await fs.stat(filename);
      
      return {
        path: filename,
        size: stats.size
      };
    } catch (error) {
      this.logger.error('Failed to capture image:', error);
      throw error;
    }
  }

  /**
   * Capture using v4l2 (alternative method)
   */
  async captureWithV4l2(
    filename: string,
    options: CaptureOptions = {}
  ): Promise<{ path: string; size: number }> {
    const device = options.device || this.defaultDevice;
    const resolution = options.resolution || '1920x1080';
    const [width, height] = resolution.split('x');
    
    try {
      // Capture raw frame
      const rawFile = `/tmp/capture_${Date.now()}.raw`;
      await execAsync(
        `v4l2-ctl --device=${device} --stream-mmap --stream-to=${rawFile} --stream-count=1`
      );
      
      // Convert to JPEG using ffmpeg
      await execAsync(
        `ffmpeg -f rawvideo -pixel_format yuyv422 -video_size ${width}x${height} -i ${rawFile} -q:v ${options.quality || 2} ${filename}`
      );
      
      // Clean up raw file
      await fs.unlink(rawFile).catch(() => {});
      
      const stats = await fs.stat(filename);
      return {
        path: filename,
        size: stats.size
      };
    } catch (error) {
      this.logger.error('Failed to capture with v4l2:', error);
      throw error;
    }
  }

  /**
   * Start MJPEG stream from webcam
   */
  startStream(
    device: string = this.defaultDevice,
    port: number = 8080,
    options: CaptureOptions = {}
  ): void {
    if (this.streamProcess) {
      this.stopStream();
    }

    const resolution = options.resolution || '1280x720';
    const fps = '30';
    
    // Use mjpg-streamer for efficient streaming
    const args = [
      '-i', `input_uvc.so -d ${device} -r ${resolution} -f ${fps}`,
      '-o', `output_http.so -p ${port} -w /usr/share/mjpg-streamer/www`
    ];
    
    this.streamProcess = spawn('mjpg-streamer', args);
    
    this.streamProcess.stdout.on('data', (data: Buffer) => {
      this.logger.debug(`Stream: ${data.toString()}`);
    });
    
    this.streamProcess.stderr.on('data', (data: Buffer) => {
      this.logger.error(`Stream error: ${data.toString()}`);
    });
    
    this.streamProcess.on('close', (code: number) => {
      this.logger.debug(`Stream process exited with code ${code}`);
      this.streamProcess = null;
    });
    
    this.logger.log(`Started MJPEG stream on port ${port}`);
  }

  /**
   * Stop MJPEG stream
   */
  stopStream(): void {
    if (this.streamProcess) {
      this.streamProcess.kill('SIGTERM');
      this.streamProcess = null;
      this.logger.log('Stopped MJPEG stream');
    }
  }

  /**
   * Get webcam controls (brightness, contrast, etc.)
   */
  async getControls(device: string = this.defaultDevice): Promise<any> {
    try {
      const { stdout } = await execAsync(`v4l2-ctl --device=${device} --list-ctrls`);
      const controls: any = {};
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/(\w+)\s+.*?:\s+min=(-?\d+)\s+max=(-?\d+).*?default=(-?\d+)\s+value=(-?\d+)/);
        if (match) {
          controls[match[1]] = {
            min: parseInt(match[2]),
            max: parseInt(match[3]),
            default: parseInt(match[4]),
            current: parseInt(match[5])
          };
        }
      }
      
      return controls;
    } catch (error) {
      this.logger.error('Failed to get controls:', error);
      return {};
    }
  }

  /**
   * Set webcam control value
   */
  async setControl(
    control: string,
    value: number,
    device: string = this.defaultDevice
  ): Promise<void> {
    try {
      await execAsync(`v4l2-ctl --device=${device} --set-ctrl=${control}=${value}`);
      this.logger.debug(`Set ${control} to ${value} on ${device}`);
    } catch (error) {
      this.logger.error(`Failed to set control ${control}:`, error);
      throw error;
    }
  }

  /**
   * Reset all controls to default
   */
  async resetControls(device: string = this.defaultDevice): Promise<void> {
    try {
      const controls = await this.getControls(device);
      
      for (const [name, config] of Object.entries(controls)) {
        if (typeof config === 'object' && 'default' in config) {
          await this.setControl(name, (config as any).default, device);
        }
      }
      
      this.logger.log('Reset all controls to default');
    } catch (error) {
      this.logger.error('Failed to reset controls:', error);
      throw error;
    }
  }

  /**
   * Check if webcam is available
   */
  async isAvailable(device: string = this.defaultDevice): Promise<boolean> {
    try {
      await fs.access(device);
      
      // Try to query device info
      const { stderr } = await execAsync(`v4l2-ctl --device=${device} --info`);
      
      // If there's an error mentioning "busy", device is in use
      if (stderr && stderr.includes('busy')) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Install required tools (for setup)
   */
  async checkDependencies(): Promise<{ installed: string[]; missing: string[] }> {
    const tools = ['fswebcam', 'v4l2-ctl', 'ffmpeg', 'mjpg-streamer'];
    const installed: string[] = [];
    const missing: string[] = [];
    
    for (const tool of tools) {
      try {
        await execAsync(`which ${tool}`);
        installed.push(tool);
      } catch {
        missing.push(tool);
      }
    }
    
    if (missing.length > 0) {
      this.logger.warn(`Missing tools: ${missing.join(', ')}`);
      this.logger.log('Install with: sudo apt-get install fswebcam v4l-utils ffmpeg mjpg-streamer');
    }
    
    return { installed, missing };
  }
}