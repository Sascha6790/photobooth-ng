import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as Joi from 'joi';
import { FileService } from '../services/file.service';
import { ValidationService } from '../services/validation.service';

export interface PhotoboothConfig {
  app: {
    name: string;
    version: string;
    environment: string;
    port: number;
    debug: boolean;
    logLevel: string;
  };
  paths: {
    data: string;
    images: string;
    thumbs: string;
    tmp: string;
    qr: string;
    frames: string;
    backgrounds: string;
    config: string;
  };
  camera: {
    mode: 'gphoto2' | 'webcam' | 'mock' | 'raspistill';
    countdown: number;
    previewFromCam: boolean;
    previewWidth: number;
    previewHeight: number;
    captureDelay: number;
    takePicAgainTimer: number;
    pictureRotation: number;
  };
  collage: {
    enabled: boolean;
    limit: number;
    placeholder: string;
    placeholderPosition: string;
    backgroundColor: string;
    layout: string;
    resolution: {
      width: number;
      height: number;
    };
  };
  print: {
    enabled: boolean;
    printerName: string;
    autoPrint: boolean;
    printQRCode: boolean;
    printFrame: boolean;
    copies: number;
    printDelay: number;
    maxPrintAttempts: number;
  };
  mail: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      password: string;
    };
    from: string;
    subject: string;
  };
  gallery: {
    enabled: boolean;
    newest_first: boolean;
    use_thumbnails: boolean;
    scrollbar: boolean;
    show_date: boolean;
    date_format: string;
    db_file: string;
    auto_reload: number;
  };
  keying: {
    enabled: boolean;
    variant: 'marvinj' | 'chroma';
    background_path: string;
    show_all_backgrounds: boolean;
    tolerance: number;
  };
  ui: {
    style: 'modern' | 'classic' | 'custom';
    show_fork: boolean;
    flip_camera: boolean;
    show_instructions: boolean;
    logo: {
      enabled: boolean;
      path: string;
      position: string;
    };
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
  };
  sound: {
    enabled: boolean;
    voice: 'man' | 'woman';
    language: string;
    countdown_enabled: boolean;
    cheese_enabled: boolean;
  };
  qr: {
    enabled: boolean;
    url: string;
    append_filename: boolean;
    custom_text: string;
    size: number;
  };
  remoteStorage: {
    enabled: boolean;
    type: 'ftp' | 'sftp' | 's3';
    host: string;
    port: number;
    user: string;
    password: string;
    path: string;
  };
  gpio: {
    enabled: boolean;
    buzzer_pin: number;
    print_pin: number;
    collage_pin: number;
    shutdown_pin: number;
    photo_pin: number;
  };
  admin: {
    enabled: boolean;
    password: string;
    pin: string;
    protect_admin: boolean;
    protect_gallery: boolean;
    protect_manual: boolean;
  };
  language: {
    default: string;
    available: string[];
    force: boolean;
  };
}

@Injectable()
export class ConfigurationService implements OnModuleInit {
  private config: PhotoboothConfig;
  private configPath: string;
  
  constructor(
    private readonly configService: ConfigService,
    private readonly fileService: FileService,
    private readonly validationService: ValidationService,
  ) {
    this.configPath = path.join(
      process.cwd(),
      'config',
      `photobooth.${process.env.NODE_ENV || 'development'}.json`
    );
  }
  
  async onModuleInit() {
    await this.loadConfiguration();
  }
  
  /**
   * Load configuration from file and environment variables
   */
  private async loadConfiguration(): Promise<void> {
    // Try to load from file first
    let fileConfig = {};
    try {
      const configExists = await this.fileService.exists(this.configPath);
      if (configExists) {
        const configContent = await fs.readFile(this.configPath, 'utf-8');
        fileConfig = JSON.parse(configContent);
      }
    } catch (error) {
      console.warn(`Could not load config from ${this.configPath}:`, error.message);
    }
    
    // Merge with environment variables (env vars have priority)
    this.config = this.buildConfig(fileConfig);
    
    // Validate the final configuration
    const validationResult = this.validationService.validate(
      this.config,
      this.getConfigSchema()
    );
    
    if (!validationResult.isValid) {
      throw new Error(
        `Configuration validation failed: ${validationResult.errors.join(', ')}`
      );
    }
  }
  
  /**
   * Build configuration object from file config and environment variables
   */
  private buildConfig(fileConfig: any): PhotoboothConfig {
    const env = this.configService;
    
    return {
      app: {
        name: fileConfig?.app?.name || 'Photobooth',
        version: fileConfig?.app?.version || '5.0.0',
        environment: env.get('NODE_ENV', 'development'),
        port: env.get('PORT', fileConfig?.app?.port || 3000),
        debug: env.get('DEBUG', fileConfig?.app?.debug || false),
        logLevel: env.get('LOG_LEVEL', fileConfig?.app?.logLevel || 'info'),
      },
      paths: {
        data: env.get('DATA_DIR', fileConfig?.paths?.data || 'data'),
        images: env.get('IMAGES_DIR', fileConfig?.paths?.images || 'data/images'),
        thumbs: env.get('THUMBS_DIR', fileConfig?.paths?.thumbs || 'data/thumbs'),
        tmp: env.get('TMP_DIR', fileConfig?.paths?.tmp || 'data/tmp'),
        qr: env.get('QR_DIR', fileConfig?.paths?.qr || 'data/qrcodes'),
        frames: env.get('FRAMES_DIR', fileConfig?.paths?.frames || 'resources/img/frames'),
        backgrounds: env.get('BACKGROUNDS_DIR', fileConfig?.paths?.backgrounds || 'resources/img/background'),
        config: fileConfig?.paths?.config || 'config',
      },
      camera: {
        mode: env.get('CAMERA_MODE', fileConfig?.camera?.mode || 'mock'),
        countdown: fileConfig?.camera?.countdown || 5,
        previewFromCam: fileConfig?.camera?.previewFromCam || false,
        previewWidth: fileConfig?.camera?.previewWidth || 1280,
        previewHeight: fileConfig?.camera?.previewHeight || 720,
        captureDelay: fileConfig?.camera?.captureDelay || 1000,
        takePicAgainTimer: fileConfig?.camera?.takePicAgainTimer || 90,
        pictureRotation: fileConfig?.camera?.pictureRotation || 0,
      },
      collage: {
        enabled: fileConfig?.collage?.enabled || false,
        limit: fileConfig?.collage?.limit || 4,
        placeholder: fileConfig?.collage?.placeholder || '',
        placeholderPosition: fileConfig?.collage?.placeholderPosition || 'center',
        backgroundColor: fileConfig?.collage?.backgroundColor || '#ffffff',
        layout: fileConfig?.collage?.layout || '2x2',
        resolution: {
          width: fileConfig?.collage?.resolution?.width || 1920,
          height: fileConfig?.collage?.resolution?.height || 1280,
        },
      },
      print: {
        enabled: env.get('PRINT_ENABLED', fileConfig?.print?.enabled || false),
        printerName: env.get('PRINTER_NAME', fileConfig?.print?.printerName || ''),
        autoPrint: fileConfig?.print?.autoPrint || false,
        printQRCode: fileConfig?.print?.printQRCode || false,
        printFrame: fileConfig?.print?.printFrame || false,
        copies: fileConfig?.print?.copies || 1,
        printDelay: fileConfig?.print?.printDelay || 1000,
        maxPrintAttempts: fileConfig?.print?.maxPrintAttempts || 3,
      },
      mail: {
        enabled: env.get('MAIL_ENABLED', fileConfig?.mail?.enabled || false),
        host: env.get('MAIL_HOST', fileConfig?.mail?.host || ''),
        port: env.get('MAIL_PORT', fileConfig?.mail?.port || 587),
        secure: env.get('MAIL_SECURE', fileConfig?.mail?.secure || false),
        auth: {
          user: env.get('MAIL_USER', fileConfig?.mail?.auth?.user || ''),
          password: env.get('MAIL_PASSWORD', fileConfig?.mail?.auth?.password || ''),
        },
        from: fileConfig?.mail?.from || '',
        subject: fileConfig?.mail?.subject || 'Your Photobooth Picture',
      },
      gallery: {
        enabled: fileConfig?.gallery?.enabled ?? true,
        newest_first: fileConfig?.gallery?.newest_first ?? true,
        use_thumbnails: fileConfig?.gallery?.use_thumbnails ?? true,
        scrollbar: fileConfig?.gallery?.scrollbar ?? false,
        show_date: fileConfig?.gallery?.show_date ?? false,
        date_format: fileConfig?.gallery?.date_format || 'd.m.Y - G:i',
        db_file: fileConfig?.gallery?.db_file || 'data/images.json',
        auto_reload: fileConfig?.gallery?.auto_reload || 30000,
      },
      keying: {
        enabled: fileConfig?.keying?.enabled || false,
        variant: fileConfig?.keying?.variant || 'marvinj',
        background_path: fileConfig?.keying?.background_path || '',
        show_all_backgrounds: fileConfig?.keying?.show_all_backgrounds || true,
        tolerance: fileConfig?.keying?.tolerance || 10,
      },
      ui: {
        style: fileConfig?.ui?.style || 'modern',
        show_fork: fileConfig?.ui?.show_fork ?? true,
        flip_camera: fileConfig?.ui?.flip_camera || false,
        show_instructions: fileConfig?.ui?.show_instructions ?? true,
        logo: {
          enabled: fileConfig?.ui?.logo?.enabled || false,
          path: fileConfig?.ui?.logo?.path || '',
          position: fileConfig?.ui?.logo?.position || 'bottom-right',
        },
        colors: {
          primary: fileConfig?.ui?.colors?.primary || '#1a73e8',
          secondary: fileConfig?.ui?.colors?.secondary || '#ea4335',
          accent: fileConfig?.ui?.colors?.accent || '#fbbc04',
          background: fileConfig?.ui?.colors?.background || '#ffffff',
        },
      },
      sound: {
        enabled: fileConfig?.sound?.enabled ?? true,
        voice: fileConfig?.sound?.voice || 'man',
        language: fileConfig?.sound?.language || 'en',
        countdown_enabled: fileConfig?.sound?.countdown_enabled ?? true,
        cheese_enabled: fileConfig?.sound?.cheese_enabled ?? true,
      },
      qr: {
        enabled: fileConfig?.qr?.enabled || false,
        url: fileConfig?.qr?.url || '',
        append_filename: fileConfig?.qr?.append_filename ?? true,
        custom_text: fileConfig?.qr?.custom_text || '',
        size: fileConfig?.qr?.size || 200,
      },
      remoteStorage: {
        enabled: env.get('REMOTE_STORAGE_ENABLED', fileConfig?.remoteStorage?.enabled || false),
        type: env.get('REMOTE_STORAGE_TYPE', fileConfig?.remoteStorage?.type || 'ftp'),
        host: env.get('REMOTE_STORAGE_HOST', fileConfig?.remoteStorage?.host || ''),
        port: fileConfig?.remoteStorage?.port || 21,
        user: env.get('REMOTE_STORAGE_USER', fileConfig?.remoteStorage?.user || ''),
        password: env.get('REMOTE_STORAGE_PASSWORD', fileConfig?.remoteStorage?.password || ''),
        path: env.get('REMOTE_STORAGE_PATH', fileConfig?.remoteStorage?.path || '/'),
      },
      gpio: {
        enabled: env.get('GPIO_ENABLED', fileConfig?.gpio?.enabled || false),
        buzzer_pin: env.get('GPIO_BUZZER_PIN', fileConfig?.gpio?.buzzer_pin || 17),
        print_pin: env.get('GPIO_PRINT_PIN', fileConfig?.gpio?.print_pin || 22),
        collage_pin: env.get('GPIO_COLLAGE_PIN', fileConfig?.gpio?.collage_pin || 27),
        shutdown_pin: fileConfig?.gpio?.shutdown_pin || 24,
        photo_pin: fileConfig?.gpio?.photo_pin || 23,
      },
      admin: {
        enabled: fileConfig?.admin?.enabled ?? true,
        password: env.get('ADMIN_PASSWORD', fileConfig?.admin?.password || ''),
        pin: env.get('ADMIN_PIN', fileConfig?.admin?.pin || ''),
        protect_admin: fileConfig?.admin?.protect_admin || false,
        protect_gallery: fileConfig?.admin?.protect_gallery || false,
        protect_manual: fileConfig?.admin?.protect_manual || false,
      },
      language: {
        default: env.get('DEFAULT_LANGUAGE', fileConfig?.language?.default || 'en'),
        available: fileConfig?.language?.available || ['en', 'de', 'fr', 'es'],
        force: fileConfig?.language?.force || false,
      },
    };
  }
  
  /**
   * Get Joi schema for configuration validation
   */
  private getConfigSchema(): Joi.ObjectSchema {
    return Joi.object({
      app: Joi.object({
        name: Joi.string().required(),
        version: Joi.string().required(),
        environment: Joi.string().valid('development', 'production', 'test', 'docker', 'staging').required(),
        port: Joi.number().port().required(),
        debug: Joi.boolean().required(),
        logLevel: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose').required(),
      }).required(),
      paths: Joi.object({
        data: Joi.string().required(),
        images: Joi.string().required(),
        thumbs: Joi.string().required(),
        tmp: Joi.string().required(),
        qr: Joi.string().required(),
        frames: Joi.string().required(),
        backgrounds: Joi.string().required(),
        config: Joi.string().required(),
      }).required(),
      camera: Joi.object({
        mode: Joi.string().valid('gphoto2', 'webcam', 'mock', 'raspistill').required(),
        countdown: Joi.number().min(0).max(30).required(),
        previewFromCam: Joi.boolean().required(),
        previewWidth: Joi.number().min(320).required(),
        previewHeight: Joi.number().min(240).required(),
        captureDelay: Joi.number().min(0).required(),
        takePicAgainTimer: Joi.number().min(0).required(),
        pictureRotation: Joi.number().valid(0, 90, 180, 270).required(),
      }).required(),
      // ... weitere Schema-Definitionen für alle Konfigurationsbereiche
    }).unknown(true); // Allow additional properties for flexibility
  }
  
  /**
   * Get the complete configuration
   */
  get(): PhotoboothConfig {
    return this.config;
  }
  
  /**
   * Get a specific configuration value by path
   */
  getValue<T = any>(path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let value: any = this.config;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        return defaultValue as T;
      }
    }
    
    return value as T;
  }
  
  /**
   * Update configuration and save to file
   */
  async update(updates: Partial<PhotoboothConfig>): Promise<void> {
    // Deep merge updates with existing config
    this.config = this.deepMerge(this.config, updates);
    
    // Validate updated configuration
    const validationResult = this.validationService.validate(
      this.config,
      this.getConfigSchema()
    );
    
    if (!validationResult.isValid) {
      throw new Error(
        `Configuration validation failed: ${validationResult.errors.join(', ')}`
      );
    }
    
    // Save to file
    await this.saveConfiguration();
  }
  
  /**
   * Save current configuration to file
   */
  private async saveConfiguration(): Promise<void> {
    try {
      await this.fileService.ensureDir(path.dirname(this.configPath));
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }
  
  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
  
  /**
   * Check if value is an object
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
  
  /**
   * Migrate configuration from PHP format
   */
  async migrateFromPhp(phpConfigPath: string): Promise<void> {
    // This method would handle migration from PHP array format to JSON
    // Implementation would depend on the specific PHP config structure
    throw new Error('PHP migration not yet implemented');
  }
}