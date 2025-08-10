import { Controller, Post, Get, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ImageProcessingService } from '../services/image-processing.service';
import { LoggerService } from '../../services/logger.service';

@ApiTags('chromakeying')
@Controller('api/chromakeying')
export class ChromakeyingController {
  private readonly logger: LoggerService;
  
  constructor(
    private readonly imageProcessingService: ImageProcessingService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('ChromakeyingController');
  }
  
  @Post('apply')
  @ApiOperation({ summary: 'Apply chromakey effect' })
  @ApiResponse({ status: 200, description: 'Chromakey applied' })
  async applyChromakey(@Body() chromakeyDto: { imageId: string; background: string }) {
    try {
      this.logger.log(`Chromakey request for image: ${chromakeyDto.imageId}`);
      const result = await this.imageProcessingService.applyChromakey(
        chromakeyDto.imageId,
        chromakeyDto.background
      );
      return result;
    } catch (error) {
      this.logger.error(`Chromakey failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Chromakey failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('backgrounds')
  @ApiOperation({ summary: 'Get available backgrounds' })
  @ApiResponse({ status: 200, description: 'Available backgrounds' })
  async getBackgrounds() {
    try {
      this.logger.log('Fetching chromakey backgrounds');
      return await this.imageProcessingService.getAvailableBackgrounds();
    } catch (error) {
      this.logger.error(`Backgrounds fetch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Backgrounds fetch failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}