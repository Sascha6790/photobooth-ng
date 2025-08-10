import { Injectable } from '@nestjs/common';
import { GalleryQueryDto, GalleryResponseDto, ImageDto } from '../dto/gallery.dto';
import { ConfigurationService } from '../../config/configuration.service';
import { FileService } from '../../services/file.service';
import { LoggerService } from '../../services/logger.service';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class GalleryService {
  private imageDatabase: Map<string, ImageDto> = new Map();
  private readonly logger: LoggerService;
  
  constructor(
    private readonly configService: ConfigurationService,
    private readonly fileService: FileService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('GalleryService');
    // Load database after initialization
    setTimeout(() => this.loadDatabase().catch(err => 
      this.logger.error(`Failed to load database: ${err.message}`)
    ), 0);
  }
  
  async getImages(query: GalleryQueryDto): Promise<GalleryResponseDto> {
    const images = Array.from(this.imageDatabase.values());
    
    // Apply date filters
    let filteredImages = images;
    if (query.fromDate) {
      const fromDate = new Date(query.fromDate);
      filteredImages = filteredImages.filter(img => new Date(img.createdAt) >= fromDate);
    }
    if (query.toDate) {
      const toDate = new Date(query.toDate);
      filteredImages = filteredImages.filter(img => new Date(img.createdAt) <= toDate);
    }
    
    // Sort images
    filteredImages.sort((a, b) => {
      let compareValue = 0;
      
      switch (query.sortBy) {
        case 'date':
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'name':
          compareValue = a.filename.localeCompare(b.filename);
          break;
        case 'size':
          compareValue = a.size - b.size;
          break;
      }
      
      return query.sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    // Paginate
    const total = filteredImages.length;
    const totalPages = Math.ceil(total / query.limit);
    const start = (query.page - 1) * query.limit;
    const end = start + query.limit;
    const paginatedImages = filteredImages.slice(start, end);
    
    return {
      images: paginatedImages,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
      hasNext: query.page < totalPages,
      hasPrev: query.page > 1,
    };
  }
  
  async getLatestImages(limit: number): Promise<ImageDto[]> {
    const images = Array.from(this.imageDatabase.values());
    images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return images.slice(0, limit);
  }
  
  async getRandomImages(count: number): Promise<ImageDto[]> {
    const images = Array.from(this.imageDatabase.values());
    const shuffled = images.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  async getImageById(id: string): Promise<ImageDto | null> {
    return this.imageDatabase.get(id) || null;
  }
  
  async deleteImage(id: string, deleteFromRemote: boolean = false): Promise<boolean> {
    const image = this.imageDatabase.get(id);
    if (!image) {
      return false;
    }
    
    try {
      // Delete main image
      await this.fileService.deleteFile(image.path);
      
      // Delete thumbnail
      if (image.thumbnail) {
        await this.fileService.deleteFile(image.thumbnail);
      }
      
      // Delete QR code
      if (image.qrcode) {
        await this.fileService.deleteFile(image.qrcode);
      }
      
      // Delete from remote storage if requested
      if (deleteFromRemote) {
        // TODO: Implement remote storage deletion
      }
      
      // Remove from database
      this.imageDatabase.delete(id);
      await this.saveDatabase();
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete image ${id}: ${error.message}`, error.stack);
      return false;
    }
  }
  
  async bulkDeleteImages(
    ids: string[],
    deleteFromRemote: boolean = false
  ): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;
    
    for (const id of ids) {
      const success = await this.deleteImage(id, deleteFromRemote);
      if (success) {
        deleted++;
      } else {
        failed++;
      }
    }
    
    return { deleted, failed };
  }
  
  async getStatistics() {
    const images = Array.from(this.imageDatabase.values());
    const totalSize = images.reduce((sum, img) => sum + img.size, 0);
    
    return {
      totalImages: images.length,
      totalSize,
      averageSize: images.length > 0 ? totalSize / images.length : 0,
      oldestImage: images.length > 0
        ? images.reduce((oldest, img) =>
            new Date(img.createdAt) < new Date(oldest.createdAt) ? img : oldest
          )
        : null,
      newestImage: images.length > 0
        ? images.reduce((newest, img) =>
            new Date(img.createdAt) > new Date(newest.createdAt) ? img : newest
          )
        : null,
    };
  }
  
  async rebuildDatabase(): Promise<{ count: number; duration: number }> {
    const startTime = Date.now();
    const config = this.configService.get();
    
    this.imageDatabase.clear();
    
    const imageFiles = await this.fileService.listFiles(config.paths.images, {
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    });
    
    for (const imagePath of imageFiles) {
      try {
        const filename = path.basename(imagePath);
        const id = filename.replace(/\.[^/.]+$/, ''); // Remove extension
        const stats = await this.fileService.getStats(imagePath);
        const metadata = await sharp(imagePath).metadata();
        
        const imageDto: ImageDto = {
          id,
          filename,
          path: imagePath,
          thumbnail: await this.getThumbnailPath(imagePath),
          size: stats.size,
          width: metadata.width || 0,
          height: metadata.height || 0,
          createdAt: stats.birthtime,
          printCount: 0,
          metadata: {},
        };
        
        this.imageDatabase.set(id, imageDto);
      } catch (error) {
        this.logger.error(`Failed to process image ${imagePath}: ${error.message}`);
      }
    }
    
    await this.saveDatabase();
    
    const duration = Date.now() - startTime;
    return { count: this.imageDatabase.size, duration };
  }
  
  private async loadDatabase(): Promise<void> {
    try {
      const config = this.configService.get();
      if (!config || !config.paths) {
        this.logger.warn('Configuration not ready, skipping database load');
        return;
      }
      const dbPath = path.join(config.paths.data, 'gallery.json');
      
      if (await this.fileService.exists(dbPath)) {
        const dbContent = await this.fileService.readFile(dbPath);
        const dbData = JSON.parse(dbContent);
        
        for (const [id, image] of Object.entries(dbData)) {
          this.imageDatabase.set(id, image as ImageDto);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to load gallery database: ${error.message}`, error.stack);
    }
  }
  
  private async saveDatabase(): Promise<void> {
    try {
      const config = this.configService.get();
      if (!config || !config.paths) {
        this.logger.warn('Configuration not ready, skipping database save');
        return;
      }
      const dbPath = path.join(config.paths.data, 'gallery.json');
      
      const dbData = Object.fromEntries(this.imageDatabase);
      await this.fileService.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save gallery database: ${error.message}`, error.stack);
    }
  }
  
  private async getThumbnailPath(imagePath: string): Promise<string | undefined> {
    const config = this.configService.get();
    if (!config || !config.paths) {
      return undefined;
    }
    const filename = path.basename(imagePath);
    const thumbnailPath = path.join(config.paths.thumbs, filename);
    
    if (await this.fileService.exists(thumbnailPath)) {
      return thumbnailPath;
    }
    
    return undefined;
  }
}