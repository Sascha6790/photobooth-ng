import { Controller, Get, Put, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdateSettingsDto, SettingsResponseDto } from '../dto/settings.dto';
import { ConfigurationService } from '../../config/configuration.service';
import { LoggerService } from '../../services/logger.service';

@ApiTags('settings')
@Controller('api/settings')
export class SettingsController {
  private readonly logger: LoggerService;
  
  constructor(
    private readonly configService: ConfigurationService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('SettingsController');
  }
  
  @Get()
  @ApiOperation({ summary: 'Get current settings' })
  @ApiResponse({ status: 200, description: 'Current settings', type: SettingsResponseDto })
  async getSettings(): Promise<SettingsResponseDto> {
    try {
      this.logger.log('Fetching current settings');
      const config = this.configService.get();
      
      return {
        config,
        version: config.app.version,
        lastModified: new Date(),
      };
    } catch (error) {
      this.logger.error(`Settings fetch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Settings fetch failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Put()
  @ApiOperation({ summary: 'Update settings' })
  @ApiResponse({ status: 200, description: 'Settings updated', type: SettingsResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid settings' })
  async updateSettings(@Body() updateDto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    try {
      this.logger.log('Updating settings');
      await this.configService.update(updateDto as any);
      
      const config = this.configService.get();
      
      return {
        config,
        version: config.app.version,
        lastModified: new Date(),
      };
    } catch (error) {
      this.logger.error(`Settings update failed: ${error.message}`, error.stack);
      
      if (error.message.includes('validation')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      
      throw new HttpException(
        `Settings update failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('section/:section')
  @ApiOperation({ summary: 'Get specific settings section' })
  @ApiResponse({ status: 200, description: 'Settings section' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async getSettingsSection(@Param('section') section: string) {
    try {
      this.logger.log(`Fetching settings section: ${section}`);
      const config = this.configService.get();
      
      if (!config[section]) {
        throw new HttpException('Settings section not found', HttpStatus.NOT_FOUND);
      }
      
      return {
        section,
        data: config[section],
        lastModified: new Date(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Settings section fetch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Settings section fetch failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Put('section/:section')
  @ApiOperation({ summary: 'Update specific settings section' })
  @ApiResponse({ status: 200, description: 'Settings section updated' })
  @ApiResponse({ status: 400, description: 'Invalid settings' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async updateSettingsSection(
    @Param('section') section: string,
    @Body() updateData: any
  ) {
    try {
      this.logger.log(`Updating settings section: ${section}`);
      const config = this.configService.get();
      
      if (!config[section]) {
        throw new HttpException('Settings section not found', HttpStatus.NOT_FOUND);
      }
      
      const update = { [section]: updateData };
      await this.configService.update(update);
      
      const updatedConfig = this.configService.get();
      
      return {
        section,
        data: updatedConfig[section],
        lastModified: new Date(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Settings section update failed: ${error.message}`, error.stack);
      
      if (error.message.includes('validation')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      
      throw new HttpException(
        `Settings section update failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('reset')
  @ApiOperation({ summary: 'Reset settings to defaults' })
  @ApiResponse({ status: 200, description: 'Settings reset successfully' })
  async resetSettings() {
    try {
      this.logger.log('Resetting settings to defaults');
      // Implementation would reset to default configuration
      throw new Error('Reset not yet implemented');
    } catch (error) {
      this.logger.error(`Settings reset failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Settings reset failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('export')
  @ApiOperation({ summary: 'Export settings as JSON file' })
  @ApiResponse({ status: 200, description: 'Settings exported' })
  async exportSettings() {
    try {
      this.logger.log('Exporting settings');
      const config = this.configService.get();
      
      return {
        filename: `photobooth-settings-${Date.now()}.json`,
        data: config,
      };
    } catch (error) {
      this.logger.error(`Settings export failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Settings export failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('import')
  @ApiOperation({ summary: 'Import settings from JSON' })
  @ApiResponse({ status: 200, description: 'Settings imported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid settings file' })
  async importSettings(@Body() importData: any) {
    try {
      this.logger.log('Importing settings');
      await this.configService.update(importData);
      
      const config = this.configService.get();
      
      return {
        success: true,
        message: 'Settings imported successfully',
        config,
      };
    } catch (error) {
      this.logger.error(`Settings import failed: ${error.message}`, error.stack);
      
      if (error.message.includes('validation')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      
      throw new HttpException(
        `Settings import failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}