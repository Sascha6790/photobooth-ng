import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GalleryQueryDto, GalleryResponseDto, GalleryImageDto } from '../dto/gallery.dto';

@ApiTags('gallery')
@Controller('api/gallery')
export class GalleryController {
  @Get()
  @ApiOperation({ summary: 'Get gallery images' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of images to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Gallery images retrieved successfully', type: GalleryResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getGallery(@Query() query: GalleryQueryDto): Promise<GalleryResponseDto> {
    try {
      // TODO: Implement actual gallery service logic
      // For now, return mock response
      const mockImages: GalleryImageDto[] = [
        {
          id: '1',
          filename: 'photo_001.jpg',
          path: '/data/images/photo_001.jpg',
          thumbnail: '/data/thumbs/photo_001_thumb.jpg',
          timestamp: new Date().toISOString(),
          size: 1024576,
          width: 1920,
          height: 1080
        },
        {
          id: '2',
          filename: 'photo_002.jpg',
          path: '/data/images/photo_002.jpg',
          thumbnail: '/data/thumbs/photo_002_thumb.jpg',
          timestamp: new Date().toISOString(),
          size: 2048576,
          width: 1920,
          height: 1080
        }
      ];
      
      const response: GalleryResponseDto = {
        success: true,
        images: mockImages,
        total: mockImages.length,
        limit: query.limit || 10,
        offset: query.offset || 0
      };
      
      return response;
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve gallery images',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}