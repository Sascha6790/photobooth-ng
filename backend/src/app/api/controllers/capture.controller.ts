import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CaptureDto, CaptureResponseDto } from '../dto/capture.dto';

@ApiTags('capture')
@Controller('api/capture')
export class CaptureController {
  @Post()
  @ApiOperation({ summary: 'Capture a photo or video' })
  @ApiResponse({ status: 201, description: 'Photo/video captured successfully', type: CaptureResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async capture(@Body() captureDto: CaptureDto): Promise<CaptureResponseDto> {
    try {
      // TODO: Implement actual capture logic with CameraService
      // For now, return mock response
      const mockResponse: CaptureResponseDto = {
        success: true,
        filename: `photo_${Date.now()}.jpg`,
        path: `/data/tmp/photo_${Date.now()}.jpg`,
        timestamp: new Date().toISOString(),
        message: 'Photo captured successfully'
      };
      
      return mockResponse;
    } catch (error) {
      throw new HttpException(
        'Failed to capture photo/video',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}