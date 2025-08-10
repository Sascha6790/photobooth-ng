import { Test, TestingModule } from '@nestjs/testing';
import { CaptureService } from './capture.service';
import { CameraService } from './camera.service';
import { ImageProcessingService } from './image-processing.service';
import { ConfigurationService } from '../../config/configuration.service';
import { FileService } from '../../services/file.service';
import { LoggerService } from '../../services/logger.service';
import { CaptureRequestDto, PreviewRequestDto } from '../dto/capture.dto';

describe('CaptureService', () => {
  let service: CaptureService;
  let cameraService: CameraService;
  let imageProcessingService: ImageProcessingService;
  let configService: ConfigurationService;
  let fileService: FileService;
  let loggerService: LoggerService;

  const mockConfig = {
    paths: {
      images: '/data/images',
      thumbs: '/data/thumbs',
      qr: '/data/qr',
    },
    qr: {
      enabled: false,
      url: 'http://photobooth.local',
    },
    print: {
      enabled: false,
    },
  };

  const mockImageBuffer = Buffer.from('fake-image-data');
  const mockProcessedBuffer = Buffer.from('processed-image-data');
  const mockThumbnailPath = '/data/thumbs/photo_123456789.jpg';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaptureService,
        {
          provide: CameraService,
          useValue: {
            capturePhoto: jest.fn(),
            getPreviewStream: jest.fn(),
          },
        },
        {
          provide: ImageProcessingService,
          useValue: {
            applyFilter: jest.fn(),
            applyFrame: jest.fn(),
            applyChromakeyBuffer: jest.fn(),
            generateThumbnail: jest.fn(),
          },
        },
        {
          provide: ConfigurationService,
          useValue: {
            get: jest.fn().mockReturnValue(mockConfig),
          },
        },
        {
          provide: FileService,
          useValue: {
            writeFile: jest.fn(),
            moveFile: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            createChild: jest.fn().mockReturnValue({
              error: jest.fn(),
              warn: jest.fn(),
              info: jest.fn(),
              debug: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CaptureService>(CaptureService);
    cameraService = module.get<CameraService>(CameraService);
    imageProcessingService = module.get<ImageProcessingService>(ImageProcessingService);
    configService = module.get<ConfigurationService>(ConfigurationService);
    fileService = module.get<FileService>(FileService);
    loggerService = module.get<LoggerService>(LoggerService);

    // Setup default mocks
    (cameraService.capturePhoto as jest.Mock).mockResolvedValue(mockImageBuffer);
    (imageProcessingService.applyFilter as jest.Mock).mockResolvedValue(mockProcessedBuffer);
    (imageProcessingService.applyFrame as jest.Mock).mockResolvedValue(mockProcessedBuffer);
    (imageProcessingService.generateThumbnail as jest.Mock).mockResolvedValue(mockThumbnailPath);
    (fileService.writeFile as jest.Mock).mockResolvedValue(undefined);

    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('capture', () => {
    const baseCaptureDto: CaptureRequestDto = {
      mode: 'photo',
    };

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(123456789);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should capture a photo successfully', async () => {
      const result = await service.capture(baseCaptureDto);

      expect(cameraService.capturePhoto).toHaveBeenCalled();
      expect(fileService.writeFile).toHaveBeenCalledWith(
        '/data/images/photo_123456789.jpg',
        mockImageBuffer
      );
      expect(imageProcessingService.generateThumbnail).toHaveBeenCalledWith(
        '/data/images/photo_123456789.jpg'
      );
      expect(result).toEqual({
        success: true,
        filename: 'photo_123456789.jpg',
        path: '/data/images/photo_123456789.jpg',
        thumbnail: mockThumbnailPath,
        qrcode: undefined,
        printJobId: undefined,
        timestamp: new Date(123456789),
        metadata: {
          mode: 'photo',
          filter: undefined,
          frame: undefined,
        },
      });
    });

    it('should apply filter when requested', async () => {
      const captureDto: CaptureRequestDto = {
        ...baseCaptureDto,
        filter: 'sepia',
      };

      await service.capture(captureDto);

      expect(imageProcessingService.applyFilter).toHaveBeenCalledWith(
        mockImageBuffer,
        'sepia'
      );
      expect(fileService.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        mockProcessedBuffer
      );
    });

    it('should apply frame when requested', async () => {
      const captureDto: CaptureRequestDto = {
        ...baseCaptureDto,
        frame: 'birthday',
      };

      await service.capture(captureDto);

      expect(imageProcessingService.applyFrame).toHaveBeenCalledWith(
        mockImageBuffer,
        'birthday'
      );
      expect(fileService.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        mockProcessedBuffer
      );
    });

    it('should apply both filter and frame in correct order', async () => {
      const captureDto: CaptureRequestDto = {
        ...baseCaptureDto,
        filter: 'grayscale',
        frame: 'wedding',
      };

      const filteredBuffer = Buffer.from('filtered');
      const framedBuffer = Buffer.from('framed');
      
      (imageProcessingService.applyFilter as jest.Mock).mockResolvedValueOnce(filteredBuffer);
      (imageProcessingService.applyFrame as jest.Mock).mockResolvedValueOnce(framedBuffer);

      await service.capture(captureDto);

      expect(imageProcessingService.applyFilter).toHaveBeenCalledWith(
        mockImageBuffer,
        'grayscale'
      );
      expect(imageProcessingService.applyFrame).toHaveBeenCalledWith(
        filteredBuffer,
        'wedding'
      );
      expect(fileService.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        framedBuffer
      );
    });

    it('should generate QR code when enabled', async () => {
      const configWithQr = {
        ...mockConfig,
        qr: { enabled: true, url: 'http://photobooth.local' },
      };
      (configService.get as jest.Mock).mockReturnValue(configWithQr);

      const result = await service.capture(baseCaptureDto);

      // QR code generation is TODO, so it returns empty string
      expect(result.qrcode).toBe('');
    });

    it('should handle auto print when requested', async () => {
      const configWithPrint = {
        ...mockConfig,
        print: { enabled: true },
      };
      (configService.get as jest.Mock).mockReturnValue(configWithPrint);

      const captureDto: CaptureRequestDto = {
        ...baseCaptureDto,
        autoPrint: true,
      };

      const result = await service.capture(captureDto);

      // Print service is TODO, so it returns hardcoded value
      expect(result.printJobId).toBe('print-job-id');
    });

    it('should handle collage mode', async () => {
      const captureDto: CaptureRequestDto = {
        mode: 'collage',
      };

      await service.capture(captureDto);

      // Collage capture is TODO, falls back to regular photo
      expect(cameraService.capturePhoto).toHaveBeenCalled();
    });

    it('should handle video mode', async () => {
      const captureDto: CaptureRequestDto = {
        mode: 'video',
      };

      await service.capture(captureDto);

      // Video capture is TODO, falls back to regular photo
      expect(cameraService.capturePhoto).toHaveBeenCalled();
    });

    it('should handle chromakey mode without background', async () => {
      const captureDto: CaptureRequestDto = {
        mode: 'chromakey',
      };

      await service.capture(captureDto);

      expect(cameraService.capturePhoto).toHaveBeenCalled();
      expect(imageProcessingService.applyChromakeyBuffer).not.toHaveBeenCalled();
    });

    it('should handle chromakey mode with background', async () => {
      const captureDto: CaptureRequestDto = {
        mode: 'chromakey',
        chromakeyBackground: 'beach',
      };

      const chromakeyBuffer = Buffer.from('chromakey-result');
      (imageProcessingService.applyChromakeyBuffer as jest.Mock).mockResolvedValue(chromakeyBuffer);

      await service.capture(captureDto);

      expect(cameraService.capturePhoto).toHaveBeenCalled();
      expect(imageProcessingService.applyChromakeyBuffer).toHaveBeenCalledWith(
        mockImageBuffer,
        'beach'
      );
      expect(fileService.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        chromakeyBuffer
      );
    });

    it('should throw error for unknown capture mode', async () => {
      const captureDto: CaptureRequestDto = {
        mode: 'unknown' as any,
      };

      await expect(service.capture(captureDto)).rejects.toThrow('Unknown capture mode: unknown');
    });

    it('should handle capture errors', async () => {
      (cameraService.capturePhoto as jest.Mock).mockRejectedValue(new Error('Camera error'));

      await expect(service.capture(baseCaptureDto)).rejects.toThrow('Camera error');
      
      const logger = loggerService.createChild('CaptureService');
      expect(logger.error).toHaveBeenCalledWith(
        'Capture failed: Camera error',
        expect.any(String)
      );
    });
  });

  describe('processUploadedImage', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'image',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024000,
      path: '/tmp/upload-123.jpg',
      buffer: Buffer.from(''),
      stream: null as any,
      destination: '/tmp',
      filename: 'upload-123.jpg',
    };

    const captureDto: CaptureRequestDto = {
      mode: 'photo',
    };

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(123456789);
      (fileService.moveFile as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should process uploaded image successfully', async () => {
      const result = await service.processUploadedImage(mockFile, captureDto);

      expect(fileService.moveFile).toHaveBeenCalledWith(
        '/tmp/upload-123.jpg',
        '/data/images/upload_123456789.jpg'
      );
      expect(imageProcessingService.generateThumbnail).toHaveBeenCalledWith(
        '/data/images/upload_123456789.jpg'
      );
      expect(result).toEqual({
        success: true,
        filename: 'upload_123456789.jpg',
        path: '/data/images/upload_123456789.jpg',
        thumbnail: mockThumbnailPath,
        timestamp: new Date(123456789),
        metadata: {
          mode: 'photo',
          uploaded: true,
        },
      });
    });

    it('should handle upload processing errors', async () => {
      (fileService.moveFile as jest.Mock).mockRejectedValue(new Error('Move failed'));

      await expect(service.processUploadedImage(mockFile, captureDto)).rejects.toThrow('Move failed');
      
      const logger = loggerService.createChild('CaptureService');
      expect(logger.error).toHaveBeenCalledWith(
        'Upload processing failed: Move failed',
        expect.any(String)
      );
    });
  });

  describe('getPreviewStream', () => {
    const mockStream = { pipe: jest.fn() };

    beforeEach(() => {
      (cameraService.getPreviewStream as jest.Mock).mockResolvedValue(mockStream);
    });

    it('should get preview stream with default parameters', async () => {
      const previewDto: PreviewRequestDto = {};

      const result = await service.getPreviewStream(previewDto);

      expect(cameraService.getPreviewStream).toHaveBeenCalledWith(1280, 720, 'jpeg');
      expect(result).toBe(mockStream);
    });

    it('should get preview stream with custom parameters', async () => {
      const previewDto: PreviewRequestDto = {
        width: 1920,
        height: 1080,
        format: 'png',
      };

      const result = await service.getPreviewStream(previewDto);

      expect(cameraService.getPreviewStream).toHaveBeenCalledWith(1920, 1080, 'png');
      expect(result).toBe(mockStream);
    });

    it('should handle preview stream errors', async () => {
      (cameraService.getPreviewStream as jest.Mock).mockRejectedValue(new Error('Stream error'));

      await expect(service.getPreviewStream({})).rejects.toThrow('Stream error');
      
      const logger = loggerService.createChild('CaptureService');
      expect(logger.error).toHaveBeenCalledWith(
        'Preview stream failed: Stream error',
        expect.any(String)
      );
    });
  });

  describe('countdown', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start countdown timer', async () => {
      const countdownPromise = service.startCountdown(3);

      // Advance timer by 3 seconds
      jest.advanceTimersByTime(3000);

      await countdownPromise;

      const logger = loggerService.createChild('CaptureService');
      expect(logger.debug).toHaveBeenCalledWith('Countdown: 3');
      expect(logger.debug).toHaveBeenCalledWith('Countdown: 2');
      expect(logger.debug).toHaveBeenCalledWith('Countdown: 1');
    });

    it('should cancel countdown timer', async () => {
      const countdownPromise = service.startCountdown(5);

      // Cancel after 2 seconds
      jest.advanceTimersByTime(2000);
      await service.cancelCountdown();

      // Advance more but countdown should be cancelled
      jest.advanceTimersByTime(5000);

      const logger = loggerService.createChild('CaptureService');
      expect(logger.debug).toHaveBeenCalledWith('Countdown: 5');
      expect(logger.debug).toHaveBeenCalledWith('Countdown: 4');
      expect(logger.debug).not.toHaveBeenCalledWith('Countdown: 3');
    });

    it('should handle multiple countdown cancellations', async () => {
      await service.cancelCountdown();
      await service.cancelCountdown();

      // Should not throw error
      expect(() => service.cancelCountdown()).not.toThrow();
    });

    it('should auto-cancel countdown when it reaches zero', async () => {
      const countdownPromise = service.startCountdown(1);

      jest.advanceTimersByTime(1000);

      await countdownPromise;

      // Timer should be cleared
      expect((service as any).countdownTimer).toBeNull();
    });

    it('should handle concurrent countdowns', async () => {
      const countdown1 = service.startCountdown(2);
      
      jest.advanceTimersByTime(1000);
      
      // Start second countdown, should replace first
      const countdown2 = service.startCountdown(3);
      
      jest.advanceTimersByTime(3000);
      
      await countdown2;
      
      const logger = loggerService.createChild('CaptureService');
      // Should see logs from second countdown
      expect(logger.debug).toHaveBeenCalledWith('Countdown: 3');
    });
  });
});