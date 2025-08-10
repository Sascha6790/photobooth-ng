import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QrcodeService } from '../services/qrcode.service';
import { LoggerService } from '../../services/logger.service';

@ApiTags('qrcode')
@Controller('api/qrcode')
export class QrcodeController {
  private readonly logger: LoggerService;
  
  constructor(
    private readonly qrcodeService: QrcodeService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('QrcodeController');
  }
  
  @Get()
  @ApiOperation({ summary: 'Generate QR code for image' })
  @ApiResponse({ status: 200, description: 'QR code generated' })
  async generateQrCode(@Query('imageId') imageId: string) {
    try {
      this.logger.log(`QR code request for image: ${imageId}`);
      const result = await this.qrcodeService.generateForImage(imageId);
      return result;
    } catch (error) {
      this.logger.error(`QR code generation failed: ${error.message}`, error.stack);
      throw new HttpException(
        `QR code generation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}