import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CameraService, CaptureOptions } from '../services/camera.service';
import { GpioService } from '../services/gpio.service';
import { ButtonConfig, LedConfig } from '../interfaces/gpio.interface';
import { CameraSettings } from '../interfaces/camera.interface';

@ApiTags('hardware')
@Controller('api/hardware')
export class HardwareController {
  constructor(
    private readonly cameraService: CameraService,
    private readonly gpioService: GpioService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get hardware status' })
  @ApiResponse({ status: 200, description: 'Hardware status retrieved successfully' })
  async getStatus() {
    const cameraAvailable = await this.cameraService.isAvailable();
    const gpioAvailable = this.gpioService.isAvailable();
    const cameraStrategy = this.cameraService.getCurrentStrategy();
    const cameraCapabilities = this.cameraService.getCapabilities();

    return {
      camera: {
        available: cameraAvailable,
        strategy: cameraStrategy,
        capabilities: cameraCapabilities,
      },
      gpio: {
        available: gpioAvailable,
      },
      platform: process.platform,
      nodeVersion: process.version,
    };
  }

  @Post('camera/capture')
  @ApiOperation({ summary: 'Capture a photo' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        countdown: { type: 'number', example: 3 },
        sound: { type: 'boolean', example: true },
        flash: { type: 'boolean', example: true },
        saveToGallery: { type: 'boolean', example: true },
        settings: { 
          type: 'object',
          properties: {
            iso: { type: 'number', example: 200 },
            aperture: { type: 'string', example: 'f/5.6' },
            shutterSpeed: { type: 'string', example: '1/125' },
          }
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Photo captured successfully' })
  @ApiResponse({ status: 500, description: 'Capture failed' })
  async capture(@Body() options: CaptureOptions) {
    try {
      const result = await this.cameraService.capture(options);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('camera/capture-multiple')
  @ApiOperation({ summary: 'Capture multiple photos' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['count', 'interval'],
      properties: {
        count: { type: 'number', example: 4 },
        interval: { type: 'number', example: 2000 },
        options: { type: 'object' }
      }
    }
  })
  async captureMultiple(@Body() body: { count: number; interval: number; options?: CaptureOptions }) {
    try {
      const results = await this.cameraService.captureMultiple(
        body.count,
        body.interval,
        body.options,
      );
      return {
        success: true,
        data: results,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('camera/video/start')
  @ApiOperation({ summary: 'Start video recording' })
  async startVideo() {
    try {
      await this.cameraService.startVideo();
      return {
        success: true,
        message: 'Video recording started',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('camera/video/stop')
  @ApiOperation({ summary: 'Stop video recording' })
  async stopVideo() {
    try {
      const result = await this.cameraService.stopVideo();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('camera/settings')
  @ApiOperation({ summary: 'Get current camera settings' })
  async getCameraSettings() {
    try {
      const settings = await this.cameraService.getSettings();
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('camera/settings')
  @ApiOperation({ summary: 'Update camera settings' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        iso: { type: 'number' },
        aperture: { type: 'string' },
        shutterSpeed: { type: 'string' },
        whiteBalance: { type: 'string' },
        focusMode: { type: 'string', enum: ['auto', 'manual'] },
      }
    }
  })
  async updateCameraSettings(@Body() settings: Partial<CameraSettings>) {
    try {
      await this.cameraService.updateSettings(settings);
      return {
        success: true,
        message: 'Settings updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('camera/switch-strategy')
  @ApiOperation({ summary: 'Switch camera strategy' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['strategy'],
      properties: {
        strategy: { type: 'string', enum: ['mock', 'webcam', 'gphoto2'] }
      }
    }
  })
  async switchCameraStrategy(@Body('strategy') strategy: 'mock' | 'webcam' | 'gphoto2') {
    try {
      await this.cameraService.switchStrategy(strategy);
      return {
        success: true,
        message: `Switched to ${strategy} strategy`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('gpio/button/register')
  @ApiOperation({ summary: 'Register a GPIO button' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['pin', 'name'],
      properties: {
        pin: { type: 'number', example: 17 },
        name: { type: 'string', example: 'capture' },
        debounceTime: { type: 'number', example: 50 },
        pullUp: { type: 'boolean', example: true },
      }
    }
  })
  async registerButton(@Body() config: ButtonConfig) {
    try {
      await this.gpioService.registerButton(config);
      return {
        success: true,
        message: `Button "${config.name}" registered on pin ${config.pin}`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('gpio/led/register')
  @ApiOperation({ summary: 'Register a GPIO LED' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['pin', 'name'],
      properties: {
        pin: { type: 'number', example: 27 },
        name: { type: 'string', example: 'status' },
        defaultState: { type: 'number', enum: [0, 1], example: 0 },
      }
    }
  })
  async registerLed(@Body() config: LedConfig) {
    try {
      await this.gpioService.registerLed(config);
      return {
        success: true,
        message: `LED "${config.name}" registered on pin ${config.pin}`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('gpio/led/:name/set')
  @ApiOperation({ summary: 'Set LED state' })
  @ApiParam({ name: 'name', description: 'LED name', example: 'status' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['state'],
      properties: {
        state: { type: 'number', enum: [0, 1], example: 1 }
      }
    }
  })
  async setLed(@Param('name') name: string, @Body('state') state: 0 | 1) {
    try {
      await this.gpioService.setLed(name, state);
      return {
        success: true,
        message: `LED "${name}" set to ${state}`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('gpio/led/:name/toggle')
  @ApiOperation({ summary: 'Toggle LED state' })
  @ApiParam({ name: 'name', description: 'LED name', example: 'status' })
  async toggleLed(@Param('name') name: string) {
    try {
      await this.gpioService.toggleLed(name);
      return {
        success: true,
        message: `LED "${name}" toggled`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('gpio/led/:name/blink')
  @ApiOperation({ summary: 'Blink LED' })
  @ApiParam({ name: 'name', description: 'LED name', example: 'status' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        duration: { type: 'number', example: 1000 },
        interval: { type: 'number', example: 500 },
      }
    }
  })
  async blinkLed(
    @Param('name') name: string,
    @Body() body: { duration?: number; interval?: number },
  ) {
    try {
      await this.gpioService.blinkLed(name, body.duration, body.interval);
      return {
        success: true,
        message: `LED "${name}" blinking`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('gpio/button/:name')
  @ApiOperation({ summary: 'Read button state' })
  @ApiParam({ name: 'name', description: 'Button name', example: 'capture' })
  async readButton(@Param('name') name: string) {
    try {
      const state = await this.gpioService.readButton(name);
      return {
        success: true,
        data: {
          name,
          state,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test hardware connections' })
  async testConnection() {
    try {
      const cameraTest = await this.cameraService.testConnection();
      const gpioTest = this.gpioService.isAvailable();

      return {
        success: true,
        data: {
          camera: cameraTest,
          gpio: gpioTest,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}