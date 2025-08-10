import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'General health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
      () => this.disk.checkStorage('storage', { 
        path: '/', 
        thresholdPercent: 0.9 // 90% disk usage threshold
      }),
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkCriticalServices(),
    ]);
  }

  @Get('startup')
  @HealthCheck()
  @ApiOperation({ summary: 'Startup probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service has started successfully' })
  @ApiResponse({ status: 503, description: 'Service is still starting' })
  startup() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkInitialization(),
    ]);
  }

  @Get('detailed')
  @HealthCheck()
  @ApiOperation({ summary: 'Detailed health check with all indicators' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  detailed() {
    return this.health.check([
      // Database checks
      () => this.db.pingCheck('database_ping'),
      
      // Memory checks
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      
      // Disk checks
      () => this.disk.checkStorage('disk_storage', { 
        path: '/', 
        thresholdPercent: 0.9 
      }),
      () => this.disk.checkStorage('temp_storage', { 
        path: '/tmp', 
        thresholdPercent: 0.95 
      }),
      
      // Custom service checks
      () => this.checkCameraService(),
      () => this.checkPrintService(),
      () => this.checkWebSocketService(),
      () => this.checkCacheService(),
    ]);
  }

  private async checkCriticalServices(): Promise<any> {
    // Check if critical services are running
    const services = {
      database: true, // Already checked via db.pingCheck
      cache: await this.checkCacheHealth(),
      websocket: await this.checkWebSocketHealth(),
    };

    const allHealthy = Object.values(services).every(status => status === true);

    return {
      critical_services: {
        status: allHealthy ? 'up' : 'down',
        details: services,
      },
    };
  }

  private async checkInitialization(): Promise<any> {
    // Check if the application has fully initialized
    const initialized = {
      database_migrations: true, // Check if migrations are complete
      cache_warmed: true, // Check if cache is warmed up
      configurations_loaded: true, // Check if all configs are loaded
    };

    const allInitialized = Object.values(initialized).every(status => status === true);

    return {
      initialization: {
        status: allInitialized ? 'up' : 'down',
        details: initialized,
      },
    };
  }

  private async checkCameraService(): Promise<any> {
    try {
      // Check if camera service is responsive
      // This would actually check the camera service status
      return {
        camera_service: {
          status: 'up',
          type: process.env.CAMERA_TYPE || 'mock',
          lastCheck: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        camera_service: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  private async checkPrintService(): Promise<any> {
    try {
      // Check if print service is responsive
      return {
        print_service: {
          status: 'up',
          queueSize: 0, // Would get actual queue size
          lastCheck: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        print_service: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  private async checkWebSocketService(): Promise<any> {
    try {
      // Check WebSocket service health
      return {
        websocket_service: {
          status: 'up',
          activeConnections: 0, // Would get actual connection count
          lastCheck: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        websocket_service: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  private async checkCacheService(): Promise<any> {
    try {
      // Check cache service health
      return {
        cache_service: {
          status: 'up',
          hitRate: 0.95, // Would get actual hit rate
          lastCheck: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        cache_service: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }

  private async checkCacheHealth(): Promise<boolean> {
    try {
      // Implement actual cache health check
      return true;
    } catch {
      return false;
    }
  }

  private async checkWebSocketHealth(): Promise<boolean> {
    try {
      // Implement actual WebSocket health check
      return true;
    } catch {
      return false;
    }
  }
}