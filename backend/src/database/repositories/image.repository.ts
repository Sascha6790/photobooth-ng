import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions, Like, In } from 'typeorm';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository';
import { Image, ImageType, ImageStatus } from '../entities/image.entity';

export interface ImageFilterOptions {
  sessionId?: string;
  type?: ImageType;
  status?: ImageStatus;
  isFavorite?: boolean;
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
  minFileSize?: number;
  maxFileSize?: number;
}

export interface ImageStatistics {
  totalImages: number;
  totalFileSize: number;
  averageFileSize: number;
  imagesByType: Record<ImageType, number>;
  imagesByStatus: Record<ImageStatus, number>;
  totalViews: number;
  totalPrints: number;
  totalDownloads: number;
  favoriteCount: number;
}

@Injectable()
export class ImageRepository extends BaseRepository<Image> {
  constructor(
    @InjectRepository(Image)
    protected readonly repository: Repository<Image>
  ) {
    super(repository);
  }

  /**
   * Find images with advanced filtering
   */
  async findWithFilters(
    filters: ImageFilterOptions = {},
    paginationOptions: PaginationOptions = {}
  ): Promise<PaginatedResult<Image>> {
    const queryBuilder = this.repository.createQueryBuilder('image');

    // Apply filters
    if (filters.sessionId) {
      queryBuilder.andWhere('image.sessionId = :sessionId', {
        sessionId: filters.sessionId,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('image.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('image.status = :status', { status: filters.status });
    }

    if (filters.isFavorite !== undefined) {
      queryBuilder.andWhere('image.isFavorite = :isFavorite', {
        isFavorite: filters.isFavorite,
      });
    }

    if (filters.fromDate) {
      queryBuilder.andWhere('image.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      queryBuilder.andWhere('image.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    if (filters.searchTerm) {
      queryBuilder.andWhere(
        '(image.filename LIKE :search OR image.metadata LIKE :search)',
        { search: `%${filters.searchTerm}%` }
      );
    }

    if (filters.minFileSize) {
      queryBuilder.andWhere('image.fileSize >= :minFileSize', {
        minFileSize: filters.minFileSize,
      });
    }

    if (filters.maxFileSize) {
      queryBuilder.andWhere('image.fileSize <= :maxFileSize', {
        maxFileSize: filters.maxFileSize,
      });
    }

    // Exclude soft deleted images by default
    queryBuilder.andWhere('image.isDeleted = :isDeleted', { isDeleted: false });

    // Apply pagination
    const {
      page = 1,
      limit = 20,
      orderBy = 'createdAt',
      orderDirection = 'DESC',
    } = paginationOptions;

    const skip = (page - 1) * limit;

    queryBuilder
      .orderBy(`image.${orderBy}`, orderDirection)
      .skip(skip)
      .take(limit);

    // Get results
    const [data, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Find recent images
   */
  async findRecent(limit: number = 10): Promise<Image[]> {
    return await this.repository.find({
      where: { isDeleted: false, status: ImageStatus.READY },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find popular images (most viewed)
   */
  async findPopular(limit: number = 10): Promise<Image[]> {
    return await this.repository.find({
      where: { isDeleted: false, status: ImageStatus.READY },
      order: { viewCount: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find favorite images
   */
  async findFavorites(sessionId?: string): Promise<Image[]> {
    const where: any = { isFavorite: true, isDeleted: false };
    if (sessionId) {
      where.sessionId = sessionId;
    }

    return await this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find images by session
   */
  async findBySession(sessionId: string): Promise<Image[]> {
    return await this.repository.find({
      where: { sessionId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find images for gallery
   */
  async findForGallery(
    page: number = 1,
    limit: number = 20,
    includeDeleted: boolean = false
  ): Promise<PaginatedResult<Image>> {
    const where: any = { status: ImageStatus.READY };
    if (!includeDeleted) {
      where.isDeleted = false;
    }

    return await this.findPaginated(
      { where },
      { page, limit, orderBy: 'createdAt', orderDirection: 'DESC' }
    );
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'viewCount', 1);
  }

  /**
   * Increment print count
   */
  async incrementPrintCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'printCount', 1);
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'downloadCount', 1);
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const image = await this.findById(id);
    if (!image) {
      throw new Error('Image not found');
    }

    image.toggleFavorite();
    await this.save(image);
    return image.isFavorite;
  }

  /**
   * Soft delete an image
   */
  async softDeleteImage(id: string): Promise<void> {
    const image = await this.findById(id);
    if (!image) {
      throw new Error('Image not found');
    }

    image.markAsDeleted();
    await this.save(image);
  }

  /**
   * Restore a soft deleted image
   */
  async restoreImage(id: string): Promise<void> {
    const image = await this.findById(id);
    if (!image) {
      throw new Error('Image not found');
    }

    image.isDeleted = false;
    image.deletedAt = null;
    image.status = ImageStatus.READY;
    await this.save(image);
  }

  /**
   * Find images to cleanup (old deleted images)
   */
  async findForCleanup(daysOld: number = 30): Promise<Image[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await this.repository.find({
      where: {
        isDeleted: true,
        deletedAt: Between(new Date(0), cutoffDate),
      },
    });
  }

  /**
   * Get image statistics
   */
  async getStatistics(sessionId?: string): Promise<ImageStatistics> {
    const queryBuilder = this.repository.createQueryBuilder('image');

    if (sessionId) {
      queryBuilder.where('image.sessionId = :sessionId', { sessionId });
    }

    queryBuilder.andWhere('image.isDeleted = :isDeleted', { isDeleted: false });

    const images = await queryBuilder.getMany();

    const stats: ImageStatistics = {
      totalImages: images.length,
      totalFileSize: 0,
      averageFileSize: 0,
      imagesByType: {} as Record<ImageType, number>,
      imagesByStatus: {} as Record<ImageStatus, number>,
      totalViews: 0,
      totalPrints: 0,
      totalDownloads: 0,
      favoriteCount: 0,
    };

    // Initialize counters
    Object.values(ImageType).forEach(type => {
      stats.imagesByType[type] = 0;
    });
    Object.values(ImageStatus).forEach(status => {
      stats.imagesByStatus[status] = 0;
    });

    // Calculate statistics
    images.forEach(image => {
      stats.totalFileSize += image.fileSize || 0;
      stats.totalViews += image.viewCount || 0;
      stats.totalPrints += image.printCount || 0;
      stats.totalDownloads += image.downloadCount || 0;
      
      if (image.isFavorite) {
        stats.favoriteCount++;
      }

      stats.imagesByType[image.type]++;
      stats.imagesByStatus[image.status]++;
    });

    if (stats.totalImages > 0) {
      stats.averageFileSize = Math.round(stats.totalFileSize / stats.totalImages);
    }

    return stats;
  }

  /**
   * Batch update image status
   */
  async batchUpdateStatus(
    imageIds: string[],
    status: ImageStatus
  ): Promise<void> {
    await this.repository.update({ id: In(imageIds) }, { status });
  }

  /**
   * Find duplicate images by hash (if implemented)
   */
  async findDuplicates(hash: string): Promise<Image[]> {
    return await this.repository
      .createQueryBuilder('image')
      .where('image.metadata->>"$.hash" = :hash', { hash })
      .andWhere('image.isDeleted = :isDeleted', { isDeleted: false })
      .getMany();
  }

  /**
   * Optimize database queries with preloaded relations
   */
  async findWithRelations(id: string): Promise<Image | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['session'],
    });
  }

  /**
   * Get storage usage by session
   */
  async getStorageUsageBySession(): Promise<Map<string, number>> {
    const result = await this.repository
      .createQueryBuilder('image')
      .select('image.sessionId', 'sessionId')
      .addSelect('SUM(image.fileSize)', 'totalSize')
      .where('image.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('image.sessionId')
      .getRawMany();

    const usageMap = new Map<string, number>();
    result.forEach(row => {
      if (row.sessionId) {
        usageMap.set(row.sessionId, parseInt(row.totalSize) || 0);
      }
    });

    return usageMap;
  }
}