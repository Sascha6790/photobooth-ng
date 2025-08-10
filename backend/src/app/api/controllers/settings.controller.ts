import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SettingsDto, UpdateSettingsDto, PreviewMode, MailSecurityType } from '../dto/settings.dto';

@ApiTags('settings')
@Controller('api/settings')
export class SettingsController {
  @Get()
  @ApiOperation({ summary: 'Get current photobooth settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully', type: SettingsDto })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSettings(): Promise<SettingsDto> {
    try {
      // TODO: Implement actual ConfigurationService integration
      // For now, return mock settings
      const mockSettings: SettingsDto = {
        general: {
          language: 'en',
          photoCountdown: 5,
          collageCountdown: 3,
          previewFromCam: true,
          previewCamFlip: false,
          previewCamRotation: 0,
          previewMode: PreviewMode.DEVICE_CAM
        },
        ui: {
          showGallery: true,
          showPrintButton: true,
          showQrCode: true,
          backgroundColor: '#ffffff',
          primaryColor: '#2196f3'
        },
        print: {
          enabled: false,
          autoPrint: false,
          printQrCode: true,
          printFrame: true,
          printerName: ''
        },
        mail: {
          enabled: false,
          host: '',
          port: 587,
          security: MailSecurityType.TLS,
          username: '',
          fromAddress: '',
          fromName: 'Photobooth'
        },
        storage: {
          dataPath: '/data',
          tmpPath: '/data/tmp',
          imagesPath: '/data/images',
          thumbsPath: '/data/thumbs',
          keepImages: true
        }
      };
      
      return mockSettings;
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve settings',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post()
  @ApiOperation({ summary: 'Update photobooth settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully', type: SettingsDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto): Promise<SettingsDto> {
    try {
      // TODO: Implement actual settings update logic
      // For now, return the updated settings
      return this.getSettings();
    } catch (error) {
      throw new HttpException(
        'Failed to update settings',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}