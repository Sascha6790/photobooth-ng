# Photobooth-NG Administrator Guide

## Table of Contents

1. [Administrator Overview](#administrator-overview)
2. [Initial Setup](#initial-setup)
3. [Admin Panel Access](#admin-panel-access)
4. [Configuration Settings](#configuration-settings)
5. [Hardware Configuration](#hardware-configuration)
6. [User Management](#user-management)
7. [Event Management](#event-management)
8. [Monitoring & Analytics](#monitoring--analytics)
9. [Maintenance Tasks](#maintenance-tasks)
10. [Security Management](#security-management)
11. [Backup & Recovery](#backup--recovery)
12. [API Documentation](#api-documentation)
13. [Automation & Scripts](#automation--scripts)
14. [Troubleshooting Guide](#troubleshooting-guide)

## Administrator Overview

As an administrator of Photobooth-NG, you have complete control over:
- System configuration and settings
- Hardware setup and calibration
- User access and permissions
- Event creation and management
- Data backup and recovery
- Security and privacy settings
- Performance monitoring

### Administrator Roles

| Role | Permissions | Typical User |
|------|------------|--------------|
| **Super Admin** | Full system access, all settings | System owner |
| **Event Admin** | Event-specific settings, user management | Event coordinator |
| **Technical Admin** | Hardware, network, maintenance | IT staff |
| **Content Admin** | Templates, filters, overlays | Designer |

## Initial Setup

### System Requirements

#### Minimum Requirements
- **CPU**: Dual-core 2.0 GHz
- **RAM**: 4GB
- **Storage**: 20GB free space
- **Network**: 100 Mbps connection
- **OS**: Ubuntu 20.04+ / Raspberry Pi OS / Windows 10+ / macOS 11+

#### Recommended Setup
- **CPU**: Quad-core 2.5 GHz+
- **RAM**: 8GB+
- **Storage**: 100GB+ SSD
- **Network**: Gigabit Ethernet
- **Display**: 1920x1080 touchscreen

### Installation

#### Quick Install (Docker)

```bash
# Clone repository
git clone https://github.com/your-repo/photobooth-ng.git
cd photobooth-ng

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env

# Start with Docker
docker-compose up -d
```

#### Manual Installation

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install dependencies
npm install

# Build application
npm run build

# Start services
npm run start:prod
```

### First-Time Configuration

1. **Access Admin Panel**: Navigate to `http://localhost:4200/admin`
2. **Create Admin Account**: Use the setup wizard
3. **Configure Basic Settings**: Company name, event details
4. **Test Hardware**: Camera, printer, GPIO
5. **Set Security**: Change default passwords, enable HTTPS

## Admin Panel Access

### Accessing the Admin Panel

```
URL: http://your-domain:4200/admin
Default Username: admin
Default Password: changeme123
```

### Admin Panel Sections

#### Dashboard
- System status overview
- Active sessions count
- Recent activity log
- Storage usage
- Performance metrics

#### Settings
- General configuration
- Camera settings
- Print options
- Network configuration
- Display preferences

#### Gallery Management
- View all photos
- Bulk operations
- Export options
- Storage cleanup

#### User Management
- Create/edit users
- Permission management
- Session monitoring
- Access logs

## Configuration Settings

### General Settings

```typescript
// config/general.json
{
  "application": {
    "name": "My Photobooth",
    "language": "en",
    "timezone": "UTC",
    "dateFormat": "MM/DD/YYYY",
    "currency": "USD"
  },
  "event": {
    "name": "Wedding Reception",
    "date": "2025-08-15",
    "location": "Grand Ballroom",
    "host": "Smith Family"
  },
  "branding": {
    "logo": "/assets/logo.png",
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d",
    "font": "Roboto"
  }
}
```

### Camera Configuration

#### Camera Types

| Type | Use Case | Configuration |
|------|----------|---------------|
| **Webcam** | Basic setup | USB webcam, browser API |
| **DSLR** | Professional | gphoto2, tethering |
| **Raspberry Pi Camera** | Embedded | raspistill, GPU acceleration |
| **IP Camera** | Network | RTSP stream, ONVIF |

#### Camera Settings

```typescript
// config/camera.json
{
  "camera": {
    "type": "dslr",
    "device": "/dev/video0",
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "quality": 95,
    "format": "jpeg",
    "iso": "auto",
    "shutterSpeed": "1/125",
    "aperture": "f/5.6",
    "whiteBalance": "auto",
    "autofocus": true,
    "flash": "auto"
  },
  "preview": {
    "enabled": true,
    "fps": 30,
    "mirror": true,
    "overlay": true
  },
  "capture": {
    "countdown": 3,
    "betweenShots": 2,
    "postCapturePreview": 3,
    "sound": true,
    "flashEffect": true
  }
}
```

### Print Configuration

```typescript
// config/print.json
{
  "printer": {
    "enabled": true,
    "name": "Canon SELPHY CP1300",
    "driver": "cups",
    "paperSize": "4x6",
    "quality": "high",
    "copies": 1,
    "borderless": true
  },
  "layouts": {
    "single": {
      "enabled": true,
      "template": "standard"
    },
    "strip": {
      "enabled": true,
      "photos": 4,
      "orientation": "vertical"
    },
    "collage": {
      "enabled": true,
      "grid": "2x2"
    }
  },
  "queue": {
    "maxSize": 100,
    "autoPrint": false,
    "priorityPrinting": true
  },
  "restrictions": {
    "maxPrintsPerSession": 5,
    "requireApproval": false,
    "watermark": true
  }
}
```

### Storage Configuration

```typescript
// config/storage.json
{
  "local": {
    "path": "/var/photobooth/images",
    "maxSize": "50GB",
    "cleanup": {
      "enabled": true,
      "retention": 30,
      "schedule": "0 2 * * *"
    }
  },
  "remote": {
    "enabled": true,
    "type": "s3",
    "bucket": "photobooth-images",
    "region": "us-east-1",
    "accessKey": "***",
    "secretKey": "***"
  },
  "backup": {
    "enabled": true,
    "destination": "/backup",
    "schedule": "0 3 * * *",
    "retention": 7
  }
}
```

## Hardware Configuration

### Camera Setup

#### DSLR Setup (gphoto2)

```bash
# Install gphoto2
sudo apt-get install gphoto2 libgphoto2-dev

# List connected cameras
gphoto2 --list-cameras

# Test capture
gphoto2 --capture-image-and-download

# Configure camera settings
gphoto2 --set-config iso=400
gphoto2 --set-config shutterspeed="1/125"
gphoto2 --set-config aperture="5.6"
```

#### Raspberry Pi Camera

```bash
# Enable camera interface
sudo raspi-config
# Navigate to: Interface Options > Camera > Enable

# Test camera
raspistill -o test.jpg

# Configure camera
sudo nano /boot/config.txt
# Add: gpu_mem=256
```

#### Webcam Setup

```javascript
// Check available cameras
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    const cameras = devices.filter(d => d.kind === 'videoinput');
    console.log('Available cameras:', cameras);
  });
```

### Printer Setup

#### CUPS Configuration

```bash
# Install CUPS
sudo apt-get install cups

# Add printer
sudo lpadmin -p photobooth -v usb://Canon/SELPHY -m everywhere

# Set default
sudo lpadmin -d photobooth

# Enable printer
sudo cupsenable photobooth
sudo cupsaccept photobooth

# Test print
lp -d photobooth test.jpg
```

#### Windows Printer

```powershell
# Add printer
Add-Printer -Name "Photobooth" -DriverName "Canon SELPHY CP1300" -PortName "USB001"

# Set default
Set-Printer -Name "Photobooth" -Default

# Test print
Print-Command -Name "Photobooth" -FilePath "test.jpg"
```

### GPIO Setup (Raspberry Pi)

```python
# /home/pi/gpio_setup.py
import RPi.GPIO as GPIO

# Setup
GPIO.setmode(GPIO.BCM)

# Button on GPIO 18
GPIO.setup(18, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# LED on GPIO 23
GPIO.setup(23, GPIO.OUT)

# Buzzer on GPIO 24
GPIO.setup(24, GPIO.OUT)

# Test
GPIO.output(23, GPIO.HIGH)  # LED on
GPIO.output(24, GPIO.HIGH)  # Buzzer on
```

### Display Configuration

```bash
# Touchscreen calibration
sudo apt-get install xinput-calibrator
xinput_calibrator

# Rotation (if needed)
# /boot/config.txt
display_rotate=1  # 90 degrees

# Resolution
xrandr --output HDMI-1 --mode 1920x1080 --rate 60

# Prevent screen sleep
xset s off
xset -dpms
xset s noblank
```

## User Management

### User Roles

```typescript
interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
}

const roles: UserRole[] = [
  {
    id: 'admin',
    name: 'Administrator',
    permissions: ['all']
  },
  {
    id: 'operator',
    name: 'Operator',
    permissions: ['capture', 'print', 'gallery:view']
  },
  {
    id: 'guest',
    name: 'Guest',
    permissions: ['capture', 'gallery:view:own']
  }
];
```

### Creating Users

```bash
# CLI method
npx nx run backend:user:create \
  --username="john" \
  --email="john@example.com" \
  --role="operator"

# API method
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "role": "operator",
    "password": "securePassword123"
  }'
```

### Session Management

```typescript
// Monitor active sessions
GET /api/sessions
{
  "sessions": [
    {
      "id": "session-123",
      "userId": "user-456",
      "startTime": "2025-08-10T10:00:00Z",
      "photoCount": 25,
      "lastActivity": "2025-08-10T10:30:00Z",
      "status": "active"
    }
  ]
}

// Terminate session
DELETE /api/sessions/:sessionId
```

## Event Management

### Creating Events

```typescript
// POST /api/events
{
  "name": "Smith Wedding",
  "date": "2025-08-15",
  "startTime": "18:00",
  "endTime": "23:00",
  "location": "Grand Ballroom",
  "settings": {
    "theme": "wedding",
    "filters": ["vintage", "blackwhite", "romantic"],
    "printLayouts": ["single", "strip"],
    "maxPhotosPerSession": 50,
    "sessionTimeout": 300
  },
  "branding": {
    "logo": "/uploads/smith-wedding-logo.png",
    "watermark": true,
    "hashtag": "#SmithWedding2025"
  }
}
```

### Event Templates

```typescript
const templates = {
  wedding: {
    filters: ["romantic", "vintage", "soft"],
    overlays: ["hearts", "flowers", "rings"],
    music: "romantic",
    countdown: 5
  },
  birthday: {
    filters: ["vibrant", "party", "fun"],
    overlays: ["balloons", "confetti", "cake"],
    music: "upbeat",
    countdown: 3
  },
  corporate: {
    filters: ["professional", "clean"],
    overlays: ["logo", "minimal"],
    music: "none",
    countdown: 3
  }
};
```

### Event Schedule

```typescript
// Schedule automation
{
  "schedule": [
    {
      "time": "18:00",
      "action": "start",
      "settings": { "mode": "welcome" }
    },
    {
      "time": "19:00",
      "action": "announcement",
      "message": "Dinner is served!"
    },
    {
      "time": "21:00",
      "action": "mode_change",
      "settings": { "mode": "party" }
    },
    {
      "time": "23:00",
      "action": "stop",
      "settings": { "showThanks": true }
    }
  ]
}
```

## Monitoring & Analytics

### System Metrics

```bash
# Real-time monitoring
curl http://localhost:3000/api/metrics

# Response
{
  "system": {
    "cpu": 45.2,
    "memory": 62.5,
    "disk": 35.8,
    "uptime": 86400
  },
  "application": {
    "sessions": 5,
    "photosToday": 250,
    "printsToday": 180,
    "activeUsers": 12
  }
}
```

### Performance Monitoring

```typescript
// Prometheus metrics endpoint
GET /metrics

# HELP photobooth_captures_total Total number of captures
# TYPE photobooth_captures_total counter
photobooth_captures_total 1250

# HELP photobooth_capture_duration_seconds Capture duration
# TYPE photobooth_capture_duration_seconds histogram
photobooth_capture_duration_seconds_bucket{le="1"} 980
photobooth_capture_duration_seconds_bucket{le="2"} 1200
photobooth_capture_duration_seconds_bucket{le="5"} 1250
```

### Analytics Dashboard

```javascript
// Custom analytics queries
const analytics = {
  popularFilters: `
    SELECT filter, COUNT(*) as usage
    FROM photos
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY filter
    ORDER BY usage DESC
    LIMIT 10
  `,
  
  peakHours: `
    SELECT EXTRACT(HOUR FROM created_at) as hour,
           COUNT(*) as photos
    FROM photos
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY hour
    ORDER BY hour
  `,
  
  sessionStats: `
    SELECT AVG(photo_count) as avg_photos,
           AVG(duration) as avg_duration,
           MAX(photo_count) as max_photos
    FROM sessions
    WHERE ended_at IS NOT NULL
  `
};
```

### Grafana Dashboard Setup

```yaml
# docker-compose.monitoring.yml
services:
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
```

## Maintenance Tasks

### Regular Maintenance

#### Daily Tasks
```bash
#!/bin/bash
# daily-maintenance.sh

# Check disk space
df -h /var/photobooth

# Clear temporary files
find /tmp -name "photobooth-*" -mtime +1 -delete

# Verify services
systemctl status photobooth-backend
systemctl status photobooth-frontend

# Check error logs
tail -n 100 /var/log/photobooth/error.log | grep ERROR

# Database vacuum
psql -U photobooth -c "VACUUM ANALYZE;"
```

#### Weekly Tasks
```bash
#!/bin/bash
# weekly-maintenance.sh

# Full backup
/opt/photobooth/scripts/backup.sh

# Update packages
apt-get update && apt-get upgrade -y

# Clean old photos (> 30 days)
find /var/photobooth/images -mtime +30 -delete

# Generate report
/opt/photobooth/scripts/generate-report.sh

# Test hardware
/opt/photobooth/scripts/hardware-test.sh
```

### Database Maintenance

```sql
-- Cleanup old sessions
DELETE FROM sessions 
WHERE ended_at < NOW() - INTERVAL '30 days';

-- Optimize tables
VACUUM FULL photos;
REINDEX TABLE photos;
ANALYZE photos;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Log Management

```bash
# Rotate logs
cat > /etc/logrotate.d/photobooth << EOF
/var/log/photobooth/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 photobooth photobooth
    postrotate
        systemctl reload photobooth-backend
    endscript
}
EOF

# Archive old logs
tar -czf logs-$(date +%Y%m%d).tar.gz /var/log/photobooth/*.log.1
```

### Update Procedures

```bash
#!/bin/bash
# update.sh

# Backup current version
cp -r /opt/photobooth /opt/photobooth.backup

# Pull latest code
cd /opt/photobooth
git pull origin main

# Install dependencies
npm ci

# Run migrations
npm run migration:run

# Build application
npm run build

# Restart services
systemctl restart photobooth-backend
systemctl restart photobooth-frontend

# Verify update
curl http://localhost:3000/api/version
```

## Security Management

### Authentication Setup

```typescript
// JWT Configuration
{
  "auth": {
    "jwt": {
      "secret": "your-secret-key-change-this",
      "expiresIn": "24h",
      "refreshExpiresIn": "7d"
    },
    "session": {
      "secret": "session-secret-change-this",
      "maxAge": 86400000,
      "secure": true,
      "httpOnly": true
    }
  }
}
```

### HTTPS Configuration

```bash
# Generate SSL certificate (Let's Encrypt)
sudo certbot certonly --standalone -d your-domain.com

# Nginx configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://localhost:4200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Security Headers

```typescript
// helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Rate Limiting

```typescript
// Rate limiting configuration
const rateLimits = {
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // limit each IP to 1000 requests
  },
  api: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5 // 5 login attempts
  },
  capture: {
    windowMs: 60 * 1000,
    max: 10 // 10 captures per minute
  }
};
```

### Access Control

```typescript
// IP Whitelist/Blacklist
{
  "security": {
    "ipWhitelist": {
      "enabled": false,
      "ips": ["192.168.1.0/24", "10.0.0.0/8"]
    },
    "ipBlacklist": {
      "enabled": true,
      "ips": ["192.168.1.100", "10.0.0.50"]
    },
    "geoBlocking": {
      "enabled": false,
      "allowedCountries": ["US", "CA", "GB"]
    }
  }
}
```

## Backup & Recovery

### Backup Strategy

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/photobooth"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U photobooth photobooth_db > /tmp/database_$DATE.sql

# Files backup
tar -czf $BACKUP_FILE \
  /var/photobooth/images \
  /opt/photobooth/config \
  /tmp/database_$DATE.sql

# Upload to remote storage (optional)
aws s3 cp $BACKUP_FILE s3://photobooth-backups/

# Clean old backups (keep last 7)
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

# Verify backup
tar -tzf $BACKUP_FILE | head -10
```

### Recovery Procedures

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    exit 1
fi

# Stop services
systemctl stop photobooth-backend
systemctl stop photobooth-frontend

# Extract backup
tar -xzf $BACKUP_FILE -C /

# Restore database
psql -U photobooth photobooth_db < /tmp/database_*.sql

# Fix permissions
chown -R photobooth:photobooth /var/photobooth
chown -R photobooth:photobooth /opt/photobooth

# Start services
systemctl start photobooth-backend
systemctl start photobooth-frontend

echo "Restore complete!"
```

### Disaster Recovery Plan

1. **Immediate Actions**
   - Stop all services
   - Assess damage/data loss
   - Switch to backup system if available

2. **Recovery Steps**
   - Restore from most recent backup
   - Verify database integrity
   - Test all hardware connections
   - Validate configuration files

3. **Verification**
   - Test camera capture
   - Verify print functionality
   - Check network connectivity
   - Confirm user access

4. **Post-Recovery**
   - Document incident
   - Update recovery procedures
   - Schedule additional backups
   - Review security logs

## API Documentation

### Authentication Endpoints

```typescript
// Login
POST /api/auth/login
{
  "username": "admin",
  "password": "password"
}

// Response
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "123",
    "username": "admin",
    "role": "admin"
  }
}

// Refresh token
POST /api/auth/refresh
{
  "refresh_token": "eyJhbGc..."
}

// Logout
POST /api/auth/logout
```

### Admin Endpoints

```typescript
// System status
GET /api/admin/status
Authorization: Bearer <token>

// Settings management
GET /api/admin/settings
PUT /api/admin/settings
{
  "category": "camera",
  "settings": { ... }
}

// User management
GET /api/admin/users
POST /api/admin/users
PUT /api/admin/users/:id
DELETE /api/admin/users/:id

// Session management
GET /api/admin/sessions
DELETE /api/admin/sessions/:id

// Gallery management
GET /api/admin/gallery
DELETE /api/admin/gallery/:id
POST /api/admin/gallery/bulk-delete
{
  "ids": ["id1", "id2", "id3"]
}
```

### WebSocket Events

```javascript
// Connect to admin namespace
const adminSocket = io('/admin', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for events
adminSocket.on('system:status', (data) => {
  console.log('System status:', data);
});

adminSocket.on('session:created', (session) => {
  console.log('New session:', session);
});

adminSocket.on('error:critical', (error) => {
  console.error('Critical error:', error);
});

// Emit admin commands
adminSocket.emit('admin:shutdown', { graceful: true });
adminSocket.emit('admin:clear-cache');
adminSocket.emit('admin:restart-service', { service: 'camera' });
```

## Automation & Scripts

### Automated Tasks

```javascript
// Schedule tasks with node-cron
import * as cron from 'node-cron';

// Daily cleanup at 2 AM
cron.schedule('0 2 * * *', async () => {
  await cleanupOldPhotos();
  await optimizeDatabase();
  await generateDailyReport();
});

// Hourly health check
cron.schedule('0 * * * *', async () => {
  await checkSystemHealth();
  await verifyHardware();
  await syncRemoteStorage();
});

// Every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  await processQueue();
  await updateMetrics();
});
```

### Custom Scripts

```bash
# reset-event.sh - Reset for new event
#!/bin/bash

echo "Resetting for new event..."

# Clear gallery
rm -rf /var/photobooth/images/*

# Reset database
psql -U photobooth -c "TRUNCATE photos, sessions, print_jobs;"

# Clear cache
redis-cli FLUSHALL

# Reset counters
echo "0" > /var/photobooth/counters/photos
echo "0" > /var/photobooth/counters/prints

# Restart services
systemctl restart photobooth-backend
systemctl restart photobooth-frontend

echo "Reset complete!"
```

### Integration Scripts

```python
# sync-to-cloud.py
import boto3
import os
from datetime import datetime, timedelta

s3 = boto3.client('s3')
bucket = 'photobooth-archive'

def sync_photos():
    local_path = '/var/photobooth/images'
    
    for root, dirs, files in os.walk(local_path):
        for file in files:
            if file.endswith('.jpg'):
                local_file = os.path.join(root, file)
                s3_key = f"events/{datetime.now().strftime('%Y-%m-%d')}/{file}"
                
                # Upload to S3
                s3.upload_file(local_file, bucket, s3_key)
                print(f"Uploaded {file} to S3")

if __name__ == "__main__":
    sync_photos()
```

## Troubleshooting Guide

### Common Admin Issues

#### Cannot Access Admin Panel

1. **Check authentication**
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

2. **Reset admin password**
```bash
npx nx run backend:user:reset-password --username=admin
```

#### Configuration Not Saving

1. **Check file permissions**
```bash
ls -la /opt/photobooth/config/
chown -R photobooth:photobooth /opt/photobooth/config/
```

2. **Verify database connection**
```bash
psql -U photobooth -d photobooth_db -c "SELECT 1;"
```

#### Services Won't Start

1. **Check ports**
```bash
netstat -tulpn | grep -E "3000|4200"
```

2. **Review logs**
```bash
journalctl -u photobooth-backend -n 50
tail -f /var/log/photobooth/error.log
```

### Performance Issues

#### Slow Response Times

1. **Check resource usage**
```bash
top -n 1
df -h
free -m
```

2. **Analyze database queries**
```sql
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

3. **Clear caches**
```bash
redis-cli FLUSHALL
npm run cache:clear
```

### Hardware Issues

#### Camera Not Detected

```bash
# List USB devices
lsusb

# Check camera module (RPi)
vcgencmd get_camera

# Test gphoto2
gphoto2 --auto-detect
```

#### Printer Not Working

```bash
# Check CUPS status
systemctl status cups

# List printers
lpstat -p -d

# Test print
echo "Test" | lp -d photobooth
```

## Best Practices

### Security Best Practices

1. **Always use HTTPS in production**
2. **Change default passwords immediately**
3. **Enable rate limiting**
4. **Regular security updates**
5. **Implement proper CORS policies**
6. **Use environment variables for secrets**
7. **Enable audit logging**
8. **Regular backup verification**

### Performance Best Practices

1. **Optimize images before storage**
2. **Implement caching strategies**
3. **Use CDN for static assets**
4. **Database indexing on common queries**
5. **Regular cleanup of old data**
6. **Monitor resource usage**
7. **Load testing before events**

### Maintenance Best Practices

1. **Document all configuration changes**
2. **Test updates in staging first**
3. **Keep detailed logs**
4. **Regular hardware checks**
5. **Maintain spare hardware**
6. **Create runbooks for common tasks**
7. **Train backup operators**

---
Version 1.0.0 | Last Updated: 10.08.2025