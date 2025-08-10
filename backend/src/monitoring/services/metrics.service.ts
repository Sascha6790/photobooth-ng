import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge, Summary } from 'prom-client';

@Injectable()
export class MetricsService {
  // HTTP Metrics
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestTotal: Counter<string>;
  private readonly httpErrorTotal: Counter<string>;

  // Business Metrics
  private readonly photoCaptureTotal: Counter<string>;
  private readonly photoProcessingDuration: Histogram<string>;
  private readonly printJobTotal: Counter<string>;
  private readonly galleryViewTotal: Counter<string>;
  
  // System Metrics
  private readonly activeWebsocketConnections: Gauge<string>;
  private readonly cacheHitRate: Gauge<string>;
  private readonly databaseQueryDuration: Histogram<string>;
  private readonly queueSize: Gauge<string>;

  // Performance Metrics
  private readonly apiResponseTime: Summary<string>;
  private readonly memoryUsage: Gauge<string>;
  private readonly cpuUsage: Gauge<string>;

  constructor() {
    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'photobooth_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    this.httpRequestTotal = new Counter({
      name: 'photobooth_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpErrorTotal = new Counter({
      name: 'photobooth_http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'status_code'],
    });

    // Business Metrics
    this.photoCaptureTotal = new Counter({
      name: 'photobooth_photo_captures_total',
      help: 'Total number of photos captured',
      labelNames: ['camera_type', 'mode'],
    });

    this.photoProcessingDuration = new Histogram({
      name: 'photobooth_photo_processing_duration_seconds',
      help: 'Duration of photo processing in seconds',
      labelNames: ['operation', 'filter'],
      buckets: [0.5, 1, 2, 3, 5, 10],
    });

    this.printJobTotal = new Counter({
      name: 'photobooth_print_jobs_total',
      help: 'Total number of print jobs',
      labelNames: ['status', 'printer'],
    });

    this.galleryViewTotal = new Counter({
      name: 'photobooth_gallery_views_total',
      help: 'Total number of gallery views',
      labelNames: ['type'],
    });

    // System Metrics
    this.activeWebsocketConnections = new Gauge({
      name: 'photobooth_websocket_connections_active',
      help: 'Number of active WebSocket connections',
    });

    this.cacheHitRate = new Gauge({
      name: 'photobooth_cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type'],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'photobooth_database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    });

    this.queueSize = new Gauge({
      name: 'photobooth_queue_size',
      help: 'Size of various queues',
      labelNames: ['queue_name'],
    });

    // Performance Metrics
    this.apiResponseTime = new Summary({
      name: 'photobooth_api_response_time_seconds',
      help: 'API response time in seconds',
      labelNames: ['endpoint', 'method'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
    });

    this.memoryUsage = new Gauge({
      name: 'photobooth_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
    });

    this.cpuUsage = new Gauge({
      name: 'photobooth_cpu_usage_percent',
      help: 'CPU usage percentage',
    });

    // Register all metrics
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestTotal);
    register.registerMetric(this.httpErrorTotal);
    register.registerMetric(this.photoCaptureTotal);
    register.registerMetric(this.photoProcessingDuration);
    register.registerMetric(this.printJobTotal);
    register.registerMetric(this.galleryViewTotal);
    register.registerMetric(this.activeWebsocketConnections);
    register.registerMetric(this.cacheHitRate);
    register.registerMetric(this.databaseQueryDuration);
    register.registerMetric(this.queueSize);
    register.registerMetric(this.apiResponseTime);
    register.registerMetric(this.memoryUsage);
    register.registerMetric(this.cpuUsage);

    // Start collecting system metrics
    this.startSystemMetricsCollection();
  }

  // HTTP Metrics Methods
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
    this.httpRequestTotal.labels(method, route, statusCode.toString()).inc();
    
    if (statusCode >= 400) {
      this.httpErrorTotal.labels(method, route, statusCode.toString()).inc();
    }
  }

  recordApiResponseTime(endpoint: string, method: string, duration: number): void {
    this.apiResponseTime.labels(endpoint, method).observe(duration);
  }

  // Business Metrics Methods
  incrementPhotoCapture(cameraType: string, mode: string): void {
    this.photoCaptureTotal.labels(cameraType, mode).inc();
  }

  recordPhotoProcessing(operation: string, filter: string, duration: number): void {
    this.photoProcessingDuration.labels(operation, filter).observe(duration);
  }

  incrementPrintJob(status: string, printer: string): void {
    this.printJobTotal.labels(status, printer).inc();
  }

  incrementGalleryView(type: string): void {
    this.galleryViewTotal.labels(type).inc();
  }

  // System Metrics Methods
  setActiveWebsocketConnections(count: number): void {
    this.activeWebsocketConnections.set(count);
  }

  setCacheHitRate(cacheType: string, rate: number): void {
    this.cacheHitRate.labels(cacheType).set(rate);
  }

  recordDatabaseQuery(operation: string, table: string, duration: number): void {
    this.databaseQueryDuration.labels(operation, table).observe(duration);
  }

  setQueueSize(queueName: string, size: number): void {
    this.queueSize.labels(queueName).set(size);
  }

  // System Metrics Collection
  private startSystemMetricsCollection(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.labels('heapUsed').set(memUsage.heapUsed);
      this.memoryUsage.labels('heapTotal').set(memUsage.heapTotal);
      this.memoryUsage.labels('rss').set(memUsage.rss);
      this.memoryUsage.labels('external').set(memUsage.external);

      // Simple CPU usage calculation
      const cpuUsage = process.cpuUsage();
      const totalCpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      this.cpuUsage.set(totalCpu);
    }, 10000); // Collect every 10 seconds
  }

  // Get all metrics
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Clear all metrics
  clearMetrics(): void {
    register.clear();
  }
}