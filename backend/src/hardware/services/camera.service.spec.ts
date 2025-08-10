import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CameraService, CameraEvent, CaptureOptions } from './camera.service';

describe('CameraService', () => {
  let service: CameraService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CameraService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'hardware.camera') {
                return {
                  strategy: 'mock',
                  outputPath: '/tmp/test/captures',
                  thumbnailPath: '/tmp/test/captures/thumbnails',
                  autoConnect: false,
                  reconnectAttempts: 3,
                  reconnectDelay: 1000,
                };
              }
              return null;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CameraService>(CameraService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should use mock strategy in test environment', () => {
    expect(service.getCurrentStrategy()).toBe('MockCamera');
  });

  describe('Initialization', () => {
    it('should initialize camera', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
      expect(await service.isAvailable()).toBe(true);
    });

    it('should emit connection restored event on successful initialization', async () => {
      await service.initialize();
      expect(eventEmitter.emit).toHaveBeenCalledWith(CameraEvent.CONNECTION_RESTORED);
    });
  });

  describe('Camera Capabilities', () => {
    it('should return camera capabilities', () => {
      const capabilities = service.getCapabilities();
      
      expect(capabilities).toHaveProperty('canTakePicture');
      expect(capabilities).toHaveProperty('canRecordVideo');
      expect(capabilities).toHaveProperty('canLiveView');
      expect(capabilities).toHaveProperty('canAdjustSettings');
      expect(capabilities).toHaveProperty('supportedFormats');
      expect(capabilities).toHaveProperty('supportedResolutions');
    });

    it('should support basic operations with mock camera', () => {
      const capabilities = service.getCapabilities();
      
      expect(capabilities.canTakePicture).toBe(true);
      expect(capabilities.canRecordVideo).toBe(true);
      expect(capabilities.canLiveView).toBe(true);
      expect(capabilities.canAdjustSettings).toBe(true);
    });
  });

  describe('Photo Capture', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should capture a photo', async () => {
      const result = await service.capture();
      
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('metadata');
    });

    it('should emit capture events', async () => {
      const options: CaptureOptions = {
        countdown: 0,
        sound: false,
        flash: false,
      };

      await service.capture(options);
      
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CameraEvent.CAPTURE_STARTED,
        options
      );
      
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CameraEvent.CAPTURE_COMPLETED,
        expect.objectContaining({
          filePath: expect.any(String),
          fileName: expect.any(String),
        })
      );
    });

    it('should handle countdown', async () => {
      jest.useFakeTimers();
      
      const capturePromise = service.capture({ countdown: 3 });
      
      jest.advanceTimersByTime(3000);
      
      await capturePromise;
      
      expect(eventEmitter.emit).toHaveBeenCalledWith('countdown.tick', 3);
      expect(eventEmitter.emit).toHaveBeenCalledWith('countdown.tick', 2);
      expect(eventEmitter.emit).toHaveBeenCalledWith('countdown.tick', 1);
      
      jest.useRealTimers();
    });

    it('should capture multiple photos', async () => {
      const results = await service.captureMultiple(3, 100);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('fileName');
      });
    });

    it('should emit capture failed event on error', async () => {
      jest.spyOn(service as any, 'strategy', 'get').mockReturnValue({
        takePicture: jest.fn().mockRejectedValue(new Error('Camera error')),
      });

      await expect(service.capture()).rejects.toThrow('Camera error');
      
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CameraEvent.CAPTURE_FAILED,
        expect.any(Error)
      );
    });
  });

  describe('Video Recording', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should start video recording', async () => {
      await expect(service.startVideo()).resolves.not.toThrow();
      
      expect(eventEmitter.emit).toHaveBeenCalledWith(CameraEvent.VIDEO_STARTED);
    });

    it('should stop video recording', async () => {
      await service.startVideo();
      const result = await service.stopVideo();
      
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CameraEvent.VIDEO_STOPPED,
        expect.objectContaining({
          filePath: expect.any(String),
        })
      );
    });
  });

  describe('Live View', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should start live view', async () => {
      const stream = await service.startLiveView();
      
      expect(stream).toBeDefined();
      expect(stream).toHaveProperty('start');
      expect(stream).toHaveProperty('stop');
      expect(stream).toHaveProperty('getFrame');
      expect(stream).toHaveProperty('onFrame');
    });

    it('should stop live view', async () => {
      await service.startLiveView();
      await expect(service.stopLiveView()).resolves.not.toThrow();
    });

    it('should return existing live view if already started', async () => {
      const stream1 = await service.startLiveView();
      const stream2 = await service.startLiveView();
      
      expect(stream1).toBe(stream2);
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get camera settings', async () => {
      const settings = await service.getSettings();
      
      expect(settings).toHaveProperty('iso');
      expect(settings).toHaveProperty('aperture');
      expect(settings).toHaveProperty('shutterSpeed');
    });

    it('should update camera settings', async () => {
      const newSettings = {
        iso: 400,
        aperture: 'f/2.8',
      };

      await service.updateSettings(newSettings);
      
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CameraEvent.SETTINGS_CHANGED,
        newSettings
      );
    });
  });

  describe('Strategy Switching', () => {
    it('should switch camera strategy', async () => {
      await service.switchStrategy('webcam');
      expect(service.getCurrentStrategy()).toBe('WebcamCamera');
      
      await service.switchStrategy('mock');
      expect(service.getCurrentStrategy()).toBe('MockCamera');
    });
  });

  describe('Connection Testing', () => {
    it('should test camera connection', async () => {
      const result = await service.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      jest.spyOn(service as any, 'initialize').mockRejectedValue(new Error('Connection failed'));
      
      const result = await service.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should return camera configuration', () => {
      const config = service.getConfig();
      
      expect(config).toHaveProperty('strategy');
      expect(config).toHaveProperty('outputPath');
      expect(config).toHaveProperty('autoConnect');
      expect(config.strategy).toBe('mock');
    });
  });
});