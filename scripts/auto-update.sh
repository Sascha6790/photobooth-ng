#!/bin/bash

# Photobooth Auto-Update System for Raspberry Pi
# This script checks for updates and installs them automatically

set -e

# Configuration
REPO_OWNER="Sascha6790"
REPO_NAME="photobooth-ng"
INSTALL_DIR="/opt/photobooth"
CONFIG_FILE="/etc/photobooth/update.conf"
LOG_FILE="/var/log/photobooth/update.log"
BACKUP_DIR="/var/backups/photobooth"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${2:-$NC}$1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Create necessary directories
setup_directories() {
    sudo mkdir -p "$(dirname "$LOG_FILE")"
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p "$(dirname "$CONFIG_FILE")"
}

# Load configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
    else
        # Create default config
        cat > "$CONFIG_FILE" << EOF
# Photobooth Auto-Update Configuration
AUTO_UPDATE_ENABLED=true
UPDATE_CHANNEL=stable  # stable, beta, or specific version
CHECK_INTERVAL=86400   # Check every 24 hours (in seconds)
AUTO_BACKUP=true
MAX_BACKUPS=5
NOTIFY_EMAIL=""
EOF
        log "Created default configuration at $CONFIG_FILE" "$YELLOW"
    fi
}

# Get current version
get_current_version() {
    if [ -f "$INSTALL_DIR/package.json" ]; then
        grep '"version"' "$INSTALL_DIR/package.json" | cut -d '"' -f 4
    else
        echo "0.0.0"
    fi
}

# Get latest version from GitHub
get_latest_version() {
    local channel="${UPDATE_CHANNEL:-stable}"
    
    if [ "$channel" = "stable" ]; then
        curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest" | \
            grep '"tag_name":' | \
            sed -E 's/.*"v?([^"]+)".*/\1/'
    elif [ "$channel" = "beta" ]; then
        curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases" | \
            grep '"tag_name":' | \
            head -1 | \
            sed -E 's/.*"v?([^"]+)".*/\1/'
    else
        # Specific version
        echo "$channel"
    fi
}

# Compare versions
version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

# Create backup
create_backup() {
    if [ "$AUTO_BACKUP" = "true" ]; then
        local backup_name="photobooth-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
        log "Creating backup: $backup_name" "$BLUE"
        
        sudo tar -czf "$BACKUP_DIR/$backup_name" \
            -C "$(dirname "$INSTALL_DIR")" \
            "$(basename "$INSTALL_DIR")" \
            --exclude="node_modules" \
            --exclude="dist" \
            --exclude="*.log"
        
        # Remove old backups
        if [ -n "$MAX_BACKUPS" ] && [ "$MAX_BACKUPS" -gt 0 ]; then
            local backup_count=$(ls -1 "$BACKUP_DIR"/photobooth-backup-*.tar.gz 2>/dev/null | wc -l)
            if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
                ls -1t "$BACKUP_DIR"/photobooth-backup-*.tar.gz | \
                    tail -n $((backup_count - MAX_BACKUPS)) | \
                    xargs -r sudo rm
                log "Removed old backups (kept $MAX_BACKUPS most recent)" "$YELLOW"
            fi
        fi
        
        log "Backup created successfully" "$GREEN"
    fi
}

# Download and install update
install_update() {
    local version=$1
    local download_url="https://github.com/$REPO_OWNER/$REPO_NAME/releases/download/v$version/photobooth-ng-v$version-linux.tar.gz"
    local temp_file="/tmp/photobooth-update.tar.gz"
    
    log "Downloading version $version..." "$BLUE"
    
    # Download with retry
    local retry=0
    while [ $retry -lt 3 ]; do
        if curl -L -o "$temp_file" "$download_url"; then
            break
        fi
        retry=$((retry + 1))
        log "Download failed, retrying ($retry/3)..." "$YELLOW"
        sleep 5
    done
    
    if [ $retry -eq 3 ]; then
        log "Failed to download update after 3 attempts" "$RED"
        return 1
    fi
    
    # Verify download
    if [ ! -s "$temp_file" ]; then
        log "Downloaded file is empty or missing" "$RED"
        return 1
    fi
    
    log "Installing update..." "$BLUE"
    
    # Stop services
    sudo systemctl stop photobooth-backend photobooth-frontend 2>/dev/null || true
    
    # Extract update
    sudo tar -xzf "$temp_file" -C "$INSTALL_DIR" --strip-components=1
    
    # Install dependencies
    cd "$INSTALL_DIR"
    if [ -f "package.json" ]; then
        log "Installing dependencies..." "$BLUE"
        sudo npm ci --production
    fi
    
    # Run migrations
    if [ -f "scripts/migrate.sh" ]; then
        log "Running migrations..." "$BLUE"
        sudo bash scripts/migrate.sh
    fi
    
    # Update permissions
    sudo chown -R photobooth:photobooth "$INSTALL_DIR"
    
    # Restart services
    sudo systemctl start photobooth-backend photobooth-frontend
    
    # Cleanup
    rm -f "$temp_file"
    
    log "Update installed successfully!" "$GREEN"
    return 0
}

# Check system health after update
check_health() {
    log "Checking system health..." "$BLUE"
    
    local health_ok=true
    
    # Check backend service
    if systemctl is-active --quiet photobooth-backend; then
        log "✓ Backend service is running" "$GREEN"
    else
        log "✗ Backend service is not running" "$RED"
        health_ok=false
    fi
    
    # Check frontend service
    if systemctl is-active --quiet photobooth-frontend; then
        log "✓ Frontend service is running" "$GREEN"
    else
        log "✗ Frontend service is not running" "$RED"
        health_ok=false
    fi
    
    # Check API endpoint
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health | grep -q "200"; then
        log "✓ API is responding" "$GREEN"
    else
        log "✗ API is not responding" "$RED"
        health_ok=false
    fi
    
    if [ "$health_ok" = true ]; then
        log "System health check passed" "$GREEN"
        return 0
    else
        log "System health check failed" "$RED"
        return 1
    fi
}

# Rollback to backup
rollback() {
    local latest_backup=$(ls -1t "$BACKUP_DIR"/photobooth-backup-*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        log "No backup found for rollback" "$RED"
        return 1
    fi
    
    log "Rolling back to: $latest_backup" "$YELLOW"
    
    # Stop services
    sudo systemctl stop photobooth-backend photobooth-frontend 2>/dev/null || true
    
    # Restore backup
    sudo rm -rf "$INSTALL_DIR"
    sudo tar -xzf "$latest_backup" -C "$(dirname "$INSTALL_DIR")"
    
    # Restart services
    sudo systemctl start photobooth-backend photobooth-frontend
    
    log "Rollback completed" "$GREEN"
    return 0
}

# Send notification
send_notification() {
    local subject=$1
    local message=$2
    
    if [ -n "$NOTIFY_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$NOTIFY_EMAIL" 2>/dev/null || true
    fi
    
    # Also log to system journal
    logger -t photobooth-update "$subject: $message"
}

# Main update function
main() {
    log "========================================" "$BLUE"
    log "Photobooth Auto-Update System" "$BLUE"
    log "========================================" "$BLUE"
    
    setup_directories
    load_config
    
    if [ "$AUTO_UPDATE_ENABLED" != "true" ]; then
        log "Auto-update is disabled in configuration" "$YELLOW"
        exit 0
    fi
    
    local current_version=$(get_current_version)
    log "Current version: $current_version" "$BLUE"
    
    local latest_version=$(get_latest_version)
    if [ -z "$latest_version" ]; then
        log "Failed to get latest version" "$RED"
        exit 1
    fi
    log "Latest version: $latest_version" "$BLUE"
    
    if version_gt "$latest_version" "$current_version"; then
        log "Update available: $current_version -> $latest_version" "$GREEN"
        
        # Create backup before update
        create_backup
        
        # Install update
        if install_update "$latest_version"; then
            # Check health
            if check_health; then
                send_notification "Photobooth Updated" "Successfully updated from $current_version to $latest_version"
                log "Update completed successfully!" "$GREEN"
            else
                log "Health check failed, initiating rollback..." "$YELLOW"
                if rollback; then
                    send_notification "Photobooth Update Failed" "Update to $latest_version failed, rolled back to $current_version"
                    exit 1
                else
                    send_notification "Photobooth Update Critical" "Update failed and rollback failed! Manual intervention required."
                    exit 2
                fi
            fi
        else
            log "Update failed" "$RED"
            send_notification "Photobooth Update Failed" "Failed to install version $latest_version"
            exit 1
        fi
    else
        log "Already on latest version" "$GREEN"
    fi
    
    log "Update check completed" "$BLUE"
}

# Handle command-line arguments
case "${1:-check}" in
    check)
        main
        ;;
    install)
        # Force install specific version
        if [ -n "$2" ]; then
            UPDATE_CHANNEL="$2"
            main
        else
            echo "Usage: $0 install <version>"
            exit 1
        fi
        ;;
    rollback)
        rollback
        ;;
    enable)
        sed -i 's/AUTO_UPDATE_ENABLED=.*/AUTO_UPDATE_ENABLED=true/' "$CONFIG_FILE"
        log "Auto-update enabled" "$GREEN"
        ;;
    disable)
        sed -i 's/AUTO_UPDATE_ENABLED=.*/AUTO_UPDATE_ENABLED=false/' "$CONFIG_FILE"
        log "Auto-update disabled" "$YELLOW"
        ;;
    status)
        load_config
        echo "Auto-update: ${AUTO_UPDATE_ENABLED:-true}"
        echo "Current version: $(get_current_version)"
        echo "Latest version: $(get_latest_version)"
        echo "Update channel: ${UPDATE_CHANNEL:-stable}"
        ;;
    *)
        echo "Usage: $0 {check|install <version>|rollback|enable|disable|status}"
        exit 1
        ;;
esac