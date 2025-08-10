import { Controller, Post, Body, Get, Query, UseInterceptors, UploadedFile, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { CaptureRequestDto, CaptureResponseDto, PreviewRequestDto } from '../dto/capture.dto';
import { CaptureService } from '../services/capture.service';
import { LoggerService } from '../../services/logger.service';
import { RateLimit, RateLimits } from '../../decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../guards/rate-limit.guard';
import * as multer from 'multer';

const storage = multer.diskStorage({
  destination: './data/tmp',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.jpg');
  }
});

@ApiTags('capture')
@Controller('api/capture')
@UseGuards(RateLimitGuard)
export class CaptureController {
  private readonly logger: LoggerService;
  
  constructor(
    private readonly captureService: CaptureService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('CaptureController');
  }
  
  @Post()
  @RateLimit(RateLimits.CAPTURE)
  @ApiOperation({ summary: 'Capture a photo, video, or collage' })
  @ApiResponse({ status: 200, description: 'Capture successful', type: CaptureResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async capture(@Body() captureDto: CaptureRequestDto): Promise<CaptureResponseDto> {
    try {
      this.logger.log(`Capture request: ${captureDto.mode}`);
      const result = await this.captureService.capture(captureDto);
      return result;
    } catch (error) {
      this.logger.error(`Capture failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Capture failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('upload')
  @RateLimit(RateLimits.UPLOAD)
  @ApiOperation({ summary: 'Upload a captured image from canvas' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Upload successful', type: CaptureResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @UseInterceptors(FileInterceptor('image', { storage }))
  async uploadCapture(
    @UploadedFile() file: Express.Multer.File,
    @Body() captureDto: CaptureRequestDto
  ): Promise<CaptureResponseDto> {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }
      
      this.logger.log(`Upload capture: ${file.filename}`);
      const result = await this.captureService.processUploadedImage(file, captureDto);
      return result;
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Upload failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('preview')
  @ApiOperation({ summary: 'Get camera preview stream' })
  @ApiResponse({ status: 200, description: 'Preview stream' })
  async getPreview(@Query() previewDto: PreviewRequestDto) {
    try {
      this.logger.log('Preview request');
      return await this.captureService.getPreviewStream(previewDto);
    } catch (error) {
      this.logger.error(`Preview failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Preview failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('countdown/start')
  @ApiOperation({ summary: 'Start capture countdown' })
  @ApiResponse({ status: 200, description: 'Countdown started' })
  async startCountdown(@Body() body: { seconds?: number }) {
    try {
      const seconds = body.seconds || 5;
      this.logger.log(`Starting countdown: ${seconds} seconds`);
      await this.captureService.startCountdown(seconds);
      return { success: true, message: 'Countdown started' };
    } catch (error) {
      this.logger.error(`Countdown failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Countdown failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('countdown/cancel')
  @ApiOperation({ summary: 'Cancel capture countdown' })
  @ApiResponse({ status: 200, description: 'Countdown cancelled' })
  async cancelCountdown() {
    try {
      this.logger.log('Cancelling countdown');
      await this.captureService.cancelCountdown();
      return { success: true, message: 'Countdown cancelled' };
    } catch (error) {
      this.logger.error(`Cancel countdown failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Cancel countdown failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}