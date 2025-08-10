# Photobooth-NG Troubleshooting Guide

## Table of Contents
- [Common Issues](#common-issues)
- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [Hardware Issues](#hardware-issues)
- [Database Issues](#database-issues)
- [Docker Issues](#docker-issues)
- [Network Issues](#network-issues)
- [Performance Issues](#performance-issues)
- [Deployment Issues](#deployment-issues)

## Common Issues

### Application Won't Start

#### Symptoms
- Backend not responding on port 3000
- Frontend not loading on port 4200
- Services fail to start

#### Solutions

1. **Check if ports are already in use:**
```bash
# Check port 3000 (backend)
lsof -i :3000

# Check port 4200 (frontend)
lsof -i :4200

# Kill processes if needed
kill -9 <PID>
```

2. **Use the management scripts:**
```bash
# Stop all services
./scripts/backend-stop.sh
./scripts/frontend-stop.sh

# Start services
./scripts/backend-start.sh
./scripts/frontend-start.sh
```

3. **Check logs:**
```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log
```

### WebSocket Connection Failed

#### Symptoms
- "WebSockets request was expected" error
- Real-time updates not working
- Gallery not updating automatically

#### Solutions

1. **Check CORS configuration:**
```typescript
// apps/backend/src/main.ts
app.enableCors({
  origin: ['http://localhost:4200', 'http://localhost:3000'],
  credentials: true,
});
```

2. **Verify Socket.IO configuration:**
```typescript
// apps/backend/src/websocket/websocket.gateway.ts
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  }
})
```

3. **Check client connection:**
```typescript
// apps/frontend/src/app/services/websocket.service.ts
this.socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5
});
```

## Backend Issues

### NestJS Application Crashes

#### Symptoms
- Backend process exits unexpectedly
- Memory errors
- Module dependency errors

#### Solutions

1. **Clear node_modules and reinstall:**
```bash
cd photobooth-ng
rm -rf node_modules
npm install
```

2. **Check for circular dependencies:**
```bash
npx nx graph
```

3. **Increase Node.js memory:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npx nx serve backend
```

### API Endpoints Return 404

#### Symptoms
- Routes not found
- Controller not registered
- Missing module imports

#### Solutions

1. **Verify controller registration:**
```typescript
// Check app.module.ts
@Module({
  imports: [
    // Ensure all modules are imported
    GalleryModule,
    CaptureModule,
    SettingsModule,
    // ...
  ],
})
```

2. **Check route prefixes:**
```typescript
// Controller should have correct prefix
@Controller('api/gallery')
export class GalleryController {}
```

3. **Test endpoints directly:**
```bash
# Use the API test script
./scripts/api-test.sh
```

## Frontend Issues

### Angular Build Errors

#### Symptoms
- TypeScript compilation errors
- Module not found errors
- Template parsing errors

#### Solutions

1. **Clear Angular cache:**
```bash
rm -rf .angular
npx nx build frontend
```

2. **Check TypeScript version compatibility:**
```json
// package.json
"typescript": "~5.1.0"
```

3. **Fix import paths:**
```typescript
// Use absolute imports
import { Service } from '@photobooth/shared';
// Not relative imports
import { Service } from '../../../libs/shared';
```

### Styles Not Loading

#### Symptoms
- Components appear unstyled
- Tailwind classes not working
- Custom styles missing

#### Solutions

1. **Verify Tailwind configuration:**
```javascript
// apps/frontend/tailwind.config.js
module.exports = {
  content: [
    './apps/frontend/src/**/*.{html,ts}',
  ],
  // ...
};
```

2. **Check global styles import:**
```css
/* apps/frontend/src/styles.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Hardware Issues

### Camera Not Detected

#### Symptoms
- "No camera found" error
- Permission denied
- Black preview screen

#### Solutions

1. **Check camera permissions (Browser):**
```javascript
// Request permissions explicitly
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    console.log('Camera access granted');
  })
  .catch(err => {
    console.error('Camera access denied:', err);
  });
```

2. **For Raspberry Pi:**
```bash
# Enable camera
sudo raspi-config
# Navigate to Interface Options > Camera > Enable

# Check camera status
vcgencmd get_camera

# Test camera
raspistill -o test.jpg
```

3. **For DSLR cameras:**
```bash
# Install gphoto2
sudo apt-get install gphoto2

# List connected cameras
gphoto2 --list-cameras

# Test capture
gphoto2 --capture-image-and-download
```

### GPIO Not Working (Raspberry Pi)

#### Symptoms
- Button/buzzer not responding
- Permission errors
- GPIO already in use

#### Solutions

1. **Add user to gpio group:**
```bash
sudo usermod -a -G gpio $USER
# Logout and login again
```

2. **Check GPIO pins:**
```bash
gpio readall
```

3. **Reset GPIO:**
```javascript
// Clean up GPIO on exit
process.on('SIGINT', () => {
  gpio.destroy();
  process.exit();
});
```

## Database Issues

### Connection Failed

#### Symptoms
- "ECONNREFUSED" error
- Database not reachable
- Authentication failed

#### Solutions

1. **For PostgreSQL:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check connection
psql -U photobooth -d photobooth_db -h localhost
```

2. **For SQLite:**
```bash
# Check file permissions
ls -la photobooth.db

# Fix permissions
chmod 644 photobooth.db
```

3. **Check environment variables:**
```bash
# .env file
DATABASE_URL=postgresql://user:password@localhost:5432/photobooth
```

### Migration Errors

#### Symptoms
- Schema out of sync
- Column not found
- Table doesn't exist

#### Solutions

1. **Run migrations:**
```bash
npx nx run backend:migration:run
```

2. **Generate new migration:**
```bash
npx nx run backend:migration:generate --name=FixSchema
```

3. **Reset database (development only):**
```bash
npx nx run backend:schema:drop
npx nx run backend:schema:sync
```

## Docker Issues

### Container Won't Start

#### Symptoms
- Exit code 1
- Port already allocated
- Volume mount errors

#### Solutions

1. **Check running containers:**
```bash
docker ps -a
docker logs photobooth-backend
```

2. **Clean up containers:**
```bash
docker-compose down
docker system prune -a
docker-compose up --build
```

3. **Fix port conflicts:**
```yaml
# docker-compose.yml
services:
  backend:
    ports:
      - "3001:3000"  # Change host port if needed
```

### Build Failures

#### Symptoms
- npm install fails in Docker
- Out of memory
- Network timeout

#### Solutions

1. **Increase Docker memory:**
```bash
# Docker Desktop: Preferences > Resources > Memory
# Set to at least 4GB
```

2. **Use buildkit:**
```bash
DOCKER_BUILDKIT=1 docker-compose build
```

3. **Clear Docker cache:**
```bash
docker builder prune --all
```

## Network Issues

### CORS Errors

#### Symptoms
- "Access-Control-Allow-Origin" error
- Preflight request failed
- Credentials not included

#### Solutions

1. **Configure CORS properly:**
```typescript
// Backend
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

2. **Proxy configuration (development):**
```json
// apps/frontend/proxy.conf.json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

### HTTPS/SSL Issues

#### Symptoms
- Certificate errors
- Mixed content warnings
- Connection not secure

#### Solutions

1. **Generate SSL certificates:**
```bash
# For development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# For production (Let's Encrypt)
./scripts/setup-https.sh
```

2. **Configure Nginx:**
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/yourdomain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain/privkey.pem;
}
```

## Performance Issues

### Slow Application Response

#### Symptoms
- High latency
- Slow page loads
- Laggy UI

#### Solutions

1. **Enable production mode:**
```bash
# Backend
NODE_ENV=production npx nx serve backend

# Frontend
npx nx build frontend --configuration=production
```

2. **Optimize images:**
```typescript
// Use image optimization service
import sharp from 'sharp';

await sharp(inputBuffer)
  .resize(1920, 1080, { fit: 'inside' })
  .jpeg({ quality: 85 })
  .toBuffer();
```

3. **Enable caching:**
```typescript
// Backend caching
@UseInterceptors(CacheInterceptor)
@CacheTTL(60)
@Get()
async getData() {}
```

### Memory Leaks

#### Symptoms
- Increasing memory usage
- Application crashes after running
- "JavaScript heap out of memory"

#### Solutions

1. **Monitor memory usage:**
```bash
# Use Node.js built-in profiler
node --inspect apps/backend/main.js

# Connect Chrome DevTools to chrome://inspect
```

2. **Fix common leaks:**
```typescript
// Cleanup subscriptions
ngOnDestroy() {
  this.subscription?.unsubscribe();
}

// Clear intervals/timeouts
clearInterval(this.intervalId);
```

3. **Limit cache size:**
```typescript
// Configure cache with max size
CacheModule.register({
  ttl: 60,
  max: 100, // Maximum number of items
});
```

## Deployment Issues

### Raspberry Pi Specific Issues

#### Symptoms
- Application crashes on Pi
- Hardware features not working
- Performance issues

#### Solutions

1. **Optimize for ARM architecture:**
```bash
# Build for ARM
docker buildx build --platform linux/arm64 -t photobooth:arm .
```

2. **Reduce memory usage:**
```bash
# Limit Node.js memory
export NODE_OPTIONS="--max-old-space-size=512"
```

3. **Enable hardware acceleration:**
```bash
# For camera
sudo modprobe bcm2835-v4l2

# GPU memory split
sudo raspi-config
# Advanced Options > Memory Split > 256
```

### Auto-Update Failures

#### Symptoms
- Updates not installing
- Version mismatch
- Rollback triggered

#### Solutions

1. **Check update service:**
```bash
sudo systemctl status photobooth-updater.timer
sudo journalctl -u photobooth-updater
```

2. **Manual update:**
```bash
cd /home/pi/photobooth
git pull
npm install
npm run build
sudo systemctl restart photobooth
```

3. **Fix permissions:**
```bash
sudo chown -R pi:pi /home/pi/photobooth
```

## Diagnostic Commands

### Health Checks
```bash
# Backend health
curl http://localhost:3000/health

# Frontend status
curl http://localhost:4200

# Database connection
npx nx run backend:db:test

# Full system check
./scripts/system-check.sh
```

### Log Locations
```bash
# Application logs
/tmp/backend.log
/tmp/frontend.log

# System logs
/var/log/photobooth/app.log
/var/log/nginx/error.log

# Docker logs
docker-compose logs -f

# Systemd logs
journalctl -u photobooth-backend -f
```

### Useful Debug Commands
```bash
# Check all services
./scripts/api-test.sh

# Monitor resources
htop

# Network connections
netstat -tulpn

# File handles
lsof | grep photobooth

# Process tree
pstree -p | grep node
```

## Getting Help

If you continue to experience issues:

1. **Check the logs** - Most issues can be diagnosed from log files
2. **Search existing issues** - https://github.com/your-repo/photobooth-ng/issues
3. **Create a new issue** with:
   - Error messages
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)
   - Relevant log excerpts

## Emergency Recovery

If the system is completely broken:

```bash
# Full reset (CAUTION: This will delete all data!)
cd photobooth-ng
git clean -fdx
git reset --hard
npm install
npx nx reset
npx nx build backend
npx nx build frontend

# Restore from backup
./scripts/restore-backup.sh /path/to/backup.tar.gz
```

---
Last Updated: 10.08.2025