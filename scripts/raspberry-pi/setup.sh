#!/bin/bash

# Photobooth Raspberry Pi Setup Script
# This script sets up the Photobooth application on a Raspberry Pi

set -e

echo "========================================="
echo "Photobooth Raspberry Pi Setup"
echo "========================================="

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required system packages
echo "Installing system dependencies..."
sudo apt-get install -y \
    nodejs \
    npm \
    nginx \
    postgresql \
    postgresql-contrib \
    redis-server \
    gphoto2 \
    cups \
    cups-client \
    python3-pip \
    python3-dev \
    git \
    build-essential \
    cmake \
    libgphoto2-dev \
    libcups2-dev \
    usbutils \
    v4l-utils

# Install Node.js 20.x if not already at correct version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt "20" ]; then
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Enable hardware interfaces
echo "Enabling hardware interfaces..."
sudo raspi-config nonint do_camera 0  # Enable camera
sudo raspi-config nonint do_i2c 0     # Enable I2C
sudo raspi-config nonint do_spi 0     # Enable SPI

# Install GPIO library for Node.js
echo "Installing GPIO libraries..."
sudo npm install -g onoff pigpio

# Create photobooth user and group
echo "Creating photobooth user..."
sudo useradd -m -s /bin/bash photobooth || true
sudo usermod -aG gpio,i2c,spi,video,audio photobooth

# Setup PostgreSQL
echo "Setting up PostgreSQL..."
sudo -u postgres psql <<EOF
CREATE USER photobooth WITH PASSWORD 'photobooth123';
CREATE DATABASE photobooth_db OWNER photobooth;
GRANT ALL PRIVILEGES ON DATABASE photobooth_db TO photobooth;
EOF

# Setup Redis
echo "Configuring Redis..."
sudo sed -i 's/^# maxmemory <bytes>/maxmemory 128mb/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
sudo systemctl restart redis-server

# Create application directories
echo "Creating application directories..."
sudo mkdir -p /opt/photobooth
sudo mkdir -p /var/log/photobooth
sudo mkdir -p /opt/photobooth/uploads
sudo mkdir -p /opt/photobooth/backups
sudo chown -R photobooth:photobooth /opt/photobooth
sudo chown -R photobooth:photobooth /var/log/photobooth

# Setup Nginx
echo "Configuring Nginx..."
cat <<'NGINX' | sudo tee /etc/nginx/sites-available/photobooth
server {
    listen 80;
    server_name _;
    
    # Frontend
    location / {
        proxy_pass http://localhost:4200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static uploads
    location /uploads {
        alias /opt/photobooth/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/photobooth /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup firewall
echo "Configuring firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3000/tcp # Backend (dev)
sudo ufw allow 4200/tcp # Frontend (dev)
echo "y" | sudo ufw enable

# Setup automatic backups
echo "Setting up automatic backups..."
cat <<'BACKUP' | sudo tee /opt/photobooth/backup.sh
#!/bin/bash
BACKUP_DIR="/opt/photobooth/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_BACKUP="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
FILES_BACKUP="$BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U photobooth photobooth_db > $DB_BACKUP

# Backup uploaded files
tar -czf $FILES_BACKUP /opt/photobooth/uploads

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
BACKUP

sudo chmod +x /opt/photobooth/backup.sh
sudo chown photobooth:photobooth /opt/photobooth/backup.sh

# Add backup cron job
echo "0 2 * * * /opt/photobooth/backup.sh >> /var/log/photobooth/backup.log 2>&1" | sudo crontab -u photobooth -

# Setup log rotation
echo "Configuring log rotation..."
cat <<'LOGROTATE' | sudo tee /etc/logrotate.d/photobooth
/var/log/photobooth/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 photobooth photobooth
    sharedscripts
    postrotate
        systemctl reload photobooth-backend || true
        systemctl reload photobooth-frontend || true
    endscript
}
LOGROTATE

# Performance tuning
echo "Applying performance optimizations..."
cat <<'SYSCTL' | sudo tee -a /etc/sysctl.conf
# Photobooth Performance Tuning
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_tw_reuse = 1
fs.file-max = 65536
SYSCTL
sudo sysctl -p

# Create environment file
echo "Creating environment configuration..."
cat <<'ENV' | sudo tee /opt/photobooth/.env
NODE_ENV=production
DATABASE_URL=postgresql://photobooth:photobooth123@localhost:5432/photobooth_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=$(openssl rand -base64 32)
UPLOAD_DIR=/opt/photobooth/uploads
BACKUP_DIR=/opt/photobooth/backups
LOG_LEVEL=info
ENV
sudo chown photobooth:photobooth /opt/photobooth/.env
sudo chmod 600 /opt/photobooth/.env

# Enable services to start on boot
echo "Enabling services..."
sudo systemctl enable postgresql
sudo systemctl enable redis-server
sudo systemctl enable nginx

echo "========================================="
echo "Setup completed successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Deploy the application to /opt/photobooth/"
echo "2. Run: sudo systemctl start photobooth-backend"
echo "3. Run: sudo systemctl start photobooth-frontend"
echo "4. Access the application at http://$(hostname -I | cut -d' ' -f1)"
echo ""
echo "Default credentials:"
echo "Database: photobooth / photobooth123"
echo ""
echo "Logs are available at: /var/log/photobooth/"
echo "Backups are stored at: /opt/photobooth/backups/"
echo ""