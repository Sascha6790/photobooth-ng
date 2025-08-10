import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConfigurationService, PhotoboothConfig } from './configuration.service';
import { FileService } from '../services/file.service';
import { ValidationService } from '../services/validation.service';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let configService: ConfigService;
  let fileService: FileService;
  let validationService: ValidationService;

  const mockFileConfig = {
    app: {
      name: 'Test Photobooth',
      version: '1.0.0',
      port: 3001,
      debug: true,
      logLevel: 'debug',
    },
    camera: {
      mode: 'mock',
      countdown: 3,
      previewFromCam: true,
    },
    gallery: {
      enabled: true,
      newest_first: true,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const envMap = {
                'NODE_ENV': 'test',
                'PORT': 3000,
                'DEBUG': false,
                'LOG_LEVEL': 'info',
                'CAMERA_MODE': 'webcam',
              };
              return envMap[key] || defaultValue;
            }),
          },
        },
        {
          provide: FileService,
          useValue: {
            exists: jest.fn(),
            ensureDir: jest.fn(),
          },
        },
        {
          provide: ValidationService,
          useValue: {
            validate: jest.fn().mockReturnValue({
              isValid: true,
              errors: [],
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
    configService = module.get<ConfigService>(ConfigService);
    fileService = module.get<FileService>(FileService);
    validationService = module.get<ValidationService>(ValidationService);

    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load configuration on module init', async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockFileConfig));

      await service.onModuleInit();

      expect(fileService.exists).toHaveBeenCalled();
      expect(fs.readFile).toHaveBeenCalled();
      expect(validationService.validate).toHaveBeenCalled();
    });

    it('should handle missing config file gracefully', async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(false);

      await service.onModuleInit();

      expect(fileService.exists).toHaveBeenCalled();
      expect(fs.readFile).not.toHaveBeenCalled();
      expect(validationService.validate).toHaveBeenCalled();
    });

    it('should handle invalid JSON in config file', async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json');

      await service.onModuleInit();

      expect(fileService.exists).toHaveBeenCalled();
      expect(fs.readFile).toHaveBeenCalled();
      expect(validationService.validate).toHaveBeenCalled();
    });

    it('should throw error on validation failure', async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(false);
      (validationService.validate as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid configuration'],
      });

      await expect(service.onModuleInit()).rejects.toThrow(
        'Configuration validation failed: Invalid configuration'
      );
    });
  });

  describe('Configuration Access', () => {
    beforeEach(async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockFileConfig));
      await service.onModuleInit();
    });

    it('should get complete configuration', () => {
      const config = service.get();

      expect(config).toBeDefined();
      expect(config.app).toBeDefined();
      expect(config.camera).toBeDefined();
      expect(config.gallery).toBeDefined();
    });

    it('should get value by path', () => {
      const appName = service.getValue('app.name');
      const cameraMode = service.getValue('camera.mode');

      expect(appName).toBe('Test Photobooth');
      expect(cameraMode).toBe('webcam'); // From env override
    });

    it('should return default value for non-existent path', () => {
      const nonExistent = service.getValue('non.existent.path', 'default');

      expect(nonExistent).toBe('default');
    });

    it('should handle nested path access', () => {
      const countdown = service.getValue('camera.countdown');
      
      expect(countdown).toBe(3);
    });

    it('should handle array in available languages', () => {
      const languages = service.getValue('language.available');
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain('en');
    });
  });

  describe('Environment Variable Priority', () => {
    beforeEach(async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockFileConfig));
      await service.onModuleInit();
    });

    it('should prioritize environment variables over file config', () => {
      const config = service.get();

      // PORT from env should override file config
      expect(config.app.port).toBe(3000); // env value
      // Camera mode from env should override file config
      expect(config.camera.mode).toBe('webcam'); // env value
    });

    it('should use file config when env var not set', () => {
      const config = service.get();

      // These values should come from file config
      expect(config.app.name).toBe('Test Photobooth');
      expect(config.camera.countdown).toBe(3);
    });
  });

  describe('Configuration Update', () => {
    beforeEach(async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockFileConfig));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should update configuration', async () => {
      const updates = {
        camera: {
          countdown: 10,
        },
        gallery: {
          enabled: false,
        },
      };

      await service.update(updates as any);

      const config = service.get();
      expect(config.camera.countdown).toBe(10);
      expect(config.gallery.enabled).toBe(false);
    });

    it('should save updated configuration to file', async () => {
      await service.update({ camera: { countdown: 10 } } as any);

      expect(fileService.ensureDir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should validate updated configuration', async () => {
      await service.update({ camera: { countdown: 10 } } as any);

      expect(validationService.validate).toHaveBeenCalledTimes(2); // Once on init, once on update
    });

    it('should throw error on invalid update', async () => {
      (validationService.validate as jest.Mock).mockReturnValueOnce({
        isValid: true,
        errors: [],
      }).mockReturnValueOnce({
        isValid: false,
        errors: ['Invalid update'],
      });

      await expect(service.update({ camera: { countdown: -1 } } as any)).rejects.toThrow(
        'Configuration validation failed: Invalid update'
      );
    });

    it('should handle save failure', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

      await expect(service.update({ camera: { countdown: 10 } } as any)).rejects.toThrow(
        'Failed to save configuration: Write failed'
      );
    });
  });

  describe('Deep Merge', () => {
    beforeEach(async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockFileConfig));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('should deep merge nested objects', async () => {
      const updates = {
        ui: {
          colors: {
            primary: '#ff0000',
          },
        },
      };

      await service.update(updates as any);

      const config = service.get();
      expect(config.ui.colors.primary).toBe('#ff0000');
      expect(config.ui.colors.secondary).toBeDefined(); // Should preserve other colors
    });

    it('should handle array updates correctly', async () => {
      const updates = {
        language: {
          available: ['en', 'de', 'fr'],
        },
      };

      await service.update(updates as any);

      const config = service.get();
      expect(config.language.available).toEqual(['en', 'de', 'fr']);
    });

    it('should add new properties', async () => {
      const updates = {
        newSection: {
          newProperty: 'value',
        },
      };

      await service.update(updates as any);

      const updatedConfig = service.get() as any;
      expect(updatedConfig.newSection).toBeDefined();
      expect(updatedConfig.newSection.newProperty).toBe('value');
    });
  });

  describe('Default Values', () => {
    beforeEach(async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(false);
      await service.onModuleInit();
    });

    it('should provide default values when no config file exists', () => {
      const config = service.get();

      expect(config.app.name).toBe('Photobooth');
      expect(config.app.version).toBe('5.0.0');
      expect(config.paths.data).toBe('data');
      expect(config.paths.images).toBe('data/images');
      expect(config.collage.enabled).toBe(false);
      expect(config.collage.limit).toBe(4);
    });

    it('should handle all config sections with defaults', () => {
      const config = service.get();

      // Check all major sections have defaults
      expect(config.app).toBeDefined();
      expect(config.paths).toBeDefined();
      expect(config.camera).toBeDefined();
      expect(config.collage).toBeDefined();
      expect(config.print).toBeDefined();
      expect(config.mail).toBeDefined();
      expect(config.gallery).toBeDefined();
      expect(config.keying).toBeDefined();
      expect(config.ui).toBeDefined();
      expect(config.sound).toBeDefined();
      expect(config.qr).toBeDefined();
      expect(config.remoteStorage).toBeDefined();
      expect(config.gpio).toBeDefined();
      expect(config.admin).toBeDefined();
      expect(config.language).toBeDefined();
    });
  });

  describe('Config Path Resolution', () => {
    it('should use correct config path for different environments', async () => {
      const originalEnv = process.env.NODE_ENV;
      
      // Test development environment
      process.env.NODE_ENV = 'development';
      const devModule = await Test.createTestingModule({
        providers: [
          ConfigurationService,
          { provide: ConfigService, useValue: configService },
          { provide: FileService, useValue: fileService },
          { provide: ValidationService, useValue: validationService },
        ],
      }).compile();
      
      const devService = devModule.get<ConfigurationService>(ConfigurationService);
      expect((devService as any).configPath).toContain('photobooth.development.json');
      
      // Test production environment
      process.env.NODE_ENV = 'production';
      const prodModule = await Test.createTestingModule({
        providers: [
          ConfigurationService,
          { provide: ConfigService, useValue: configService },
          { provide: FileService, useValue: fileService },
          { provide: ValidationService, useValue: validationService },
        ],
      }).compile();
      
      const prodService = prodModule.get<ConfigurationService>(ConfigurationService);
      expect((prodService as any).configPath).toContain('photobooth.production.json');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Special Configuration Cases', () => {
    beforeEach(async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockFileConfig));
      await service.onModuleInit();
    });

    it('should handle boolean environment variables correctly', () => {
      const config = service.get();
      
      expect(config.app.debug).toBe(false); // From env, overriding file config
    });

    it('should handle numeric environment variables correctly', () => {
      const config = service.get();
      
      expect(config.app.port).toBe(3000); // From env
      expect(typeof config.app.port).toBe('number');
    });

    it('should preserve complex nested structures', () => {
      const config = service.get();
      
      expect(config.collage.resolution).toBeDefined();
      expect(config.collage.resolution.width).toBe(1920);
      expect(config.collage.resolution.height).toBe(1280);
    });

    it('should handle camera rotation values', () => {
      const config = service.get();
      
      expect([0, 90, 180, 270]).toContain(config.camera.pictureRotation);
    });
  });

  describe('Migration', () => {
    it('should throw not implemented error for PHP migration', async () => {
      await expect(service.migrateFromPhp('/path/to/php/config')).rejects.toThrow(
        'PHP migration not yet implemented'
      );
    });
  });
});