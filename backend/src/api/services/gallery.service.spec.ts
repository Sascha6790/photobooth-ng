import { Test, TestingModule } from '@nestjs/testing';
import { GalleryService } from './gallery.service';
import { ConfigurationService } from '../../config/configuration.service';
import { FileService } from '../../services/file.service';
import { LoggerService } from '../../services/logger.service';
import { GalleryQueryDto, ImageDto } from '../dto/gallery.dto';
import * as sharp from 'sharp';

jest.mock('sharp');

describe('GalleryService', () => {
  let service: GalleryService;
  let configService: ConfigurationService;
  let fileService: FileService;
  let loggerService: LoggerService;

  const mockImages: ImageDto[] = [
    {
      id: 'image1',
      filename: 'image1.jpg',
      path: '/data/images/image1.jpg',
      thumbnail: '/data/thumbs/image1.jpg',
      size: 1024000,
      width: 1920,
      height: 1080,
      createdAt: new Date('2024-01-01'),
      printCount: 0,
      metadata: {},
    },
    {
      id: 'image2',
      filename: 'image2.jpg',
      path: '/data/images/image2.jpg',
      thumbnail: '/data/thumbs/image2.jpg',
      size: 2048000,
      width: 3840,
      height: 2160,
      createdAt: new Date('2024-01-02'),
      printCount: 2,
      metadata: {},
    },
    {
      id: 'image3',
      filename: 'image3.jpg',
      path: '/data/images/image3.jpg',
      size: 512000,
      width: 1280,
      height: 720,
      createdAt: new Date('2024-01-03'),
      printCount: 1,
      metadata: {},
    },
  ];

  const mockConfig = {
    paths: {
      data: '/data',
      images: '/data/images',
      thumbs: '/data/thumbs',
      qr: '/data/qr',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalleryService,
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
            readFile: jest.fn(),
            writeFile: jest.fn(),
            deleteFile: jest.fn(),
            listFiles: jest.fn(),
            getStats: jest.fn(),
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

    service = module.get<GalleryService>(GalleryService);
    configService = module.get<ConfigurationService>(ConfigurationService);
    fileService = module.get<FileService>(FileService);
    loggerService = module.get<LoggerService>(LoggerService);

    // Setup initial database
    (fileService.exists as jest.Mock).mockResolvedValue(true);
    (fileService.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        image1: mockImages[0],
        image2: mockImages[1],
        image3: mockImages[2],
      })
    );

    // Wait for database load
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load database on initialization', async () => {
      expect(fileService.exists).toHaveBeenCalledWith('/data/gallery.json');
      expect(fileService.readFile).toHaveBeenCalledWith('/data/gallery.json');
    });

    it('should handle missing database file', async () => {
      (fileService.exists as jest.Mock).mockResolvedValue(false);
      
      const newService = new GalleryService(configService, fileService, loggerService);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(fileService.readFile).not.toHaveBeenCalled();
    });

    it('should handle database load errors', async () => {
      (fileService.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));
      
      const newService = new GalleryService(configService, fileService, loggerService);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const logger = loggerService.createChild('GalleryService');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load database'));
    });
  });

  describe('getImages', () => {
    it('should return paginated images', async () => {
      const query: GalleryQueryDto = {
        page: 1,
        limit: 2,
        sortBy: 'date',
        sortOrder: 'desc',
      };

      const result = await service.getImages(query);

      expect(result.images).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('should sort images by date ascending', async () => {
      const query: GalleryQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'date',
        sortOrder: 'asc',
      };

      const result = await service.getImages(query);

      expect(result.images[0].id).toBe('image1');
      expect(result.images[1].id).toBe('image2');
      expect(result.images[2].id).toBe('image3');
    });

    it('should sort images by date descending', async () => {
      const query: GalleryQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'date',
        sortOrder: 'desc',
      };

      const result = await service.getImages(query);

      expect(result.images[0].id).toBe('image3');
      expect(result.images[1].id).toBe('image2');
      expect(result.images[2].id).toBe('image1');
    });

    it('should sort images by name', async () => {
      const query: GalleryQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const result = await service.getImages(query);

      expect(result.images[0].id).toBe('image1');
      expect(result.images[1].id).toBe('image2');
      expect(result.images[2].id).toBe('image3');
    });

    it('should sort images by size', async () => {
      const query: GalleryQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'size',
        sortOrder: 'desc',
      };

      const result = await service.getImages(query);

      expect(result.images[0].id).toBe('image2'); // Largest
      expect(result.images[1].id).toBe('image1');
      expect(result.images[2].id).toBe('image3'); // Smallest
    });

    it('should filter images by date range', async () => {
      const query: GalleryQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'date',
        sortOrder: 'asc',
        fromDate: '2024-01-01',
        toDate: '2024-01-02',
      };

      const result = await service.getImages(query);

      expect(result.images).toHaveLength(2);
      expect(result.images[0].id).toBe('image1');
      expect(result.images[1].id).toBe('image2');
    });

    it('should handle page 2 pagination', async () => {
      const query: GalleryQueryDto = {
        page: 2,
        limit: 2,
        sortBy: 'date',
        sortOrder: 'asc',
      };

      const result = await service.getImages(query);

      expect(result.images).toHaveLength(1);
      expect(result.images[0].id).toBe('image3');
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('getLatestImages', () => {
    it('should return latest images', async () => {
      const result = await service.getLatestImages(2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('image3'); // Most recent
      expect(result[1].id).toBe('image2');
    });

    it('should handle limit greater than available images', async () => {
      const result = await service.getLatestImages(10);

      expect(result).toHaveLength(3);
    });
  });

  describe('getRandomImages', () => {
    it('should return random images', async () => {
      const result = await service.getRandomImages(2);

      expect(result).toHaveLength(2);
      expect(mockImages.map(img => img.id)).toContain(result[0].id);
      expect(mockImages.map(img => img.id)).toContain(result[1].id);
    });

    it('should handle count greater than available images', async () => {
      const result = await service.getRandomImages(10);

      expect(result).toHaveLength(3);
    });
  });

  describe('getImageById', () => {
    it('should return image by id', async () => {
      const result = await service.getImageById('image2');

      expect(result).toBeDefined();
      expect(result?.id).toBe('image2');
      expect(result?.filename).toBe('image2.jpg');
    });

    it('should return null for non-existent id', async () => {
      const result = await service.getImageById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteImage', () => {
    beforeEach(() => {
      (fileService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (fileService.writeFile as jest.Mock).mockResolvedValue(undefined);
    });

    it('should delete image and its files', async () => {
      const result = await service.deleteImage('image1');

      expect(result).toBe(true);
      expect(fileService.deleteFile).toHaveBeenCalledWith('/data/images/image1.jpg');
      expect(fileService.deleteFile).toHaveBeenCalledWith('/data/thumbs/image1.jpg');
      expect(fileService.writeFile).toHaveBeenCalled();
    });

    it('should handle image without thumbnail', async () => {
      const result = await service.deleteImage('image3');

      expect(result).toBe(true);
      expect(fileService.deleteFile).toHaveBeenCalledWith('/data/images/image3.jpg');
      expect(fileService.deleteFile).toHaveBeenCalledTimes(1);
    });

    it('should delete QR code if exists', async () => {
      // Add QR code to image
      const imageWithQr = await service.getImageById('image1');
      if (imageWithQr) {
        imageWithQr.qrcode = '/data/qr/image1.png';
      }

      const result = await service.deleteImage('image1');

      expect(result).toBe(true);
      expect(fileService.deleteFile).toHaveBeenCalledWith('/data/qr/image1.png');
    });

    it('should return false for non-existent image', async () => {
      const result = await service.deleteImage('non-existent');

      expect(result).toBe(false);
      expect(fileService.deleteFile).not.toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      (fileService.deleteFile as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const result = await service.deleteImage('image1');

      expect(result).toBe(false);
      const logger = loggerService.createChild('GalleryService');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete image'),
        expect.any(String)
      );
    });
  });

  describe('bulkDeleteImages', () => {
    beforeEach(() => {
      (fileService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (fileService.writeFile as jest.Mock).mockResolvedValue(undefined);
    });

    it('should delete multiple images', async () => {
      const result = await service.bulkDeleteImages(['image1', 'image2']);

      expect(result.deleted).toBe(2);
      expect(result.failed).toBe(0);
      expect(fileService.deleteFile).toHaveBeenCalledTimes(4); // 2 images + 2 thumbnails
    });

    it('should handle mixed success and failure', async () => {
      const result = await service.bulkDeleteImages(['image1', 'non-existent', 'image2']);

      expect(result.deleted).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should handle all failures', async () => {
      (fileService.deleteFile as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const result = await service.bulkDeleteImages(['image1', 'image2']);

      expect(result.deleted).toBe(0);
      expect(result.failed).toBe(2);
    });
  });

  describe('getStatistics', () => {
    it('should return gallery statistics', async () => {
      const stats = await service.getStatistics();

      expect(stats.totalImages).toBe(3);
      expect(stats.totalSize).toBe(3584000); // Sum of all image sizes
      expect(stats.averageSize).toBe(3584000 / 3);
      expect(stats.oldestImage?.id).toBe('image1');
      expect(stats.newestImage?.id).toBe('image3');
    });

    it('should handle empty gallery', async () => {
      // Clear database
      (fileService.readFile as jest.Mock).mockResolvedValue('{}');
      const emptyService = new GalleryService(configService, fileService, loggerService);
      await new Promise(resolve => setTimeout(resolve, 10));

      const stats = await emptyService.getStatistics();

      expect(stats.totalImages).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageSize).toBe(0);
      expect(stats.oldestImage).toBeNull();
      expect(stats.newestImage).toBeNull();
    });
  });

  describe('rebuildDatabase', () => {
    beforeEach(() => {
      (fileService.listFiles as jest.Mock).mockResolvedValue([
        '/data/images/new1.jpg',
        '/data/images/new2.jpg',
      ]);
      (fileService.getStats as jest.Mock).mockResolvedValue({
        size: 1000000,
        birthtime: new Date('2024-02-01'),
      });
      (fileService.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fileService.exists as jest.Mock).mockResolvedValue(false);
      
      const mockSharp = sharp as jest.MockedFunction<typeof sharp>;
      (mockSharp as any).mockReturnValue({
        metadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
        }),
      });
    });

    it('should rebuild database from filesystem', async () => {
      const result = await service.rebuildDatabase();

      expect(result.count).toBe(2);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(fileService.listFiles).toHaveBeenCalledWith('/data/images', {
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      });
      expect(fileService.writeFile).toHaveBeenCalled();
    });

    it('should handle image processing errors', async () => {
      (sharp as any).mockImplementation(() => {
        throw new Error('Invalid image');
      });

      const result = await service.rebuildDatabase();

      expect(result.count).toBe(0);
      const logger = loggerService.createChild('GalleryService');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process image')
      );
    });

    it('should create thumbnails paths if they exist', async () => {
      (fileService.exists as jest.Mock)
        .mockResolvedValueOnce(false) // gallery.json
        .mockResolvedValueOnce(true)  // thumbnail 1
        .mockResolvedValueOnce(true); // thumbnail 2

      await service.rebuildDatabase();

      const images = await service.getLatestImages(10);
      expect(images[0].thumbnail).toBeDefined();
    });
  });

  describe('Database persistence', () => {
    it('should save database after changes', async () => {
      (fileService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (fileService.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.deleteImage('image1');

      expect(fileService.writeFile).toHaveBeenCalledWith(
        '/data/gallery.json',
        expect.any(String)
      );
    });

    it('should handle save errors gracefully', async () => {
      (fileService.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));
      (fileService.deleteFile as jest.Mock).mockResolvedValue(undefined);

      // Should not throw, just log error
      await service.deleteImage('image1');

      const logger = loggerService.createChild('GalleryService');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save gallery database'),
        expect.any(String)
      );
    });

    it('should handle missing configuration gracefully', async () => {
      (configService.get as jest.Mock).mockReturnValue(null);

      const result = await service.rebuildDatabase();

      expect(result.count).toBe(0);
      const logger = loggerService.createChild('GalleryService');
      expect(logger.warn).toHaveBeenCalledWith(
        'Configuration not ready, skipping database save'
      );
    });
  });
});