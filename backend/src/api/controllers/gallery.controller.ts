import { Controller, Get, Post, Query, Delete, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GalleryQueryDto, GalleryResponseDto, DeleteImageDto, BulkDeleteDto } from '../dto/gallery.dto';
import { GalleryService } from '../services/gallery.service';
import { LoggerService } from '../../services/logger.service';

@ApiTags('gallery')
@Controller('api/gallery')
export class GalleryController {
  private readonly logger: LoggerService;
  
  constructor(
    private readonly galleryService: GalleryService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('GalleryController');
  }
  
  @Get()
  @ApiOperation({ summary: 'Get gallery images with pagination' })
  @ApiResponse({ status: 200, description: 'Gallery images', type: GalleryResponseDto })
  async getGallery(@Query() query: GalleryQueryDto): Promise<GalleryResponseDto> {
    try {
      this.logger.log(`Gallery request: page=${query.page}, limit=${query.limit}`);
      return await this.galleryService.getImages(query);
    } catch (error) {
      this.logger.error(`Gallery fetch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Gallery fetch failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('latest')
  @ApiOperation({ summary: 'Get latest images' })
  @ApiResponse({ status: 200, description: 'Latest images' })
  async getLatestImages(@Query('limit') limit: number = 10) {
    try {
      this.logger.log(`Fetching latest ${limit} images`);
      return await this.galleryService.getLatestImages(limit);
    } catch (error) {
      this.logger.error(`Latest images fetch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Latest images fetch failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('random')
  @ApiOperation({ summary: 'Get random images' })
  @ApiResponse({ status: 200, description: 'Random images' })
  async getRandomImages(@Query('count') count: number = 1) {
    try {
      this.logger.log(`Fetching ${count} random images`);
      return await this.galleryService.getRandomImages(count);
    } catch (error) {
      this.logger.error(`Random images fetch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Random images fetch failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('stats')
  @ApiOperation({ summary: 'Get gallery statistics' })
  @ApiResponse({ status: 200, description: 'Gallery statistics' })
  async getGalleryStats() {
    try {
      this.logger.log('Fetching gallery statistics');
      return await this.galleryService.getStatistics();
    } catch (error) {
      this.logger.error(`Gallery stats failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Gallery stats failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get(':id')
  @ApiOperation({ summary: 'Get image by ID' })
  @ApiParam({ name: 'id', description: 'Image ID' })
  @ApiResponse({ status: 200, description: 'Image details' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async getImage(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching image: ${id}`);
      const image = await this.galleryService.getImageById(id);
      
      if (!image) {
        throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
      }
      
      return image;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Image fetch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Image fetch failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Delete(':id')
  @ApiOperation({ summary: 'Delete image by ID' })
  @ApiParam({ name: 'id', description: 'Image ID' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async deleteImage(@Param('id') id: string, @Query() query: DeleteImageDto) {
    try {
      this.logger.log(`Deleting image: ${id}`);
      const result = await this.galleryService.deleteImage(id, query.deleteFromRemote);
      
      if (!result) {
        throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
      }
      
      return { success: true, message: 'Image deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Image deletion failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Image deletion failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Delete('bulk')
  @ApiOperation({ summary: 'Delete multiple images' })
  @ApiResponse({ status: 200, description: 'Images deleted successfully' })
  async bulkDeleteImages(@Body() bulkDeleteDto: BulkDeleteDto) {
    try {
      this.logger.log(`Bulk deleting ${bulkDeleteDto.ids.length} images`);
      const results = await this.galleryService.bulkDeleteImages(
        bulkDeleteDto.ids,
        bulkDeleteDto.deleteFromRemote
      );
      
      return {
        success: true,
        message: `Deleted ${results.deleted} images`,
        deleted: results.deleted,
        failed: results.failed,
      };
    } catch (error) {
      this.logger.error(`Bulk deletion failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Bulk deletion failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('rebuild')
  @ApiOperation({ summary: 'Rebuild gallery database from filesystem' })
  @ApiResponse({ status: 200, description: 'Database rebuilt successfully' })
  async rebuildDatabase() {
    try {
      this.logger.log('Rebuilding gallery database');
      const result = await this.galleryService.rebuildDatabase();
      
      return {
        success: true,
        message: 'Database rebuilt successfully',
        images: result.count,
        duration: result.duration,
      };
    } catch (error) {
      this.logger.error(`Database rebuild failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Database rebuild failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}