#!/bin/bash

# Setup script for Photobooth Auto-Update System

set -e

echo "🚀 Installing Photobooth Auto-Update System"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Variables
INSTALL_DIR="/opt/photobooth"
SCRIPTS_DIR="$INSTALL_DIR/scripts"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p /etc/photobooth
mkdir -p /var/log/photobooth
mkdir -p /var/backups/photobooth

# Copy auto-update script
echo "📄 Installing auto-update script..."
cp "$SCRIPTS_DIR/auto-update.sh" /usr/local/bin/photobooth-update
chmod +x /usr/local/bin/photobooth-update

# Install systemd service and timer
echo "⚙️ Installing systemd units..."
cp "$SCRIPTS_DIR/photobooth-updater.service" /etc/systemd/system/
cp "$SCRIPTS_DIR/photobooth-updater.timer" /etc/systemd/system/

# Create default configuration
echo "📝 Creating default configuration..."
cat > /etc/photobooth/update.conf << EOF
# Photobooth Auto-Update Configuration
AUTO_UPDATE_ENABLED=true
UPDATE_CHANNEL=stable  # stable, beta, or specific version
CHECK_INTERVAL=86400   # Check every 24 hours (in seconds)
AUTO_BACKUP=true
MAX_BACKUPS=5
NOTIFY_EMAIL=""  # Set email for notifications
EOF

# Set permissions
chown -R photobooth:photobooth /var/log/photobooth
chown -R photobooth:photobooth /var/backups/photobooth

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable timer
echo "⏰ Enabling auto-update timer..."
systemctl enable photobooth-updater.timer
systemctl start photobooth-updater.timer

# Create cron job as backup (optional)
echo "📅 Setting up cron backup..."
cat > /etc/cron.d/photobooth-update << EOF
# Photobooth Auto-Update - Check daily at 3 AM
0 3 * * * root /usr/local/bin/photobooth-update check >> /var/log/photobooth/update.log 2>&1
EOF

echo "✅ Auto-Update System installed successfully!"
echo ""
echo "📋 Available commands:"
echo "  photobooth-update check       - Check for updates"
echo "  photobooth-update status      - Show update status"
echo "  photobooth-update enable      - Enable auto-updates"
echo "  photobooth-update disable     - Disable auto-updates"
echo "  photobooth-update rollback    - Rollback to previous version"
echo ""
echo "⚙️ Configuration: /etc/photobooth/update.conf"
echo "📄 Logs: /var/log/photobooth/update.log"
echo ""
echo "🔍 Check timer status with: systemctl status photobooth-updater.timer"