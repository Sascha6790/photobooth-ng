#!/bin/bash

# Photobooth Raspberry Pi Deployment Script
# This script deploys the photobooth application to a Raspberry Pi

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER=${DEPLOY_USER:-pi}
DEPLOY_HOST=${DEPLOY_HOST:-raspberrypi.local}
DEPLOY_PATH=${DEPLOY_PATH:-/home/pi/photobooth}
NODE_VERSION=${NODE_VERSION:-20}

echo -e "${GREEN}🚀 Photobooth Raspberry Pi Deployment${NC}"
echo "======================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print error and exit
error_exit() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

# Function to print warning
warning() {
    echo -e "${YELLOW}Warning: $1${NC}"
}

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists ssh; then
    error_exit "SSH is not installed"
fi

if ! command_exists rsync; then
    error_exit "rsync is not installed"
fi

if ! command_exists npm; then
    error_exit "npm is not installed"
fi

# Build the application
echo -e "\n${YELLOW}Building application...${NC}"

# Build backend
echo "Building backend..."
npx nx build backend --configuration=production || error_exit "Backend build failed"
success "Backend built successfully"

# Build frontend
echo "Building frontend..."
npx nx build frontend --configuration=production || error_exit "Frontend build failed"
success "Frontend built successfully"

# Create deployment package
echo -e "\n${YELLOW}Creating deployment package...${NC}"

DEPLOY_DIR="dist/deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy backend files
cp -r dist/backend $DEPLOY_DIR/
cp backend/package*.json $DEPLOY_DIR/backend/
cp -r backend/src/mail/templates $DEPLOY_DIR/backend/templates 2>/dev/null || true

# Copy frontend files
cp -r dist/frontend $DEPLOY_DIR/

# Copy configuration files
cat > $DEPLOY_DIR/.env.production << EOF
NODE_ENV=production
PORT=3000
DATABASE_TYPE=sqlite
DATABASE_PATH=/home/pi/photobooth/data/photobooth.db
JWT_SECRET=\$(openssl rand -base64 32)
MAIL_HOST=localhost
MAIL_PORT=25
MAIL_FROM="Photobooth <noreply@photobooth.local>"
GPIO_ENABLED=true
CAMERA_TYPE=gphoto2
EOF

# Create systemd service file
cat > $DEPLOY_DIR/photobooth.service << EOF
[Unit]
Description=Photobooth Application
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/photobooth
ExecStart=/usr/bin/node backend/main.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

# Logging
StandardOutput=append:/var/log/photobooth/app.log
StandardError=append:/var/log/photobooth/error.log

[Install]
WantedBy=multi-user.target
EOF

# Create nginx configuration
cat > $DEPLOY_DIR/photobooth.nginx << EOF
server {
    listen 80;
    server_name _;
    
    root /home/pi/photobooth/frontend;
    index index.html;
    
    # Frontend
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Create setup script for Raspberry Pi
cat > $DEPLOY_DIR/setup-pi.sh << 'SETUP_EOF'
#!/bin/bash

set -e

echo "Setting up Photobooth on Raspberry Pi..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y \
    nginx \
    sqlite3 \
    gphoto2 \
    imagemagick \
    git \
    build-essential \
    python3-pip

# Install Node.js if not present
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Create directories
sudo mkdir -p /var/log/photobooth
sudo mkdir -p /home/pi/photobooth/data/images
sudo mkdir -p /home/pi/photobooth/data/thumbs
sudo chown -R pi:pi /home/pi/photobooth
sudo chown -R pi:pi /var/log/photobooth

# Install backend dependencies
cd /home/pi/photobooth/backend
npm ci --production

# Setup systemd service
sudo cp /home/pi/photobooth/photobooth.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable photobooth

# Setup nginx
sudo cp /home/pi/photobooth/photobooth.nginx /etc/nginx/sites-available/photobooth
sudo ln -sf /etc/nginx/sites-available/photobooth /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup GPIO permissions
sudo usermod -a -G gpio pi

# Enable camera
sudo raspi-config nonint do_camera 0

echo "Setup complete! Starting photobooth service..."
sudo systemctl start photobooth

echo "Photobooth is now running!"
echo "Access it at: http://$(hostname -I | cut -d' ' -f1)"
SETUP_EOF

chmod +x $DEPLOY_DIR/setup-pi.sh

success "Deployment package created"

# Deploy to Raspberry Pi
echo -e "\n${YELLOW}Deploying to Raspberry Pi...${NC}"
echo "Target: $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH"

# Check if we can connect to the Pi
if ! ssh -o ConnectTimeout=5 $DEPLOY_USER@$DEPLOY_HOST "echo 'Connected'" >/dev/null 2>&1; then
    error_exit "Cannot connect to Raspberry Pi at $DEPLOY_HOST"
fi

# Create target directory
ssh $DEPLOY_USER@$DEPLOY_HOST "mkdir -p $DEPLOY_PATH"

# Copy files
echo "Copying files..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '*.log' \
    $DEPLOY_DIR/ $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/

success "Files copied successfully"

# Run setup on Pi
echo -e "\n${YELLOW}Running setup on Raspberry Pi...${NC}"
ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && bash setup-pi.sh"

# Check service status
echo -e "\n${YELLOW}Checking service status...${NC}"
ssh $DEPLOY_USER@$DEPLOY_HOST "sudo systemctl status photobooth --no-pager" || true

echo -e "\n${GREEN}======================================"
echo -e "🎉 Deployment Complete!"
echo -e "======================================${NC}"
echo ""
echo "Photobooth is running at:"
echo -e "${GREEN}http://$DEPLOY_HOST${NC}"
echo ""
echo "Useful commands:"
echo "  Check logs:    ssh $DEPLOY_USER@$DEPLOY_HOST 'sudo journalctl -u photobooth -f'"
echo "  Restart:       ssh $DEPLOY_USER@$DEPLOY_HOST 'sudo systemctl restart photobooth'"
echo "  Stop:          ssh $DEPLOY_USER@$DEPLOY_HOST 'sudo systemctl stop photobooth'"
echo ""