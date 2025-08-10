#!/bin/bash

# HTTPS Setup Script with Let's Encrypt for Photobooth
# This script sets up HTTPS using Let's Encrypt certificates

set -e

# Configuration
DOMAIN=""
EMAIL=""
NGINX_CONFIG="/etc/nginx/sites-available/photobooth"
CERT_PATH="/etc/letsencrypt/live"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Photobooth HTTPS Setup with Let's Encrypt${NC}"
echo -e "${GREEN}=========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Get domain name
if [ -z "$1" ]; then
    read -p "Enter your domain name (e.g., photobooth.example.com): " DOMAIN
else
    DOMAIN=$1
fi

# Get email for Let's Encrypt
if [ -z "$2" ]; then
    read -p "Enter your email for Let's Encrypt notifications: " EMAIL
else
    EMAIL=$2
fi

# Install Certbot
echo -e "${YELLOW}Installing Certbot...${NC}"
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Stop nginx temporarily
echo -e "${YELLOW}Stopping Nginx...${NC}"
systemctl stop nginx

# Obtain certificate
echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN"

# Create Nginx HTTPS configuration
echo -e "${YELLOW}Creating Nginx HTTPS configuration...${NC}"
cat > "$NGINX_CONFIG" << EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Certificate
    ssl_certificate $CERT_PATH/$DOMAIN/fullchain.pem;
    ssl_certificate_key $CERT_PATH/$DOMAIN/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' wss://$DOMAIN https://$DOMAIN;" always;
    
    # Logging
    access_log /var/log/nginx/photobooth_access.log;
    error_log /var/log/nginx/photobooth_error.log;
    
    # Frontend
    location / {
        proxy_pass http://localhost:4200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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
        
        # Increase timeouts for photo capture
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
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
    
    # Static uploads
    location /uploads {
        alias /opt/photobooth/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Metrics endpoint (protected)
    location /metrics {
        proxy_pass http://localhost:3000/metrics;
        allow 127.0.0.1;
        deny all;
    }
}
EOF

# Enable the site
echo -e "${YELLOW}Enabling site configuration...${NC}"
ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo -e "${YELLOW}Testing Nginx configuration...${NC}"
nginx -t

# Start Nginx
echo -e "${YELLOW}Starting Nginx...${NC}"
systemctl start nginx
systemctl reload nginx

# Setup auto-renewal
echo -e "${YELLOW}Setting up auto-renewal...${NC}"
cat > /etc/systemd/system/certbot-renewal.service << EOF
[Unit]
Description=Certbot Renewal
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
EOF

cat > /etc/systemd/system/certbot-renewal.timer << EOF
[Unit]
Description=Run certbot renewal twice daily
Requires=certbot-renewal.service

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable auto-renewal
systemctl daemon-reload
systemctl enable certbot-renewal.timer
systemctl start certbot-renewal.timer

# Update firewall
echo -e "${YELLOW}Updating firewall rules...${NC}"
ufw allow 443/tcp
ufw reload

# Test HTTPS
echo -e "${YELLOW}Testing HTTPS connection...${NC}"
sleep 5
if curl -f "https://$DOMAIN" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ HTTPS is working!${NC}"
else
    echo -e "${YELLOW}⚠ HTTPS test failed. Please check your configuration.${NC}"
fi

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}HTTPS Setup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "Your site is now available at: ${GREEN}https://$DOMAIN${NC}"
echo ""
echo "Certificate details:"
echo "  - Certificate: $CERT_PATH/$DOMAIN/fullchain.pem"
echo "  - Private Key: $CERT_PATH/$DOMAIN/privkey.pem"
echo "  - Auto-renewal: Enabled (runs twice daily)"
echo ""
echo "Security features enabled:"
echo "  ✓ TLS 1.2 and 1.3 only"
echo "  ✓ Strong cipher suites"
echo "  ✓ HSTS (HTTP Strict Transport Security)"
echo "  ✓ Security headers (CSP, X-Frame-Options, etc.)"
echo "  ✓ SSL stapling"
echo ""
echo "To test SSL configuration:"
echo "  - Visit: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""