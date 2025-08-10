# Photobooth-NG Performance Tuning Guide

## Table of Contents
- [Performance Metrics](#performance-metrics)
- [Frontend Optimization](#frontend-optimization)
- [Backend Optimization](#backend-optimization)
- [Database Optimization](#database-optimization)
- [Image Processing](#image-processing)
- [Network Optimization](#network-optimization)
- [Hardware Optimization](#hardware-optimization)
- [Monitoring & Profiling](#monitoring--profiling)
- [Raspberry Pi Specific](#raspberry-pi-specific)

## Performance Metrics

### Key Performance Indicators (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Load Time | < 3s | Lighthouse |
| Time to Interactive | < 5s | Lighthouse |
| First Contentful Paint | < 1.5s | Web Vitals |
| Largest Contentful Paint | < 2.5s | Web Vitals |
| Photo Capture Time | < 2s | Custom Metric |
| Gallery Load Time | < 1s | Custom Metric |
| API Response Time | < 200ms | APM |
| WebSocket Latency | < 50ms | Custom Metric |

### Measurement Tools

```bash
# Frontend performance
npx lighthouse http://localhost:4200 --view

# Bundle analysis
npx nx build frontend --configuration=production --stats-json
npx webpack-bundle-analyzer dist/apps/frontend/stats.json

# Backend performance
npm install -g clinic
clinic doctor -- node dist/apps/backend/main.js
```

## Frontend Optimization

### Bundle Size Optimization

#### 1. Lazy Loading Modules

```typescript
// app-routing.module.ts
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  },
  {
    path: 'gallery',
    loadChildren: () => import('./gallery/gallery.module').then(m => m.GalleryModule)
  }
];
```

#### 2. Tree Shaking

```json
// angular.json
{
  "optimization": {
    "scripts": true,
    "styles": {
      "minify": true,
      "inlineCritical": true
    },
    "fonts": true
  }
}
```

#### 3. Remove Unused Imports

```bash
# Install import-cost extension
# Use PurgeCSS for styles
npm install -D @fullhuman/postcss-purgecss

# postcss.config.js
module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: ['./src/**/*.html', './src/**/*.ts'],
      safelist: ['dynamic-class']
    })
  ]
};
```

### Image Optimization

#### 1. Lazy Loading Images

```html
<!-- Use native lazy loading -->
<img src="image.jpg" loading="lazy" alt="Description">

<!-- Or use Intersection Observer -->
<img [src]="imageSrc" (visible)="loadImage()" alt="Description">
```

#### 2. Responsive Images

```html
<picture>
  <source media="(max-width: 768px)" srcset="image-mobile.jpg">
  <source media="(max-width: 1200px)" srcset="image-tablet.jpg">
  <img src="image-desktop.jpg" alt="Description">
</picture>
```

#### 3. WebP Format

```typescript
// image.service.ts
async convertToWebP(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .webp({ quality: 85 })
    .toBuffer();
}
```

### Angular Performance Tips

#### 1. Change Detection Strategy

```typescript
@Component({
  selector: 'app-gallery-item',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GalleryItemComponent {}
```

#### 2. TrackBy Functions

```html
<div *ngFor="let item of items; trackBy: trackByFn">
  {{ item.name }}
</div>
```

```typescript
trackByFn(index: number, item: any) {
  return item.id;
}
```

#### 3. Virtual Scrolling

```html
<cdk-virtual-scroll-viewport itemSize="200" class="viewport">
  <div *cdkVirtualFor="let item of items">
    {{ item }}
  </div>
</cdk-virtual-scroll-viewport>
```

#### 4. Preloading Strategy

```typescript
// app-routing.module.ts
RouterModule.forRoot(routes, {
  preloadingStrategy: PreloadAllModules
})
```

## Backend Optimization

### NestJS Performance

#### 1. Enable Compression

```typescript
// main.ts
import * as compression from 'compression';

app.use(compression({
  threshold: 1024, // Only compress responses > 1KB
  level: 6 // Compression level (0-9)
}));
```

#### 2. Caching Strategy

```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 300, // 5 minutes
      max: 100 // Maximum items in cache
    })
  ]
})
```

```typescript
// controller.ts
@UseInterceptors(CacheInterceptor)
@CacheTTL(60) // Override default TTL
@Get()
async getData() {
  return this.service.getData();
}
```

#### 3. Database Query Optimization

```typescript
// Use select to limit fields
const images = await this.imageRepository.find({
  select: ['id', 'filename', 'thumbnail'],
  take: 20,
  skip: page * 20
});

// Use relations wisely
const imageWithSession = await this.imageRepository.findOne({
  where: { id },
  relations: ['session'], // Only load what's needed
});

// Use query builder for complex queries
const popularImages = await this.imageRepository
  .createQueryBuilder('image')
  .select(['image.id', 'image.filename'])
  .where('image.rating > :rating', { rating: 4 })
  .orderBy('image.createdAt', 'DESC')
  .limit(10)
  .getMany();
```

#### 4. Connection Pooling

```typescript
// ormconfig.ts
export default {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'photobooth',
  password: 'password',
  database: 'photobooth_db',
  // Connection pool settings
  extra: {
    max: 20, // Maximum connections
    min: 5,  // Minimum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
};
```

### API Response Optimization

#### 1. Pagination

```typescript
@Get()
async findAll(
  @Query('page', ParseIntPipe) page = 1,
  @Query('limit', ParseIntPipe) limit = 20
) {
  const [items, total] = await this.repository.findAndCount({
    take: limit,
    skip: (page - 1) * limit
  });
  
  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
```

#### 2. Field Filtering

```typescript
@Get()
async find(@Query('fields') fields?: string) {
  const select = fields?.split(',') || ['id', 'name', 'thumbnail'];
  return this.repository.find({ select });
}
```

#### 3. Response Compression

```typescript
// Use streaming for large responses
@Get('export')
@Header('Content-Type', 'application/json')
async export(@Res() res: Response) {
  const stream = this.service.createExportStream();
  stream.pipe(res);
}
```

## Database Optimization

### PostgreSQL Tuning

```sql
-- Indexes for common queries
CREATE INDEX idx_images_created_at ON images(created_at DESC);
CREATE INDEX idx_images_session_id ON images(session_id);
CREATE INDEX idx_images_rating ON images(rating) WHERE rating > 3;

-- Composite indexes
CREATE INDEX idx_images_session_created ON images(session_id, created_at DESC);

-- Partial indexes for filtered queries
CREATE INDEX idx_active_sessions ON sessions(id) WHERE ended_at IS NULL;
```

### Query Optimization

```sql
-- Use EXPLAIN ANALYZE to understand query performance
EXPLAIN ANALYZE SELECT * FROM images WHERE session_id = 123;

-- Optimize JOIN queries
SELECT i.id, i.filename, s.name as session_name
FROM images i
INNER JOIN sessions s ON i.session_id = s.id
WHERE s.created_at > NOW() - INTERVAL '7 days';

-- Use materialized views for complex aggregations
CREATE MATERIALIZED VIEW image_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_images,
  AVG(rating) as avg_rating
FROM images
GROUP BY DATE(created_at);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY image_stats;
```

### Connection Pool Tuning

```yaml
# docker-compose.yml
services:
  postgres:
    environment:
      POSTGRES_MAX_CONNECTIONS: 100
      POSTGRES_SHARED_BUFFERS: 256MB
      POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
      POSTGRES_WORK_MEM: 4MB
```

## Image Processing

### Sharp Optimization

```typescript
// Use streams for large images
import { pipeline } from 'stream';
import { promisify } from 'util';
const pipelineAsync = promisify(pipeline);

async processLargeImage(inputPath: string, outputPath: string) {
  const readStream = fs.createReadStream(inputPath);
  const writeStream = fs.createWriteStream(outputPath);
  
  const transformer = sharp()
    .resize(1920, 1080, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .jpeg({ 
      quality: 85,
      progressive: true,
      mozjpeg: true 
    });
    
  await pipelineAsync(readStream, transformer, writeStream);
}
```

### Batch Processing

```typescript
// Process images in parallel with concurrency limit
import pLimit from 'p-limit';

const limit = pLimit(4); // Process 4 images at a time

async processBatch(images: string[]) {
  const promises = images.map(image => 
    limit(() => this.processImage(image))
  );
  
  return Promise.all(promises);
}
```

### Thumbnail Generation

```typescript
// Generate multiple sizes efficiently
async generateThumbnails(inputBuffer: Buffer) {
  const sizes = [
    { width: 150, height: 150, suffix: 'thumb' },
    { width: 300, height: 300, suffix: 'small' },
    { width: 800, height: 600, suffix: 'medium' }
  ];
  
  const baseImage = sharp(inputBuffer);
  
  return Promise.all(
    sizes.map(size => 
      baseImage
        .clone()
        .resize(size.width, size.height, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer()
    )
  );
}
```

## Network Optimization

### CDN Configuration

```nginx
# nginx.conf
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
  add_header Vary "Accept-Encoding";
}

# Gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
gzip_comp_level 6;
```

### WebSocket Optimization

```typescript
// Configure Socket.IO for performance
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket'], // Prefer WebSocket over polling
  perMessageDeflate: {
    threshold: 1024 // Compress messages > 1KB
  }
});

// Implement rooms for targeted messaging
io.on('connection', (socket) => {
  socket.join(`session-${sessionId}`);
  
  // Send to specific room only
  io.to(`session-${sessionId}`).emit('update', data);
});
```

### HTTP/2 and HTTP/3

```nginx
# Enable HTTP/2
server {
  listen 443 ssl http2;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  # HTTP/2 Push
  http2_push_preload on;
  add_header Link "</styles.css>; rel=preload; as=style" always;
}
```

## Hardware Optimization

### Raspberry Pi Specific

#### 1. GPU Memory Split

```bash
# Increase GPU memory for camera operations
sudo raspi-config
# Advanced Options > Memory Split > 256

# Or edit directly
echo "gpu_mem=256" | sudo tee -a /boot/config.txt
```

#### 2. Overclocking (Use with caution)

```bash
# /boot/config.txt
arm_freq=2000
gpu_freq=600
over_voltage=6
```

#### 3. SD Card Optimization

```bash
# Use faster SD card (Class 10 or better)
# Enable TRIM
sudo fstrim -v /

# Reduce swappiness
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf

# Use log2ram to reduce SD card writes
sudo apt-get install log2ram
```

#### 4. Service Optimization

```ini
# /etc/systemd/system/photobooth.service
[Service]
Nice=-10  # Higher priority
CPUWeight=200  # More CPU shares
MemoryMax=512M  # Limit memory usage
IOWeight=200  # Higher I/O priority
```

### Camera Optimization

#### 1. DSLR Settings

```javascript
// Optimize gphoto2 settings
const captureSettings = {
  'capture-target': 'Internal RAM', // Faster than SD card
  'imageformat': 'JPEG Fine', // Balance quality/speed
  'iso': 'Auto',
  'shutterspeed': '1/125', // Fast enough to avoid blur
  'aperture': '5.6', // Good depth of field
  'whitebalance': 'Auto'
};
```

#### 2. Webcam Settings

```javascript
// Optimize webcam capture
const constraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30, max: 60 },
    facingMode: 'user'
  },
  audio: false // Disable audio to save resources
};
```

## Monitoring & Profiling

### Application Performance Monitoring (APM)

```typescript
// Install APM agent
npm install elastic-apm-node

// main.ts
import * as apm from 'elastic-apm-node';

apm.start({
  serviceName: 'photobooth-backend',
  secretToken: process.env.APM_TOKEN,
  serverUrl: process.env.APM_SERVER_URL,
  environment: process.env.NODE_ENV
});
```

### Custom Metrics

```typescript
// metrics.service.ts
import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private captureCounter = new promClient.Counter({
    name: 'photobooth_captures_total',
    help: 'Total number of photos captured'
  });
  
  private captureHistogram = new promClient.Histogram({
    name: 'photobooth_capture_duration_seconds',
    help: 'Photo capture duration in seconds',
    buckets: [0.5, 1, 2, 5, 10]
  });
  
  recordCapture(duration: number) {
    this.captureCounter.inc();
    this.captureHistogram.observe(duration);
  }
}
```

### Performance Dashboard

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Profiling Tools

```bash
# CPU Profiling
node --cpu-prof dist/apps/backend/main.js
# Analyze with Chrome DevTools

# Memory Profiling
node --heap-prof dist/apps/backend/main.js

# Flame Graphs
npm install -g 0x
0x dist/apps/backend/main.js

# Clinic.js Suite
npm install -g clinic
clinic doctor -- node dist/apps/backend/main.js
clinic flame -- node dist/apps/backend/main.js
clinic bubbleprof -- node dist/apps/backend/main.js
```

## Performance Checklist

### Before Deployment

- [ ] Production build enabled
- [ ] Source maps disabled in production
- [ ] Console logs removed
- [ ] Compression enabled
- [ ] Caching headers configured
- [ ] Database indexes created
- [ ] Images optimized
- [ ] Lazy loading implemented
- [ ] Bundle size < 500KB (initial)
- [ ] Time to Interactive < 5s

### Regular Maintenance

- [ ] Monitor error rates
- [ ] Check memory usage trends
- [ ] Review slow queries
- [ ] Update dependencies
- [ ] Clean up old images
- [ ] Vacuum database
- [ ] Review cache hit rates
- [ ] Check disk usage
- [ ] Test backup restoration
- [ ] Security updates

## Optimization Scripts

### Performance Test Script

```bash
#!/bin/bash
# performance-test.sh

echo "Running performance tests..."

# Frontend performance
echo "Testing frontend performance..."
npx lighthouse http://localhost:4200 \
  --output json \
  --output-path ./performance-frontend.json \
  --only-categories=performance

# API performance
echo "Testing API performance..."
npx autocannon \
  -c 10 \
  -d 30 \
  -p 10 \
  http://localhost:3000/api/gallery

# Database performance
echo "Testing database performance..."
pgbench -h localhost -U photobooth -d photobooth_db -c 10 -T 60

echo "Performance tests complete. Check results in ./performance-*.json"
```

### Optimization Script

```bash
#!/bin/bash
# optimize.sh

echo "Optimizing application..."

# Clean and rebuild
npm run clean
npm run build:prod

# Optimize images
find ./uploads -name "*.jpg" -exec jpegoptim {} \;
find ./uploads -name "*.png" -exec optipng {} \;

# Clear caches
redis-cli FLUSHALL

# Vacuum database
psql -U photobooth -d photobooth_db -c "VACUUM ANALYZE;"

# Restart services
sudo systemctl restart photobooth-backend
sudo systemctl restart photobooth-frontend

echo "Optimization complete!"
```

---
Last Updated: 10.08.2025