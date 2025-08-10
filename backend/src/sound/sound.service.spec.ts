import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SoundService, SoundType } from './sound.service';

describe('SoundService', () => {
  let service: SoundService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        'sound.enabled': true,
        'sound.voice': 'man',
        'ui.language': 'en',
        'sound.fallback_enabled': true,
        'sound.volume': 80,
        'sound.player': 'auto',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoundService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SoundService>(SoundService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock the initialize method to prevent actual file system operations
    jest.spyOn(service as any, 'detectSoundPlayer').mockResolvedValue('mock-player');
    jest.spyOn(service as any, 'loadSoundFiles').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with config values', async () => {
      await service.initialize();
      expect(service.isEnabled()).toBe(true);
      expect(service.getVolume()).toBe(80);
    });
  });

  describe('volume control', () => {
    it('should set volume within valid range', () => {
      service.setVolume(50);
      expect(service.getVolume()).toBe(50);
    });

    it('should clamp volume to 0-100 range', () => {
      service.setVolume(150);
      expect(service.getVolume()).toBe(100);

      service.setVolume(-10);
      expect(service.getVolume()).toBe(0);
    });
  });

  describe('enable/disable', () => {
    it('should enable and disable sound', () => {
      service.setEnabled(false);
      expect(service.isEnabled()).toBe(false);

      service.setEnabled(true);
      expect(service.isEnabled()).toBe(true);
    });

    it('should stop sound when disabled', async () => {
      const stopSpy = jest.spyOn(service, 'stop').mockResolvedValue();
      
      service.setEnabled(false);
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('play sound', () => {
    it('should not play sound when disabled', async () => {
      service.setEnabled(false);
      const execSpy = jest.spyOn(require('child_process'), 'exec');
      
      await service.play(SoundType.CHEESE);
      
      expect(execSpy).not.toHaveBeenCalled();
    });

    it('should handle missing sound files gracefully', async () => {
      service.setEnabled(true);
      jest.spyOn(service, 'getSoundInfo').mockReturnValue({
        name: SoundType.CHEESE,
        path: null,
        exists: false,
      });
      
      await expect(service.play(SoundType.CHEESE)).resolves.not.toThrow();
    });
  });

  describe('sound file management', () => {
    it('should return all sounds', () => {
      const mockSounds = [
        { name: SoundType.CHEESE, path: '/path/to/cheese.mp3', exists: true },
        { name: SoundType.SHUTTER, path: '/path/to/shutter.mp3', exists: true },
      ];
      
      jest.spyOn(service, 'getAllSounds').mockReturnValue(mockSounds);
      
      const sounds = service.getAllSounds();
      expect(sounds).toHaveLength(2);
      expect(sounds[0].name).toBe(SoundType.CHEESE);
    });

    it('should get sound info', () => {
      const mockSoundInfo = {
        name: SoundType.CHEESE,
        path: '/path/to/cheese.mp3',
        exists: true,
      };
      
      jest.spyOn(service, 'getSoundInfo').mockReturnValue(mockSoundInfo);
      
      const info = service.getSoundInfo(SoundType.CHEESE);
      expect(info).toEqual(mockSoundInfo);
    });
  });

  describe('countdown', () => {
    it('should play countdown sequence', async () => {
      const playSpy = jest.spyOn(service, 'play').mockResolvedValue();
      const delaySpy = jest.spyOn(service as any, 'delay').mockResolvedValue();
      
      await service.playCountdown(3);
      
      expect(playSpy).toHaveBeenCalledTimes(3);
      expect(playSpy).toHaveBeenCalledWith(SoundType.COUNTER_3);
      expect(playSpy).toHaveBeenCalledWith(SoundType.COUNTER_2);
      expect(playSpy).toHaveBeenCalledWith(SoundType.COUNTER_1);
      expect(delaySpy).toHaveBeenCalledTimes(3);
    });

    it('should not play countdown when disabled', async () => {
      service.setEnabled(false);
      const playSpy = jest.spyOn(service, 'play').mockResolvedValue();
      
      await service.playCountdown(3);
      
      expect(playSpy).not.toHaveBeenCalled();
    });
  });

  describe('specific sound methods', () => {
    let playSpy: jest.SpyInstance;

    beforeEach(() => {
      playSpy = jest.spyOn(service, 'play').mockResolvedValue();
    });

    it('should play cheese sound', async () => {
      await service.playCheese();
      expect(playSpy).toHaveBeenCalledWith(SoundType.CHEESE);
    });

    it('should play shutter sound', async () => {
      await service.playShutter();
      expect(playSpy).toHaveBeenCalledWith(SoundType.SHUTTER);
    });

    it('should play success sound', async () => {
      await service.playSuccess();
      expect(playSpy).toHaveBeenCalledWith(SoundType.SUCCESS);
    });

    it('should play error sound', async () => {
      await service.playError();
      expect(playSpy).toHaveBeenCalledWith(SoundType.ERROR);
    });

    it('should play print sound', async () => {
      await service.playPrint();
      expect(playSpy).toHaveBeenCalledWith(SoundType.PRINT);
    });
  });

  describe('test sound system', () => {
    it('should return true when test succeeds', async () => {
      jest.spyOn(service, 'getSoundInfo').mockReturnValue({
        name: SoundType.COUNTER_1,
        path: '/path/to/counter-1.mp3',
        exists: true,
      });
      jest.spyOn(service, 'play').mockResolvedValue();
      jest.spyOn(service, 'stop').mockResolvedValue();
      jest.spyOn(service as any, 'delay').mockResolvedValue();
      
      const result = await service.test();
      expect(result).toBe(true);
    });

    it('should return false when no sound player available', async () => {
      (service as any).soundPlayer = null;
      
      const result = await service.test();
      expect(result).toBe(false);
    });

    it('should return false when test fails', async () => {
      jest.spyOn(service, 'play').mockRejectedValue(new Error('Test error'));
      
      const result = await service.test();
      expect(result).toBe(false);
    });
  });
});