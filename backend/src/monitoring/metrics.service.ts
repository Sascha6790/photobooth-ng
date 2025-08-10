import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    public httpRequestDuration: Histogram<string>,
    
    @InjectMetric('http_requests_total')
    public httpRequestsTotal: Counter<string>,
    
    @InjectMetric('photo_captures_total')
    public photoCapturesTotal: Counter<string>,
    
    @InjectMetric('print_jobs_total')
    public printJobsTotal: Counter<string>,
    
    @InjectMetric('gallery_views_total')
    public galleryViewsTotal: Counter<string>,
    
    @InjectMetric('websocket_connections')
    public websocketConnections: Gauge<string>,
    
    @InjectMetric('active_sessions')
    public activeSessions: Gauge<string>,
    
    @InjectMetric('storage_usage_bytes')
    public storageUsageBytes: Gauge<string>,
    
    @InjectMetric('cache_hits_total')
    public cacheHitsTotal: Counter<string>,
    
    @InjectMetric('cache_misses_total')
    public cacheMissesTotal: Counter<string>,
  ) {
    this.registerMetrics();
  }

  private registerMetrics() {
    // Initialize gauges
    this.websocketConnections.set(0);
    this.activeSessions.set(0);
    this.storageUsageBytes.set(0);
  }

  recordHttpRequest(method: string, path: string, statusCode: number, duration: number) {
    this.httpRequestsTotal.inc({
      method,
      path,
      status: statusCode.toString(),
    });
    
    this.httpRequestDuration.observe(
      {
        method,
        path,
        status: statusCode.toString(),
      },
      duration / 1000, // Convert to seconds
    );
  }

  recordPhotoCapture(mode: string, success: boolean) {
    this.photoCapturesTotal.inc({
      mode,
      status: success ? 'success' : 'failure',
    });
  }

  recordPrintJob(status: 'queued' | 'completed' | 'failed') {
    this.printJobsTotal.inc({ status });
  }

  recordGalleryView() {
    this.galleryViewsTotal.inc();
  }

  updateWebSocketConnections(count: number) {
    this.websocketConnections.set(count);
  }

  updateActiveSessions(count: number) {
    this.activeSessions.set(count);
  }

  updateStorageUsage(bytes: number) {
    this.storageUsageBytes.set(bytes);
  }

  recordCacheHit() {
    this.cacheHitsTotal.inc();
  }

  recordCacheMiss() {
    this.cacheMissesTotal.inc();
  }
}