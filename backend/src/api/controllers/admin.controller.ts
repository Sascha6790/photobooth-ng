import { Controller, Post, Get, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigurationService } from '../../config/configuration.service';
import { LoggerService } from '../../services/logger.service';

@ApiTags('admin')
@Controller('api/admin')
export class AdminController {
  private readonly logger: LoggerService;
  
  constructor(
    private readonly configService: ConfigurationService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createChild('AdminController');
  }
  
  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: { password?: string; pin?: string }) {
    try {
      this.logger.log('Admin login attempt');
      const config = this.configService.get();
      
      if (loginDto.password && loginDto.password === config.admin.password) {
        return { success: true, token: 'admin-token' }; // TODO: Implement proper JWT
      }
      
      if (loginDto.pin && loginDto.pin === config.admin.pin) {
        return { success: true, token: 'admin-token' }; // TODO: Implement proper JWT
      }
      
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Login failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('logout')
  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout() {
    this.logger.log('Admin logout');
    return { success: true, message: 'Logged out successfully' };
  }
  
  @Get('status')
  @ApiOperation({ summary: 'Get system status' })
  @ApiResponse({ status: 200, description: 'System status' })
  async getSystemStatus() {
    try {
      this.logger.log('Fetching system status');
      return {
        status: 'operational',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node: process.version,
        platform: process.platform,
      };
    } catch (error) {
      this.logger.error(`Status fetch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Status fetch failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('shutdown')
  @ApiOperation({ summary: 'Shutdown system' })
  @ApiResponse({ status: 200, description: 'Shutdown initiated' })
  async shutdown() {
    try {
      this.logger.warn('System shutdown requested');
      // TODO: Implement proper shutdown sequence
      return { success: true, message: 'Shutdown initiated' };
    } catch (error) {
      this.logger.error(`Shutdown failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Shutdown failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('restart')
  @ApiOperation({ summary: 'Restart system' })
  @ApiResponse({ status: 200, description: 'Restart initiated' })
  async restart() {
    try {
      this.logger.warn('System restart requested');
      // TODO: Implement proper restart sequence
      return { success: true, message: 'Restart initiated' };
    } catch (error) {
      this.logger.error(`Restart failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Restart failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}