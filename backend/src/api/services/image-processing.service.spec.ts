import { Test, TestingModule } from '@nestjs/testing';
import { ImageProcessingService } from './image-processing.service';
import { ConfigurationService } from '../../config/configuration.service';
import { FileService } from '../../services/file.service';
import { LoggerService } from '../../services/logger.service';
import * as sharp from 'sharp';

jest.mock('sharp');

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;
  let configService: ConfigurationService;
  let fileService: FileService;
  let loggerService: LoggerService;

  const mockConfig = {
    paths: {
      frames: '/data/frames',
      backgrounds: '/data/backgrounds',
      thumbs: '/data/thumbs',
    },
  };

  const mockImageBuffer = Buffer.from('fake-image-data');
  const mockProcessedBuffer = Buffer.from('processed-image-data');
  const mockFrameBuffer = Buffer.from('frame-data');
  const mockBackgroundBuffer = Buffer.from('background-data');

  const mockSharpInstance = {
    grayscale: jest.fn().mockReturnThis(),
    recomb: jest.fn().mockReturnThis(),
    blur: jest.fn().mockReturnThis(),
    sharpen: jest.fn().mockReturnThis(),
    modulate: jest.fn().mockReturnThis(),
    tint: jest.fn().mockReturnThis(),
    linear: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    composite: jest.fn().mockReturnThis(),
    rotate: jest.fn().mockReturnThis(),
    flip: jest.fn().mockReturnThis(),
    flop: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(mockProcessedBuffer),
    toFile: jest.fn().mockResolvedValue(undefined),
    metadata: jest.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      channels: 3,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageProcessingService,
        {
          provide: ConfigurationService,
          useValue: {
            get: jest.fn().mockReturnValue(mockConfig),
          },
        },
        {
          provide: FileService,
          useValue: {
            exists: jest.fn(),
            readFileBuffer: jest.fn(),
            ensureDir: jest.fn(),
            listFiles: jest.fn(),
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

    service = module.get<ImageProcessingService>(ImageProcessingService);
    configService = module.get<ConfigurationService>(ConfigurationService);
    fileService = module.get<FileService>(FileService);
    loggerService = module.get<LoggerService>(LoggerService);

    // Setup sharp mock
    (sharp as any).mockImplementation(() => mockSharpInstance);
    (sharp as any).mockReturnValue(mockSharpInstance);

    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('applyFilter', () => {
    it('should apply grayscale filter', async () => {
      const result = await service.applyFilter(mockImageBuffer, 'grayscale');

      expect(sharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(mockSharpInstance.grayscale).toHaveBeenCalled();
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should apply sepia filter', async () => {
      const result = await service.applyFilter(mockImageBuffer, 'sepia');

      expect(mockSharpInstance.recomb).toHaveBeenCalledWith([
        [0.393, 0.769, 0.189],
        [0.349, 0.686, 0.168],
        [0.272, 0.534, 0.131],
      ]);
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should apply blur filter', async () => {
      const result = await service.applyFilter(mockImageBuffer, 'blur');

      expect(mockSharpInstance.blur).toHaveBeenCalledWith(5);
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should apply sharpen filter', async () => {
      const result = await service.applyFilter(mockImageBuffer, 'sharpen');

      expect(mockSharpInstance.sharpen).toHaveBeenCalled();
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should apply vintage filter', async () => {
      const result = await service.applyFilter(mockImageBuffer, 'vintage');

      expect(mockSharpInstance.modulate).toHaveBeenCalledWith({
        brightness: 0.9,
        saturation: 0.8,
      });
      expect(mockSharpInstance.tint).toHaveBeenCalledWith({
        r: 255,
        g: 240,
        b: 200,
      });
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should apply cold filter', async () => {
      const result = await service.applyFilter(mockImageBuffer, 'cold');

      expect(mockSharpInstance.tint).toHaveBeenCalledWith({
        r: 200,
        g: 220,
        b: 255,
      });
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should apply warm filter', async () => {
      const result = await service.applyFilter(mockImageBuffer, 'warm');

      expect(mockSharpInstance.tint).toHaveBeenCalledWith({
        r: 255,
        g: 220,
        b: 200,
      });
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should apply high-contrast filter', async () => {
      const result = await service.applyFilter(mockImageBuffer, 'high-contrast');

      expect(mockSharpInstance.linear).toHaveBeenCalledWith(1.5, -(128 * 1.5) + 128);
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should handle unknown filter', async () => {
      const result = await service.applyFilter(mockImageBuffer, 'unknown');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.warn).toHaveBeenCalledWith('Unknown filter: unknown');
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should handle filter errors', async () => {
      mockSharpInstance.toBuffer.mockRejectedValueOnce(new Error('Processing failed'));

      await expect(service.applyFilter(mockImageBuffer, 'grayscale')).rejects.toThrow(
        'Processing failed'
      );

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to apply filter grayscale: Processing failed'
      );
    });
  });

  describe('applyFrame', () => {
    beforeEach(() => {
      (fileService.exists as jest.Mock).mockResolvedValue(true);
      (fileService.readFileBuffer as jest.Mock).mockResolvedValue(mockFrameBuffer);
    });

    it('should apply frame to image', async () => {
      const result = await service.applyFrame(mockImageBuffer, 'birthday');

      expect(fileService.exists).toHaveBeenCalledWith('/data/frames/birthday.png');
      expect(fileService.readFileBuffer).toHaveBeenCalledWith('/data/frames/birthday.png');
      expect(sharp).toHaveBeenCalledWith(mockFrameBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1920, 1080);
      expect(mockSharpInstance.composite).toHaveBeenCalledWith([
        { input: mockProcessedBuffer, gravity: 'center' },
      ]);
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should return original image if frame not found', async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(false);

      const result = await service.applyFrame(mockImageBuffer, 'missing');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.warn).toHaveBeenCalledWith('Frame not found: /data/frames/missing.png');
      expect(result).toBe(mockImageBuffer);
    });

    it('should handle frame processing errors', async () => {
      mockSharpInstance.toBuffer.mockRejectedValueOnce(new Error('Frame failed'));

      await expect(service.applyFrame(mockImageBuffer, 'birthday')).rejects.toThrow('Frame failed');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to apply frame birthday: Frame failed'
      );
    });
  });

  describe('generateThumbnail', () => {
    beforeEach(() => {
      (fileService.ensureDir as jest.Mock).mockResolvedValue(undefined);
    });

    it('should generate thumbnail successfully', async () => {
      const result = await service.generateThumbnail('/data/images/photo.jpg');

      expect(fileService.ensureDir).toHaveBeenCalledWith('/data/thumbs');
      expect(sharp).toHaveBeenCalledWith('/data/images/photo.jpg');
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 80 });
      expect(mockSharpInstance.toFile).toHaveBeenCalledWith('/data/thumbs/photo.jpg');
      expect(result).toBe('/data/thumbs/photo.jpg');
    });

    it('should handle thumbnail generation errors', async () => {
      mockSharpInstance.toFile.mockRejectedValueOnce(new Error('Thumbnail failed'));

      await expect(service.generateThumbnail('/data/images/photo.jpg')).rejects.toThrow(
        'Thumbnail failed'
      );

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to generate thumbnail for /data/images/photo.jpg: Thumbnail failed'
      );
    });
  });

  describe('applyChromakey', () => {
    it('should log warning for unimplemented chromakey', async () => {
      const result = await service.applyChromakey('image123', 'beach.jpg');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.warn).toHaveBeenCalledWith('Chromakey not yet implemented');
      expect(result).toEqual(Buffer.from(''));
    });
  });

  describe('applyChromakeyBuffer', () => {
    beforeEach(() => {
      (fileService.exists as jest.Mock).mockResolvedValue(true);
      (fileService.readFileBuffer as jest.Mock).mockResolvedValue(mockBackgroundBuffer);
    });

    it('should apply chromakey with background', async () => {
      const result = await service.applyChromakeyBuffer(mockImageBuffer, 'beach.jpg');

      expect(fileService.exists).toHaveBeenCalledWith('/data/backgrounds/beach.jpg');
      expect(fileService.readFileBuffer).toHaveBeenCalledWith('/data/backgrounds/beach.jpg');
      expect(sharp).toHaveBeenCalledWith(mockBackgroundBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1920, 1080);
      // Currently returns original image (simplified implementation)
      expect(result).toBe(mockImageBuffer);
    });

    it('should return original image if background not found', async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(false);

      const result = await service.applyChromakeyBuffer(mockImageBuffer, 'missing.jpg');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.warn).toHaveBeenCalledWith(
        'Background not found: /data/backgrounds/missing.jpg'
      );
      expect(result).toBe(mockImageBuffer);
    });

    it('should handle chromakey errors', async () => {
      (fileService.readFileBuffer as jest.Mock).mockRejectedValue(new Error('Read failed'));

      await expect(
        service.applyChromakeyBuffer(mockImageBuffer, 'beach.jpg')
      ).rejects.toThrow('Read failed');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.error).toHaveBeenCalledWith('Failed to apply chromakey: Read failed');
    });
  });

  describe('getAvailableBackgrounds', () => {
    it('should return list of available backgrounds', async () => {
      (fileService.listFiles as jest.Mock).mockResolvedValue([
        '/data/backgrounds/beach.jpg',
        '/data/backgrounds/forest.png',
        '/data/backgrounds/city.jpeg',
      ]);

      const result = await service.getAvailableBackgrounds();

      expect(fileService.listFiles).toHaveBeenCalledWith('/data/backgrounds', {
        extensions: ['.jpg', '.jpeg', '.png'],
      });
      expect(result).toEqual(['beach.jpg', 'forest.png', 'city.jpeg']);
    });

    it('should handle errors getting backgrounds', async () => {
      (fileService.listFiles as jest.Mock).mockRejectedValue(new Error('List failed'));

      await expect(service.getAvailableBackgrounds()).rejects.toThrow('List failed');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.error).toHaveBeenCalledWith('Failed to get backgrounds: List failed');
    });
  });

  describe('createCollage', () => {
    const mockImages = [
      Buffer.from('image1'),
      Buffer.from('image2'),
      Buffer.from('image3'),
      Buffer.from('image4'),
    ];

    it('should create 2x2 collage', async () => {
      const result = await service.createCollage(mockImages, '2x2');

      expect(sharp).toHaveBeenCalledTimes(5); // 4 images + 1 for canvas
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(960, 640, { fit: 'cover' });
      expect(mockSharpInstance.composite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ left: 0, top: 0 }),
          expect.objectContaining({ left: 960, top: 0 }),
          expect.objectContaining({ left: 0, top: 640 }),
          expect.objectContaining({ left: 960, top: 640 }),
        ])
      );
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should create 3x2 collage', async () => {
      const sixImages = [...mockImages, Buffer.from('image5'), Buffer.from('image6')];

      const result = await service.createCollage(sixImages, '3x2');

      expect(sharp).toHaveBeenCalledTimes(7); // 6 images + 1 for canvas
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(640, 640, { fit: 'cover' });
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should throw error for mismatched image count', async () => {
      await expect(service.createCollage(mockImages, '3x3')).rejects.toThrow(
        'Layout 3x3 requires 9 images, got 4'
      );
    });

    it('should handle collage creation errors', async () => {
      mockSharpInstance.toBuffer.mockRejectedValueOnce(new Error('Collage failed'));

      await expect(service.createCollage(mockImages, '2x2')).rejects.toThrow('Collage failed');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.error).toHaveBeenCalledWith('Failed to create collage: Collage failed');
    });
  });

  describe('rotateImage', () => {
    it('should rotate image by specified degrees', async () => {
      const result = await service.rotateImage(mockImageBuffer, 90);

      expect(sharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(mockSharpInstance.rotate).toHaveBeenCalledWith(90);
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should handle rotation errors', async () => {
      mockSharpInstance.toBuffer.mockRejectedValueOnce(new Error('Rotate failed'));

      await expect(service.rotateImage(mockImageBuffer, 180)).rejects.toThrow('Rotate failed');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.error).toHaveBeenCalledWith('Failed to rotate image: Rotate failed');
    });
  });

  describe('flipImage', () => {
    it('should flip image horizontally', async () => {
      const result = await service.flipImage(mockImageBuffer, true);

      expect(sharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(mockSharpInstance.flop).toHaveBeenCalled();
      expect(mockSharpInstance.flip).not.toHaveBeenCalled();
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should flip image vertically', async () => {
      const result = await service.flipImage(mockImageBuffer, false);

      expect(sharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(mockSharpInstance.flip).toHaveBeenCalled();
      expect(mockSharpInstance.flop).not.toHaveBeenCalled();
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should default to horizontal flip', async () => {
      const result = await service.flipImage(mockImageBuffer);

      expect(mockSharpInstance.flop).toHaveBeenCalled();
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should handle flip errors', async () => {
      mockSharpInstance.toBuffer.mockRejectedValueOnce(new Error('Flip failed'));

      await expect(service.flipImage(mockImageBuffer)).rejects.toThrow('Flip failed');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.error).toHaveBeenCalledWith('Failed to flip image: Flip failed');
    });
  });

  describe('addText', () => {
    it('should add text with default options', async () => {
      const result = await service.addText(mockImageBuffer, 'Hello World');

      expect(mockSharpInstance.metadata).toHaveBeenCalled();
      expect(mockSharpInstance.composite).toHaveBeenCalledWith([
        expect.objectContaining({
          input: expect.any(Buffer),
          gravity: 'south',
        }),
      ]);
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should add text with custom options', async () => {
      const result = await service.addText(mockImageBuffer, 'Custom Text', {
        size: 72,
        color: 'red',
        position: 'center',
      });

      const compositeCall = mockSharpInstance.composite.mock.calls[0][0][0];
      const svgText = compositeCall.input.toString();
      
      expect(svgText).toContain('font-size="72"');
      expect(svgText).toContain('fill="red"');
      expect(svgText).toContain('Custom Text');
      expect(result).toBe(mockProcessedBuffer);
    });

    it('should handle text addition errors', async () => {
      mockSharpInstance.metadata.mockRejectedValueOnce(new Error('Metadata failed'));

      await expect(service.addText(mockImageBuffer, 'Text')).rejects.toThrow('Metadata failed');

      const logger = loggerService.createChild('ImageProcessingService');
      expect(logger.error).toHaveBeenCalledWith('Failed to add text: Metadata failed');
    });
  });
});