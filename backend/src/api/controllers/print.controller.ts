import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrintService } from '../services/print.service';
import { LoggerService } from '../../services/logger.service';

@ApiTags('print')
@Controller('api/print')
export class PrintController {
  private readonly logger: LoggerService;
  
  constructor(
    private readonly printService: PrintService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('PrintController');
  }
  
  @Post()
  @ApiOperation({ summary: 'Print an image' })
  @ApiResponse({ status: 200, description: 'Print job created' })
  async printImage(@Body() printDto: { imageId: string; copies?: number }) {
    try {
      this.logger.log(`Print request for image: ${printDto.imageId}`);
      const result = await this.printService.printImage(printDto.imageId, printDto.copies);
      return result;
    } catch (error) {
      this.logger.error(`Print failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Print failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('queue')
  @ApiOperation({ summary: 'Get print queue' })
  @ApiResponse({ status: 200, description: 'Print queue' })
  async getPrintQueue() {
    try {
      this.logger.log('Fetching print queue');
      return await this.printService.getQueue();
    } catch (error) {
      this.logger.error(`Queue fetch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Queue fetch failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}