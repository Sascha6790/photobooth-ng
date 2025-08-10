#!/bin/bash

# Photobooth Raspberry Pi Installation Script
# This script prepares a fresh Raspberry Pi for the photobooth application

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Photobooth Raspberry Pi Installer    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo -e "${YELLOW}Warning: This doesn't appear to be a Raspberry Pi${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# Install system dependencies
echo -e "${YELLOW}Installing system dependencies...${NC}"
sudo apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    nginx \
    sqlite3 \
    gphoto2 \
    libgphoto2-dev \
    imagemagick \
    python3-pip \
    python3-dev \
    libatlas-base-dev \
    usbutils \
    v4l-utils \
    fswebcam \
    libcap2-bin

echo -e "${GREEN}✓ System dependencies installed${NC}"

# Install Node.js 20
echo -e "${YELLOW}Installing Node.js 20...${NC}"
if ! command -v node >/dev/null 2>&1 || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}✓ Node.js $(node -v) installed${NC}"
else
    echo -e "${GREEN}✓ Node.js $(node -v) already installed${NC}"
fi

# Install PM2 for process management
echo -e "${YELLOW}Installing PM2...${NC}"
sudo npm install -g pm2
sudo pm2 startup systemd -u pi --hp /home/pi
echo -e "${GREEN}✓ PM2 installed${NC}"

# Setup GPIO
echo -e "${YELLOW}Setting up GPIO access...${NC}"
sudo usermod -a -G gpio pi
sudo usermod -a -G video pi
sudo usermod -a -G plugdev pi

# Enable GPIO permissions without sudo
sudo setcap cap_sys_rawio+ep /usr/bin/node

echo -e "${GREEN}✓ GPIO access configured${NC}"

# Enable camera
echo -e "${YELLOW}Enabling camera module...${NC}"
sudo raspi-config nonint do_camera 0 2>/dev/null || true

# Increase GPU memory split
sudo raspi-config nonint do_memory_split 256

echo -e "${GREEN}✓ Camera enabled${NC}"

# Configure nginx
echo -e "${YELLOW}Configuring nginx...${NC}"
sudo tee /etc/nginx/sites-available/photobooth > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    root /home/pi/photobooth/frontend;
    index index.html;
    
    client_max_body_size 100M;
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
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
    
    # Static images
    location /images {
        alias /home/pi/photobooth/data/images;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    location /thumbs {
        alias /home/pi/photobooth/data/thumbs;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/photobooth /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo -e "${GREEN}✓ Nginx configured${NC}"

# Create directory structure
echo -e "${YELLOW}Creating directory structure...${NC}"
mkdir -p /home/pi/photobooth/{backend,frontend,data,logs}
mkdir -p /home/pi/photobooth/data/{images,thumbs,temp,backups}

echo -e "${GREEN}✓ Directories created${NC}"

# Setup auto-start on boot
echo -e "${YELLOW}Setting up auto-start...${NC}"
cat > /home/pi/photobooth/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'photobooth',
    script: '/home/pi/photobooth/backend/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_TYPE: 'sqlite',
      DATABASE_PATH: '/home/pi/photobooth/data/photobooth.db',
      GPIO_ENABLED: 'true',
      CAMERA_TYPE: 'gphoto2'
    },
    error_file: '/home/pi/photobooth/logs/error.log',
    out_file: '/home/pi/photobooth/logs/app.log',
    time: true
  }]
};
EOF

echo -e "${GREEN}✓ Auto-start configured${NC}"

# Setup kiosk mode (optional)
echo -e "${YELLOW}Setting up kiosk mode...${NC}"
read -p "Enable kiosk mode (auto-start browser in fullscreen)? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Install chromium
    sudo apt-get install -y chromium-browser xserver-xorg xinit openbox

    # Create autostart script
    mkdir -p /home/pi/.config/openbox
    cat > /home/pi/.config/openbox/autostart << 'EOF'
#!/bin/bash
xset -dpms
xset s off
xset s noblank
chromium-browser --kiosk --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state http://localhost &
EOF
    chmod +x /home/pi/.config/openbox/autostart

    # Auto-login and start X
    sudo raspi-config nonint do_boot_behaviour B4

    echo -e "${GREEN}✓ Kiosk mode enabled${NC}"
fi

# Performance optimizations
echo -e "${YELLOW}Applying performance optimizations...${NC}"

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon

# Configure swap
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

echo -e "${GREEN}✓ Performance optimizations applied${NC}"

# Create maintenance scripts
echo -e "${YELLOW}Creating maintenance scripts...${NC}"

# Cleanup script
cat > /home/pi/photobooth/cleanup.sh << 'EOF'
#!/bin/bash
# Clean up old photos and logs
find /home/pi/photobooth/data/temp -type f -mtime +1 -delete
find /home/pi/photobooth/logs -name "*.log" -mtime +30 -delete
find /home/pi/photobooth/data/backups -type f -mtime +30 -delete
EOF
chmod +x /home/pi/photobooth/cleanup.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 3 * * * /home/pi/photobooth/cleanup.sh") | crontab -

echo -e "${GREEN}✓ Maintenance scripts created${NC}"

# Final setup
echo -e "${YELLOW}Finalizing setup...${NC}"

# Set permissions
sudo chown -R pi:pi /home/pi/photobooth

# Create initial environment file
cat > /home/pi/photobooth/.env << EOF
NODE_ENV=production
PORT=3000
DATABASE_TYPE=sqlite
DATABASE_PATH=/home/pi/photobooth/data/photobooth.db
JWT_SECRET=$(openssl rand -base64 32)
GPIO_ENABLED=true
CAMERA_TYPE=gphoto2
EOF

echo -e "${GREEN}✓ Setup finalized${NC}"

# Display summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Installation Complete! 🎉        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}System Information:${NC}"
echo "  Hostname: $(hostname)"
echo "  IP Address: $(hostname -I | cut -d' ' -f1)"
echo "  Node.js: $(node -v)"
echo "  npm: $(npm -v)"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Deploy the application:"
echo "   Run: npm run deploy:pi"
echo ""
echo "2. Access the photobooth:"
echo "   http://$(hostname -I | cut -d' ' -f1)"
echo ""
echo -e "${YELLOW}Note: A reboot is recommended to apply all changes${NC}"
read -p "Reboot now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo reboot
fi