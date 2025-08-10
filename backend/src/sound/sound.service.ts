import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export interface SoundConfig {
  enabled: boolean;
  voice: 'man' | 'woman' | 'custom';
  locale: string;
  fallbackEnabled: boolean;
  volume: number;
  player: 'auto' | 'afplay' | 'aplay' | 'paplay' | 'mpg123' | 'vlc' | 'mplayer';
  customSoundsPath?: string;
}

export interface SoundFile {
  name: string;
  path: string | null;
  duration?: number;
  exists: boolean;
}

export enum SoundType {
  COUNTER_1 = 'counter-1',
  COUNTER_2 = 'counter-2',
  COUNTER_3 = 'counter-3',
  COUNTER_4 = 'counter-4',
  COUNTER_5 = 'counter-5',
  COUNTER_6 = 'counter-6',
  COUNTER_7 = 'counter-7',
  COUNTER_8 = 'counter-8',
  COUNTER_9 = 'counter-9',
  COUNTER_10 = 'counter-10',
  CHEESE = 'cheese',
  SHUTTER = 'shutter',
  SUCCESS = 'success',
  ERROR = 'error',
  PRINT = 'print',
}

@Injectable()
export class SoundService implements OnModuleInit {
  private readonly logger = new Logger(SoundService.name);
  private soundConfig: SoundConfig;
  private soundFiles: Map<string, SoundFile> = new Map();
  private currentProcess: any = null;
  private soundPlayer: string | null = null;
  private resourcesPath: string;
  private customSoundsPath: string;

  constructor(private configService: ConfigService) {
    this.resourcesPath = path.join(process.cwd(), 'resources', 'sounds');
    this.customSoundsPath = path.join(process.cwd(), 'private', 'sounds');
  }

  async onModuleInit() {
    await this.initialize();
  }

  async initialize() {
    // Load configuration
    this.soundConfig = {
      enabled: this.configService.get<boolean>('sound.enabled', true),
      voice: this.configService.get<'man' | 'woman' | 'custom'>('sound.voice', 'man'),
      locale: this.configService.get<string>('ui.language', 'en'),
      fallbackEnabled: this.configService.get<boolean>('sound.fallback_enabled', true),
      volume: this.configService.get<number>('sound.volume', 100),
      player: this.configService.get<'auto' | 'afplay' | 'aplay' | 'paplay' | 'mpg123' | 'vlc' | 'mplayer'>('sound.player', 'auto'),
      customSoundsPath: this.configService.get<string>('sound.custom_path'),
    };

    if (this.soundConfig.customSoundsPath) {
      this.customSoundsPath = this.soundConfig.customSoundsPath;
    }

    // Detect sound player
    if (this.soundConfig.player === 'auto') {
      this.soundPlayer = await this.detectSoundPlayer();
    } else {
      this.soundPlayer = this.soundConfig.player;
    }

    // Load sound files
    await this.loadSoundFiles();

    this.logger.log(`Sound service initialized with player: ${this.soundPlayer}`);
  }

  /**
   * Detect available sound player on the system
   */
  private async detectSoundPlayer(): Promise<string | null> {
    const players = [
      { name: 'afplay', platforms: ['darwin'] }, // macOS
      { name: 'aplay', platforms: ['linux'] },   // Linux ALSA
      { name: 'paplay', platforms: ['linux'] },  // Linux PulseAudio
      { name: 'mpg123', platforms: ['linux', 'darwin', 'win32'] },
      { name: 'vlc', platforms: ['linux', 'darwin', 'win32'] },
      { name: 'mplayer', platforms: ['linux', 'darwin'] },
    ];

    const platform = process.platform;

    for (const player of players) {
      if (!player.platforms.includes(platform)) {
        continue;
      }

      try {
        await execAsync(`which ${player.name}`);
        this.logger.log(`Found sound player: ${player.name}`);
        return player.name;
      } catch {
        // Player not found, try next
      }
    }

    // Windows fallback - use PowerShell
    if (platform === 'win32') {
      return 'powershell';
    }

    this.logger.warn('No sound player found on system');
    return null;
  }

  /**
   * Load all sound files
   */
  private async loadSoundFiles() {
    const soundTypes = Object.values(SoundType);
    
    for (const soundType of soundTypes) {
      const filePath = await this.findSoundFile(soundType);
      this.soundFiles.set(soundType, {
        name: soundType,
        path: filePath,
        exists: !!filePath,
      });
    }

    this.logger.log(`Loaded ${this.soundFiles.size} sound files`);
  }

  /**
   * Find sound file in directories
   */
  private async findSoundFile(name: string): Promise<string | null> {
    const directories: string[] = [];
    
    // Priority 1: Custom sounds
    if (this.soundConfig.voice === 'custom') {
      directories.push(this.customSoundsPath);
    } else {
      // Priority 2: Voice + Locale specific
      directories.push(
        path.join(this.resourcesPath, this.soundConfig.voice, this.soundConfig.locale)
      );
      
      // Priority 3: Voice + English fallback
      if (this.soundConfig.fallbackEnabled && this.soundConfig.locale !== 'en') {
        directories.push(
          path.join(this.resourcesPath, this.soundConfig.voice, 'en')
        );
      }
    }
    
    // Priority 4: Default fallback (man/en)
    if (this.soundConfig.fallbackEnabled) {
      directories.push(path.join(this.resourcesPath, 'man', 'en'));
    }

    // Search for file in directories
    for (const dir of directories) {
      if (!existsSync(dir)) {
        continue;
      }

      const extensions = ['.mp3', '.wav', '.ogg', '.m4a'];
      for (const ext of extensions) {
        const filePath = path.join(dir, `${name}${ext}`);
        if (existsSync(filePath)) {
          return filePath;
        }
      }
    }

    this.logger.warn(`Sound file not found: ${name}`);
    return null;
  }

  /**
   * Play a sound file
   */
  async play(soundType: SoundType | string, options?: { volume?: number; loop?: boolean }): Promise<void> {
    if (!this.soundConfig.enabled) {
      this.logger.debug('Sound is disabled');
      return;
    }

    if (!this.soundPlayer) {
      this.logger.warn('No sound player available');
      return;
    }

    const soundFile = this.soundFiles.get(soundType);
    if (!soundFile || !soundFile.path) {
      this.logger.warn(`Sound file not found: ${soundType}`);
      return;
    }

    const volume = options?.volume ?? this.soundConfig.volume;
    const loop = options?.loop ?? false;

    try {
      await this.stop(); // Stop any current sound
      
      const command = this.buildPlayCommand(soundFile.path, volume, loop);
      this.logger.debug(`Playing sound: ${soundFile.path} with command: ${command}`);
      
      this.currentProcess = exec(command, (error, stdout, stderr) => {
        if (error && !error.killed) {
          this.logger.error(`Error playing sound: ${error.message}`);
        }
        this.currentProcess = null;
      });
    } catch (error) {
      this.logger.error(`Failed to play sound: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build platform-specific play command
   */
  private buildPlayCommand(filePath: string, volume: number, loop: boolean): string {
    const volumePercent = Math.min(100, Math.max(0, volume));
    
    switch (this.soundPlayer) {
      case 'afplay': // macOS
        let cmd = `afplay "${filePath}"`;
        if (volume !== 100) {
          cmd += ` -v ${volumePercent / 100}`;
        }
        return cmd;
        
      case 'aplay': // Linux ALSA
        return `aplay "${filePath}"`;
        
      case 'paplay': // Linux PulseAudio
        let paCmd = `paplay "${filePath}"`;
        if (volume !== 100) {
          paCmd += ` --volume ${Math.round((volumePercent / 100) * 65536)}`;
        }
        return paCmd;
        
      case 'mpg123':
        let mpgCmd = `mpg123`;
        if (volume !== 100) {
          mpgCmd += ` -f ${Math.round((volumePercent / 100) * 32768)}`;
        }
        if (loop) {
          mpgCmd += ' --loop -1';
        }
        mpgCmd += ` "${filePath}"`;
        return mpgCmd;
        
      case 'vlc':
        let vlcCmd = `vlc --intf dummy --play-and-exit`;
        if (volume !== 100) {
          vlcCmd += ` --gain ${volumePercent / 100}`;
        }
        if (loop) {
          vlcCmd += ' --loop';
        }
        vlcCmd += ` "${filePath}"`;
        return vlcCmd;
        
      case 'mplayer':
        let mplayerCmd = `mplayer`;
        if (volume !== 100) {
          mplayerCmd += ` -volume ${volumePercent}`;
        }
        if (loop) {
          mplayerCmd += ' -loop 0';
        }
        mplayerCmd += ` "${filePath}"`;
        return mplayerCmd;
        
      case 'powershell': // Windows
        return `powershell -c "(New-Object Media.SoundPlayer '${filePath}').PlaySync()"`;
        
      default:
        return `${this.soundPlayer} "${filePath}"`;
    }
  }

  /**
   * Stop current playing sound
   */
  async stop(): Promise<void> {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill();
        this.currentProcess = null;
        this.logger.debug('Stopped current sound');
      } catch (error) {
        this.logger.error(`Error stopping sound: ${error.message}`);
      }
    }
  }

  /**
   * Play countdown sequence
   */
  async playCountdown(seconds: number): Promise<void> {
    if (!this.soundConfig.enabled) {
      return;
    }

    for (let i = seconds; i > 0; i--) {
      const soundType = `counter-${i}` as SoundType;
      if (this.soundFiles.has(soundType)) {
        await this.play(soundType);
        await this.delay(1000); // Wait 1 second between counts
      }
    }
  }

  /**
   * Play cheese/shutter sound
   */
  async playCheese(): Promise<void> {
    await this.play(SoundType.CHEESE);
  }

  /**
   * Play shutter sound
   */
  async playShutter(): Promise<void> {
    await this.play(SoundType.SHUTTER);
  }

  /**
   * Play success sound
   */
  async playSuccess(): Promise<void> {
    await this.play(SoundType.SUCCESS);
  }

  /**
   * Play error sound
   */
  async playError(): Promise<void> {
    await this.play(SoundType.ERROR);
  }

  /**
   * Play print sound
   */
  async playPrint(): Promise<void> {
    await this.play(SoundType.PRINT);
  }

  /**
   * Get all available sound files
   */
  getAllSounds(): SoundFile[] {
    return Array.from(this.soundFiles.values());
  }

  /**
   * Get sound file info
   */
  getSoundInfo(soundType: SoundType | string): SoundFile | undefined {
    return this.soundFiles.get(soundType);
  }

  /**
   * Update sound configuration
   */
  async updateConfig(config: Partial<SoundConfig>): Promise<void> {
    this.soundConfig = { ...this.soundConfig, ...config };
    await this.loadSoundFiles(); // Reload files with new config
  }

  /**
   * Set volume (0-100)
   */
  setVolume(volume: number): void {
    this.soundConfig.volume = Math.min(100, Math.max(0, volume));
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.soundConfig.volume;
  }

  /**
   * Enable/disable sound
   */
  setEnabled(enabled: boolean): void {
    this.soundConfig.enabled = enabled;
    if (!enabled) {
      this.stop(); // Stop any playing sound
    }
  }

  /**
   * Check if sound is enabled
   */
  isEnabled(): boolean {
    return this.soundConfig.enabled;
  }

  /**
   * Upload custom sound file
   */
  async uploadCustomSound(soundType: string, filePath: string): Promise<void> {
    const targetDir = this.customSoundsPath;
    
    // Create directory if it doesn't exist
    await fs.mkdir(targetDir, { recursive: true });
    
    const ext = path.extname(filePath);
    const targetPath = path.join(targetDir, `${soundType}${ext}`);
    
    // Copy file to custom sounds directory
    await fs.copyFile(filePath, targetPath);
    
    // Reload this specific sound
    this.soundFiles.set(soundType, {
      name: soundType,
      path: targetPath,
      exists: true,
    });
    
    this.logger.log(`Uploaded custom sound: ${soundType}`);
  }

  /**
   * Delete custom sound file
   */
  async deleteCustomSound(soundType: string): Promise<void> {
    const soundFile = this.soundFiles.get(soundType);
    if (!soundFile || !soundFile.path) {
      throw new Error(`Sound file not found: ${soundType}`);
    }
    
    // Only allow deletion of custom sounds
    if (!soundFile.path.includes(this.customSoundsPath)) {
      throw new Error('Cannot delete non-custom sound files');
    }
    
    await fs.unlink(soundFile.path);
    
    // Reload to find fallback
    const newPath = await this.findSoundFile(soundType);
    this.soundFiles.set(soundType, {
      name: soundType,
      path: newPath,
      exists: !!newPath,
    });
    
    this.logger.log(`Deleted custom sound: ${soundType}`);
  }

  /**
   * Test sound system
   */
  async test(): Promise<boolean> {
    try {
      if (!this.soundPlayer) {
        return false;
      }
      
      // Try to play a short beep or the first available sound
      const testSound = this.soundFiles.get(SoundType.COUNTER_1);
      if (testSound && testSound.path) {
        await this.play(SoundType.COUNTER_1);
        await this.delay(500);
        await this.stop();
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Sound test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}