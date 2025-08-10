import { Controller, Get, Query, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from '../services/metrics.service';
import { LogAggregationService, LogQuery, LogEntry, LogStatistics } from '../services/log-aggregation.service';
import { MonitoringService } from '../services/monitoring.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly logAggregationService: LogAggregationService,
    private readonly monitoringService: MonitoringService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics in text format' })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query application logs' })
  @ApiQuery({ name: 'level', required: false, enum: ['error', 'warn', 'info', 'debug'] })
  @ApiQuery({ name: 'context', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'searchTerm', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Filtered log entries' })
  async queryLogs(@Query() query: LogQuery): Promise<LogEntry[]> {
    return this.logAggregationService.queryLogs(query);
  }

  @Get('logs/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get log statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Log statistics' })
  async getLogStatistics(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ): Promise<LogStatistics> {
    return this.logAggregationService.getLogStatistics(startDate, endDate);
  }

  @Get('logs/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export logs in various formats' })
  @ApiQuery({ name: 'format', enum: ['json', 'csv', 'txt'] })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Exported logs' })
  async exportLogs(
    @Query('format') format: 'json' | 'csv' | 'txt',
    @Query() query: LogQuery,
  ): Promise<string> {
    return this.logAggregationService.exportLogs(query, format);
  }

  @Post('logs/clean')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clean old log files' })
  @ApiResponse({ status: 200, description: 'Number of deleted files' })
  async cleanOldLogs(
    @Body('daysToKeep') daysToKeep: number = 30,
  ): Promise<{ deletedCount: number }> {
    const deletedCount = await this.logAggregationService.cleanOldLogs(daysToKeep);
    return { deletedCount };
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get monitoring dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard() {
    const [metrics, logStats, health] = await Promise.all([
      this.getSystemMetrics(),
      this.logAggregationService.getLogStatistics(),
      this.getHealthStatus(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      system: metrics,
      logs: logStats,
      health,
      alerts: await this.getActiveAlerts(),
    };
  }

  @Post('events/track')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track custom monitoring event' })
  @ApiResponse({ status: 201, description: 'Event tracked successfully' })
  async trackEvent(
    @Body() event: {
      type: 'performance' | 'business' | 'error' | 'security' | 'system';
      name: string;
      data?: any;
      metadata?: Record<string, any>;
    },
  ) {
    this.monitoringService.trackEvent(event);
    return { success: true, timestamp: new Date().toISOString() };
  }

  @Post('performance/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start performance monitoring for an operation' })
  @ApiResponse({ status: 201, description: 'Performance monitoring started' })
  async startPerformanceMonitoring(
    @Body() data: {
      operationId: string;
      operation: string;
      metadata?: Record<string, any>;
    },
  ) {
    this.monitoringService.startPerformanceMonitoring(
      data.operationId,
      data.operation,
      data.metadata,
    );
    return { 
      success: true, 
      operationId: data.operationId,
      startTime: Date.now(),
    };
  }

  @Post('performance/end')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End performance monitoring for an operation' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  async endPerformanceMonitoring(
    @Body() data: {
      operationId: string;
      success?: boolean;
    },
  ) {
    const metric = this.monitoringService.endPerformanceMonitoring(
      data.operationId,
      data.success,
    );
    return metric || { error: 'Operation not found' };
  }

  private async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      cpu: {
        usage: process.cpuUsage(),
      },
      uptime: {
        seconds: uptime,
        formatted: this.formatUptime(uptime),
      },
      nodejs: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  private async getHealthStatus() {
    // This would integrate with the health checks
    return {
      status: 'healthy',
      services: {
        database: 'up',
        cache: 'up',
        websocket: 'up',
        camera: 'up',
        print: 'up',
      },
    };
  }

  private async getActiveAlerts() {
    // This would fetch active alerts from the monitoring system
    return [
      // Example alerts
      // {
      //   id: '1',
      //   severity: 'warning',
      //   message: 'High memory usage detected',
      //   timestamp: new Date().toISOString(),
      // },
    ];
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }
}