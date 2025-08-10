# Photobooth Monitoring & Logging System

## Overview

Comprehensive monitoring, logging, and observability system for the Photobooth application using:
- **Winston** for structured logging
- **Sentry** for error tracking
- **Prometheus** for metrics collection
- **Health Checks** for system monitoring
- **Log Aggregation** for centralized log management

## Features

### 1. Structured Logging (Winston)
- Multiple log levels (error, warn, info, debug, verbose)
- Rotating log files with automatic cleanup
- Structured JSON format for easy parsing
- Console output for development
- Separate log files for different concerns (app, errors, performance)

### 2. Error Tracking (Sentry)
- Automatic error capture and reporting
- User context tracking
- Performance monitoring
- Release tracking
- Sensitive data filtering

### 3. Metrics Collection (Prometheus)
- HTTP request metrics
- Business metrics (photos, prints, gallery views)
- System metrics (memory, CPU, connections)
- Custom metric tracking
- Prometheus-compatible export format

### 4. Health Checks
- Database connectivity
- Memory usage monitoring
- Disk space monitoring
- Service-specific health checks
- Kubernetes-ready probes (liveness, readiness, startup)

### 5. Log Aggregation
- Query logs by level, context, category
- Export logs in multiple formats (JSON, CSV, TXT)
- Real-time log streaming
- Log statistics and analytics
- Automatic old log cleanup

## API Endpoints

### Health Checks
- `GET /health` - General health check
- `GET /health/liveness` - Kubernetes liveness probe
- `GET /health/readiness` - Kubernetes readiness probe
- `GET /health/startup` - Kubernetes startup probe
- `GET /health/detailed` - Detailed health status

### Metrics
- `GET /metrics` - Prometheus metrics endpoint
- `GET /monitoring/metrics` - Alternative metrics endpoint

### Monitoring Dashboard
- `GET /monitoring/dashboard` - Dashboard data (requires admin auth)
- `GET /monitoring/logs` - Query logs (requires admin auth)
- `GET /monitoring/logs/statistics` - Log statistics (requires admin auth)
- `GET /monitoring/logs/export` - Export logs (requires admin auth)
- `POST /monitoring/logs/clean` - Clean old logs (requires admin auth)

### Event Tracking
- `POST /monitoring/events/track` - Track custom events
- `POST /monitoring/performance/start` - Start performance monitoring
- `POST /monitoring/performance/end` - End performance monitoring

## Configuration

### Environment Variables

```env
# Sentry
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Logging
LOG_LEVEL=info
LOG_DIR=logs
LOG_MAX_FILES=14d
LOG_MAX_SIZE=20m

# Metrics
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

## Usage Examples

### 1. Using the Logger Service

```typescript
import { LoggerService } from './monitoring/logger/logger.service';

@Injectable()
export class MyService {
  constructor(private logger: LoggerService) {
    this.logger.setContext('MyService');
  }

  async processPhoto() {
    this.logger.log('Processing photo started');
    
    try {
      // Process photo
      this.logger.logBusinessEvent('photo_processed', {
        photoId: '123',
        filters: ['sepia', 'blur'],
      });
    } catch (error) {
      this.logger.error('Photo processing failed', error.stack, {
        photoId: '123',
      });
    }
  }
}
```

### 2. Using the Monitoring Service

```typescript
import { MonitoringService } from './monitoring/services/monitoring.service';

@Injectable()
export class CaptureService {
  constructor(private monitoring: MonitoringService) {}

  async capturePhoto() {
    const operationId = 'capture-123';
    
    // Start performance monitoring
    this.monitoring.startPerformanceMonitoring(
      operationId,
      'photo_capture',
      { cameraType: 'dslr' }
    );

    try {
      // Capture photo
      const photo = await this.camera.capture();
      
      // Track business event
      this.monitoring.trackBusinessEvent('photo_captured', {
        photoId: photo.id,
        cameraType: 'dslr',
      });
      
      // End performance monitoring
      this.monitoring.endPerformanceMonitoring(operationId, true);
      
      return photo;
    } catch (error) {
      this.monitoring.endPerformanceMonitoring(operationId, false);
      this.monitoring.trackError(error, { operation: 'capture' });
      throw error;
    }
  }
}
```

### 3. Querying Logs

```bash
# Get error logs from the last 24 hours
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/monitoring/logs?level=error&startDate=2024-01-01"

# Export logs as CSV
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/monitoring/logs/export?format=csv&level=warn"

# Get log statistics
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/monitoring/logs/statistics"
```

### 4. Metrics Integration

```bash
# Prometheus configuration (prometheus.yml)
scrape_configs:
  - job_name: 'photobooth'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

## Log Levels

1. **ERROR**: Application errors, exceptions, critical issues
2. **WARN**: Warning conditions, deprecations, potential issues
3. **INFO**: General informational messages, business events
4. **DEBUG**: Detailed debugging information
5. **VERBOSE**: Very detailed trace information

## Metrics Available

### HTTP Metrics
- `photobooth_http_request_duration_seconds` - Request duration histogram
- `photobooth_http_requests_total` - Total request counter
- `photobooth_http_errors_total` - Total error counter

### Business Metrics
- `photobooth_photo_captures_total` - Photo capture counter
- `photobooth_photo_processing_duration_seconds` - Processing duration
- `photobooth_print_jobs_total` - Print job counter
- `photobooth_gallery_views_total` - Gallery view counter

### System Metrics
- `photobooth_websocket_connections_active` - Active WebSocket connections
- `photobooth_cache_hit_rate` - Cache hit rate gauge
- `photobooth_database_query_duration_seconds` - Database query duration
- `photobooth_queue_size` - Queue size gauge
- `photobooth_memory_usage_bytes` - Memory usage
- `photobooth_cpu_usage_percent` - CPU usage

## Best Practices

1. **Always set context** when using the logger
2. **Track business events** for important user actions
3. **Monitor performance** for critical operations
4. **Sanitize sensitive data** before logging
5. **Use appropriate log levels** for different scenarios
6. **Set up alerts** for critical errors
7. **Regularly review metrics** and adjust thresholds
8. **Export and archive** logs periodically

## Troubleshooting

### Logs not appearing
- Check LOG_LEVEL environment variable
- Verify write permissions for LOG_DIR
- Check if log rotation is working

### Sentry not receiving errors
- Verify SENTRY_DSN is set correctly
- Check network connectivity
- Ensure environment is not 'development' (Sentry disabled in dev)

### Metrics endpoint not working
- Verify METRICS_ENABLED is true
- Check if PrometheusModule is properly initialized
- Ensure no port conflicts

### Health checks failing
- Review threshold configurations
- Check database connectivity
- Monitor system resources

## Grafana Dashboard

Import the included Grafana dashboard for visualization:
1. Open Grafana
2. Go to Dashboards → Import
3. Upload `grafana-dashboard.json`
4. Select Prometheus data source
5. Click Import

## Security Considerations

1. **Protect monitoring endpoints** with authentication
2. **Sanitize sensitive data** in logs and metrics
3. **Use HTTPS** for Sentry communication
4. **Restrict access** to log export endpoints
5. **Rotate log files** regularly
6. **Monitor for suspicious patterns** in logs

## Performance Impact

- Logging: < 1% CPU overhead
- Metrics: < 0.5% CPU overhead
- Sentry: < 1% network overhead
- Health checks: Negligible impact

## Future Enhancements

- [ ] Distributed tracing with OpenTelemetry
- [ ] Log correlation across services
- [ ] Custom alerting rules
- [ ] Machine learning for anomaly detection
- [ ] Real-time monitoring dashboard
- [ ] Integration with PagerDuty/Opsgenie