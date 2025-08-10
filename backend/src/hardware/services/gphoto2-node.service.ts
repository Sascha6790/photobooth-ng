import { Injectable, Logger } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface CameraInfo {
  model: string;
  port: string;
  abilities: string[];
}

export interface CaptureResult {
  filename: string;
  path: string;
  size: number;
}

@Injectable()
export class GPhoto2NodeService {
  private readonly logger = new Logger(GPhoto2NodeService.name);
  private isLocked = false;
  private currentProcess: any = null;

  /**
   * Detect connected cameras
   */
  async detectCameras(): Promise<CameraInfo[]> {
    try {
      const { stdout } = await execAsync('gphoto2 --auto-detect');
      const lines = stdout.split('\n').slice(2); // Skip header lines
      
      const cameras: CameraInfo[] = [];
      for (const line of lines) {
        const match = line.match(/^(.+?)\s+(usb:\d+,\d+)/);
        if (match) {
          cameras.push({
            model: match[1].trim(),
            port: match[2],
            abilities: await this.getCameraAbilities(match[2])
          });
        }
      }
      
      return cameras;
    } catch (error) {
      this.logger.error('Failed to detect cameras:', error);
      return [];
    }
  }

  /**
   * Get camera abilities/features
   */
  private async getCameraAbilities(port: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`gphoto2 --port ${port} --abilities`);
      const abilities = [];
      
      if (stdout.includes('capture')) abilities.push('capture');
      if (stdout.includes('preview')) abilities.push('preview');
      if (stdout.includes('config')) abilities.push('config');
      
      return abilities;
    } catch {
      return [];
    }
  }

  /**
   * Capture image from camera
   */
  async captureImage(options: {
    filename?: string;
    downloadPath?: string;
    keepOnCamera?: boolean;
  } = {}): Promise<CaptureResult> {
    if (this.isLocked) {
      throw new Error('Camera is busy');
    }

    this.isLocked = true;
    
    try {
      const filename = options.filename || `photo_${Date.now()}.jpg`;
      const downloadPath = options.downloadPath || '/tmp';
      const fullPath = path.join(downloadPath, filename);
      
      // Build gphoto2 command
      let command = 'gphoto2 --capture-image-and-download';
      command += ` --filename="${fullPath}"`;
      
      if (!options.keepOnCamera) {
        command += ' --no-keep';
      }
      
      this.logger.debug(`Executing: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000 // 30 second timeout
      });
      
      if (stderr && !stderr.includes('New file')) {
        this.logger.warn(`gphoto2 stderr: ${stderr}`);
      }
      
      // Verify file was created
      const stats = await fs.stat(fullPath);
      
      return {
        filename,
        path: fullPath,
        size: stats.size
      };
    } catch (error) {
      this.logger.error('Capture failed:', error);
      throw error;
    } finally {
      this.isLocked = false;
    }
  }

  /**
   * Start live preview stream
   */
  startPreview(callback: (data: Buffer) => void): void {
    if (this.currentProcess) {
      this.stopPreview();
    }

    this.currentProcess = spawn('gphoto2', [
      '--capture-movie',
      '--stdout'
    ]);

    this.currentProcess.stdout.on('data', (data: Buffer) => {
      callback(data);
    });

    this.currentProcess.stderr.on('data', (data: Buffer) => {
      this.logger.error(`Preview error: ${data.toString()}`);
    });

    this.currentProcess.on('close', (code: number) => {
      this.logger.debug(`Preview process exited with code ${code}`);
      this.currentProcess = null;
    });
  }

  /**
   * Stop live preview
   */
  stopPreview(): void {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }
  }

  /**
   * Get camera configuration
   */
  async getConfig(setting?: string): Promise<any> {
    try {
      const command = setting 
        ? `gphoto2 --get-config ${setting}`
        : 'gphoto2 --list-config';
        
      const { stdout } = await execAsync(command);
      
      if (setting) {
        return this.parseConfigOutput(stdout);
      } else {
        return stdout.split('\n').filter(line => line.trim());
      }
    } catch (error) {
      this.logger.error('Failed to get config:', error);
      throw error;
    }
  }

  /**
   * Set camera configuration
   */
  async setConfig(setting: string, value: string): Promise<void> {
    try {
      await execAsync(`gphoto2 --set-config ${setting}="${value}"`);
      this.logger.debug(`Set ${setting} to ${value}`);
    } catch (error) {
      this.logger.error(`Failed to set config ${setting}:`, error);
      throw error;
    }
  }

  /**
   * Common camera settings shortcuts
   */
  async setISO(value: string): Promise<void> {
    await this.setConfig('iso', value);
  }

  async setAperture(value: string): Promise<void> {
    await this.setConfig('aperture', value);
  }

  async setShutterSpeed(value: string): Promise<void> {
    await this.setConfig('shutterspeed', value);
  }

  async setWhiteBalance(value: string): Promise<void> {
    await this.setConfig('whitebalance', value);
  }

  async setImageQuality(value: 'raw' | 'fine' | 'normal'): Promise<void> {
    await this.setConfig('imagequality', value);
  }

  /**
   * Trigger autofocus
   */
  async autofocus(): Promise<void> {
    try {
      await execAsync('gphoto2 --set-config autofocusdrive=1');
      // Wait for focus to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      this.logger.error('Autofocus failed:', error);
      throw error;
    }
  }

  /**
   * Reset camera (useful if camera gets stuck)
   */
  async reset(): Promise<void> {
    try {
      await execAsync('gphoto2 --reset');
      this.logger.log('Camera reset successful');
    } catch (error) {
      this.logger.error('Camera reset failed:', error);
      throw error;
    }
  }

  /**
   * Get battery level
   */
  async getBatteryLevel(): Promise<number> {
    try {
      const { stdout } = await execAsync('gphoto2 --get-config batterylevel');
      const match = stdout.match(/Current: (\d+)%/);
      return match ? parseInt(match[1]) : -1;
    } catch {
      return -1;
    }
  }

  /**
   * List files on camera
   */
  async listFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('gphoto2 --list-files');
      const files = [];
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const match = line.match(/#\d+\s+(.+?)\s+\d+/);
        if (match) {
          files.push(match[1]);
        }
      }
      
      return files;
    } catch (error) {
      this.logger.error('Failed to list files:', error);
      return [];
    }
  }

  /**
   * Download file from camera
   */
  async downloadFile(filename: string, destination: string): Promise<void> {
    try {
      await execAsync(`gphoto2 --get-file ${filename} --filename ${destination}`);
      this.logger.debug(`Downloaded ${filename} to ${destination}`);
    } catch (error) {
      this.logger.error(`Failed to download ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Delete file from camera
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      await execAsync(`gphoto2 --delete-file ${filename}`);
      this.logger.debug(`Deleted ${filename} from camera`);
    } catch (error) {
      this.logger.error(`Failed to delete ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Delete all files from camera
   */
  async deleteAllFiles(): Promise<void> {
    try {
      await execAsync('gphoto2 --delete-all-files');
      this.logger.log('Deleted all files from camera');
    } catch (error) {
      this.logger.error('Failed to delete all files:', error);
      throw error;
    }
  }

  /**
   * Parse config output to structured object
   */
  private parseConfigOutput(output: string): any {
    const result: any = {};
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('Label:')) {
        result.label = line.split('Label:')[1].trim();
      } else if (line.includes('Type:')) {
        result.type = line.split('Type:')[1].trim();
      } else if (line.includes('Current:')) {
        result.current = line.split('Current:')[1].trim();
      } else if (line.includes('Choice:')) {
        if (!result.choices) result.choices = [];
        const choice = line.split('Choice:')[1].trim();
        result.choices.push(choice);
      }
    }
    
    return result;
  }

  /**
   * Kill any stuck gphoto2 processes
   */
  async killStuckProcesses(): Promise<void> {
    try {
      await execAsync('pkill -f gphoto2');
      this.logger.log('Killed stuck gphoto2 processes');
    } catch {
      // Process might not exist, that's okay
    }
  }

  /**
   * Check if gphoto2 is installed
   */
  async checkInstallation(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('gphoto2 --version');
      this.logger.log(`gphoto2 version: ${stdout.split('\n')[0]}`);
      return true;
    } catch {
      this.logger.error('gphoto2 is not installed');
      return false;
    }
  }
}