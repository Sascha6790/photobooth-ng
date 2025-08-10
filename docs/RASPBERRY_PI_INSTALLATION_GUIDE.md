# 📸 Photobooth Raspberry Pi Installation Guide

## Inhaltsverzeichnis
1. [Voraussetzungen](#voraussetzungen)
2. [Hardware Setup](#hardware-setup)
3. [Raspberry Pi OS Vorbereitung](#raspberry-pi-os-vorbereitung)
4. [Automatische Installation](#automatische-installation)
5. [Manuelle Installation](#manuelle-installation)
6. [Konfiguration](#konfiguration)
7. [Kamera Setup](#kamera-setup)
8. [Drucker Setup](#drucker-setup)
9. [Performance Optimierung](#performance-optimierung)
10. [Troubleshooting](#troubleshooting)
11. [Backup & Wartung](#backup--wartung)

---

## Voraussetzungen

### Hardware-Anforderungen

#### Minimum:
- **Raspberry Pi 4 Model B** (4GB RAM)
- **32GB microSD Karte** (Class 10 oder besser)
- **5V/3A USB-C Netzteil** (offizielles Raspberry Pi Netzteil empfohlen)
- **HDMI Kabel** für Display
- **USB Kamera** oder **DSLR mit gphoto2 Support**

#### Empfohlen:
- **Raspberry Pi 4 Model B** (8GB RAM) oder **Raspberry Pi 5**
- **64GB microSD Karte** oder **USB 3.0 SSD**
- **Kühlkörper und Lüfter** für bessere Performance
- **Touchscreen Display** (7" oder größer)
- **Canon/Nikon DSLR** für beste Bildqualität
- **Fotodrucker** (Canon Selphy, DNP DS-RX1, etc.)

### Software-Anforderungen
- **Raspberry Pi OS (64-bit)** - Bookworm oder neuer
- **Node.js 20+**
- **Git**
- Internetverbindung für Installation

---

## Hardware Setup

### 1. GPIO Pins für Buttons

```
Button Layout (BCM Numbering):
- Capture Button: GPIO 17 (Pin 11)
- Print Button: GPIO 27 (Pin 13)  
- Gallery Button: GPIO 22 (Pin 15)
- Cancel Button: GPIO 23 (Pin 16)
- LED Status: GPIO 24 (Pin 18)
- Buzzer: GPIO 25 (Pin 22)

Ground: Pin 6, 9, 14, 20, oder 25
```

### 2. Schaltplan

```
     Raspberry Pi GPIO                    Components
    ┌─────────────────┐
    │                 │
    │  GPIO 17 ───────┼──── [Button] ──── GND
    │  GPIO 27 ───────┼──── [Button] ──── GND
    │  GPIO 22 ───────┼──── [Button] ──── GND
    │  GPIO 23 ───────┼──── [Button] ──── GND
    │                 │
    │  GPIO 24 ───────┼──── [330Ω] ──── [LED] ──── GND
    │  GPIO 25 ───────┼──── [Buzzer+] ── [Buzzer-] ── GND
    │                 │
    └─────────────────┘
```

### 3. Pull-up Widerstände

Die internen Pull-up Widerstände werden automatisch aktiviert. Externe Widerstände sind nicht notwendig.

---

## Raspberry Pi OS Vorbereitung

### 1. Raspberry Pi Imager

Download: https://www.raspberrypi.com/software/

1. Wähle **Raspberry Pi OS (64-bit)**
2. Klicke auf das Zahnrad-Icon für erweiterte Optionen:
   ```
   - Hostname: photobooth
   - SSH aktivieren: ✓
   - Username: pi
   - Password: [sicheres Passwort]
   - WiFi konfigurieren: [optional]
   - Locale: de_DE.UTF-8
   ```
3. SD-Karte flashen

### 2. Erste Verbindung

```bash
# SSH Verbindung
ssh pi@photobooth.local
# oder mit IP-Adresse
ssh pi@192.168.1.XXX
```

### 3. System Update

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get dist-upgrade -y
sudo apt autoremove -y
sudo reboot
```

---

## Automatische Installation

### Schnellinstallation (Empfohlen)

```bash
# Script herunterladen und ausführen
curl -fsSL https://raw.githubusercontent.com/your-repo/photobooth-ng/main/scripts/install-raspberry-pi.sh -o install.sh
chmod +x install.sh
./install.sh
```

Das Script installiert automatisch:
- System-Dependencies
- Node.js 20
- PM2 Process Manager
- Nginx Webserver
- GPIO Zugriff
- Kamera Support
- Optional: Kiosk Mode

---

## Manuelle Installation

### 1. System Dependencies

```bash
# Basis-Pakete
sudo apt-get install -y \
    curl wget git build-essential \
    nginx sqlite3 \
    gphoto2 libgphoto2-dev \
    imagemagick \
    python3-pip python3-dev \
    libatlas-base-dev \
    usbutils v4l-utils fswebcam \
    libcap2-bin
```

### 2. Node.js Installation

```bash
# Node.js 20 installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v  # sollte v20.x.x zeigen
npm -v   # sollte 10.x.x zeigen
```

### 3. PM2 Installation

```bash
# PM2 global installieren
sudo npm install -g pm2

# PM2 Startup Script
sudo pm2 startup systemd -u pi --hp /home/pi
```

### 4. GPIO Setup

```bash
# User zu gpio Gruppe hinzufügen
sudo usermod -a -G gpio pi
sudo usermod -a -G video pi
sudo usermod -a -G plugdev pi

# GPIO Permissions für Node.js
sudo setcap cap_sys_rawio+ep /usr/bin/node

# Kamera aktivieren
sudo raspi-config nonint do_camera 0

# GPU Memory Split erhöhen
sudo raspi-config nonint do_memory_split 256
```

### 5. Photobooth Installation

```bash
# Repository klonen
cd /home/pi
git clone https://github.com/your-repo/photobooth-ng.git photobooth
cd photobooth

# Dependencies installieren
npm install

# Production Build
npm run build

# Environment Setup
cat > .env << EOF
NODE_ENV=production
PORT=3000
DATABASE_TYPE=sqlite
DATABASE_PATH=/home/pi/photobooth/data/photobooth.db
JWT_SECRET=$(openssl rand -base64 32)
GPIO_ENABLED=true
CAMERA_TYPE=gphoto2
EOF

# Verzeichnisse erstellen
mkdir -p data/{images,thumbs,temp,backups}
mkdir -p logs
```

### 6. Nginx Konfiguration

```bash
# Nginx Config
sudo tee /etc/nginx/sites-available/photobooth > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    root /home/pi/photobooth/dist/frontend;
    index index.html;
    
    client_max_body_size 100M;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
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
    
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    location /images {
        alias /home/pi/photobooth/data/images;
        expires 30d;
    }
    
    location /thumbs {
        alias /home/pi/photobooth/data/thumbs;
        expires 30d;
    }
}
EOF

# Aktivieren und starten
sudo ln -sf /etc/nginx/sites-available/photobooth /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 7. PM2 Process Configuration

```bash
# PM2 Ecosystem File
cat > /home/pi/photobooth/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'photobooth',
    script: './dist/backend/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/app.log',
    time: true
  }]
};
EOF

# Starten
pm2 start ecosystem.config.js
pm2 save
```

---

## Konfiguration

### 1. Basis-Konfiguration

```bash
# Edit .env file
nano /home/pi/photobooth/.env
```

```env
# Application
NODE_ENV=production
PORT=3000
BASE_URL=http://photobooth.local

# Database
DATABASE_TYPE=sqlite
DATABASE_PATH=/home/pi/photobooth/data/photobooth.db

# Security
JWT_SECRET=your-secret-key-here
ADMIN_PIN=1234

# Hardware
GPIO_ENABLED=true
GPIO_BUTTON_CAPTURE=17
GPIO_BUTTON_PRINT=27
GPIO_BUTTON_GALLERY=22
GPIO_BUTTON_CANCEL=23
GPIO_LED_STATUS=24
GPIO_BUZZER=25

# Camera
CAMERA_TYPE=gphoto2  # oder 'webcam'
CAMERA_DEVICE=/dev/video0  # für Webcam

# Print
PRINT_ENABLED=true
PRINT_COMMAND=lp -d Canon_SELPHY

# Features
GALLERY_ENABLED=true
GALLERY_LIMIT=100
COLLAGE_ENABLED=true
CHROMAKEY_ENABLED=false

# Performance
THUMBNAIL_SIZE=400
IMAGE_QUALITY=90
CACHE_ENABLED=true
```

### 2. Admin-Zugang

Standard-Zugang zum Admin-Panel:
- URL: `http://photobooth.local/admin`
- PIN: `1234` (ändern in .env)

---

## Kamera Setup

### USB Webcam

```bash
# Webcams auflisten
v4l2-ctl --list-devices

# Test
fswebcam -r 1920x1080 --jpeg 95 test.jpg

# In .env setzen
CAMERA_TYPE=webcam
CAMERA_DEVICE=/dev/video0
```

### DSLR (Canon/Nikon)

```bash
# gphoto2 installieren
sudo apt-get install -y gphoto2

# Kamera erkennen
gphoto2 --auto-detect

# Test-Aufnahme
gphoto2 --capture-image-and-download --filename test.jpg

# In .env setzen
CAMERA_TYPE=gphoto2
```

### Raspberry Pi Camera Module

```bash
# Legacy Camera aktivieren
sudo raspi-config nonint do_legacy 0

# Test
raspistill -o test.jpg

# In .env setzen
CAMERA_TYPE=picamera
```

---

## Drucker Setup

### Canon SELPHY

```bash
# CUPS installieren
sudo apt-get install -y cups cups-client

# User zur lpadmin Gruppe
sudo usermod -a -G lpadmin pi

# CUPS Web Interface
# Browser: http://photobooth.local:631

# Drucker hinzufügen via Web Interface
# Dann in .env:
PRINT_ENABLED=true
PRINT_COMMAND=lp -d Canon_SELPHY_CP1300
```

### DNP Drucker

```bash
# DNP Driver installieren
wget https://dnpphoto.com/downloads/driver.deb
sudo dpkg -i driver.deb

# Konfiguration über CUPS
```

---

## Performance Optimierung

### 1. Overclocking (Optional)

```bash
# /boot/config.txt editieren
sudo nano /boot/config.txt

# Für Pi 4:
over_voltage=6
arm_freq=2000
gpu_freq=750

# Für Pi 5:
over_voltage=4
arm_freq=2400
gpu_freq=800
```

### 2. Swap erhöhen

```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### 3. Unnötige Services deaktivieren

```bash
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
sudo systemctl disable triggerhappy
sudo systemctl disable ModemManager
```

### 4. Boot-Zeit optimieren

```bash
# /boot/cmdline.txt editieren
sudo nano /boot/cmdline.txt
# Am Ende hinzufügen: quiet splash

# Boot-Splash deaktivieren
sudo systemctl disable plymouth
```

---

## Kiosk Mode Setup

### Automatischer Browser-Start

```bash
# Chromium installieren
sudo apt-get install -y chromium-browser xserver-xorg xinit openbox

# Openbox Autostart
mkdir -p /home/pi/.config/openbox
cat > /home/pi/.config/openbox/autostart << 'EOF'
#!/bin/bash
# Bildschirmschoner deaktivieren
xset -dpms
xset s off
xset s noblank

# Chromium im Kiosk Mode starten
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --check-for-update-interval=604800 \
  http://localhost &
EOF

chmod +x /home/pi/.config/openbox/autostart

# Auto-Login aktivieren
sudo raspi-config nonint do_boot_behaviour B4
```

---

## Troubleshooting

### Problem: Kamera wird nicht erkannt

```bash
# USB Reset
sudo modprobe -r uvcvideo
sudo modprobe uvcvideo

# gphoto2 Reset
pkill -f gphoto2
gphoto2 --reset

# Permissions prüfen
ls -la /dev/video*
groups pi
```

### Problem: GPIO funktioniert nicht

```bash
# GPIO Status prüfen
gpio readall

# Permissions prüfen
ls -la /dev/gpiomem
ls -la /sys/class/gpio/

# Test-Script
cat > test_gpio.py << 'EOF'
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(17, GPIO.IN, pull_up_down=GPIO.PUD_UP)

try:
    while True:
        if GPIO.input(17) == GPIO.LOW:
            print("Button pressed!")
        time.sleep(0.1)
except KeyboardInterrupt:
    GPIO.cleanup()
EOF

python3 test_gpio.py
```

### Problem: Langsame Performance

```bash
# CPU Temperatur prüfen
vcgencmd measure_temp

# CPU Frequenz prüfen
vcgencmd measure_clock arm

# Prozesse prüfen
htop

# Logs prüfen
pm2 logs
sudo journalctl -u nginx -f
```

### Problem: Netzwerk-Probleme

```bash
# WiFi Power Management deaktivieren
sudo iwconfig wlan0 power off

# DNS prüfen
nslookup google.com
ping -c 4 8.8.8.8

# Firewall prüfen
sudo iptables -L
```

---

## Backup & Wartung

### Automatisches Backup

```bash
# Backup Script
cat > /home/pi/photobooth/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/pi/photobooth/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database Backup
sqlite3 /home/pi/photobooth/data/photobooth.db ".backup $BACKUP_DIR/db_$DATE.db"

# Images Backup (nur neue)
rsync -av --ignore-existing /home/pi/photobooth/data/images/ $BACKUP_DIR/images/

# Settings Backup
cp /home/pi/photobooth/.env $BACKUP_DIR/env_$DATE

# Alte Backups löschen (älter als 30 Tage)
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /home/pi/photobooth/backup.sh

# Crontab einrichten
(crontab -l 2>/dev/null; echo "0 3 * * * /home/pi/photobooth/backup.sh") | crontab -
```

### Logs Rotation

```bash
# Logrotate Config
sudo tee /etc/logrotate.d/photobooth > /dev/null << 'EOF'
/home/pi/photobooth/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 pi pi
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### System-Monitoring

```bash
# Monitoring Script
cat > /home/pi/monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Status ==="
echo "CPU Temp: $(vcgencmd measure_temp)"
echo "CPU Freq: $(vcgencmd measure_clock arm)"
echo "Memory: $(free -h | grep Mem)"
echo "Disk: $(df -h | grep root)"
echo "Uptime: $(uptime)"
echo ""
echo "=== Service Status ==="
pm2 status
echo ""
echo "=== Recent Logs ==="
pm2 logs --lines 10 --nostream
EOF

chmod +x /home/pi/monitor.sh
```

### Update-Prozedur

```bash
# Photobooth Update Script
cat > /home/pi/photobooth/update.sh << 'EOF'
#!/bin/bash
cd /home/pi/photobooth

# Backup erstellen
./backup.sh

# Code aktualisieren
git pull

# Dependencies aktualisieren
npm install

# Neu bauen
npm run build

# Services neustarten
pm2 restart photobooth
sudo systemctl restart nginx

echo "Update complete!"
EOF

chmod +x /home/pi/photobooth/update.sh
```

---

## Zusätzliche Features

### Remote Access

```bash
# VNC Server installieren
sudo apt-get install -y realvnc-vnc-server
sudo systemctl enable vncserver-x11-serviced
sudo systemctl start vncserver-x11-serviced
```

### Watchdog

```bash
# Hardware Watchdog aktivieren
sudo nano /boot/config.txt
# Hinzufügen: dtparam=watchdog=on

# Watchdog installieren
sudo apt-get install -y watchdog
sudo systemctl enable watchdog
```

### LED Status Indikator

```python
# LED Control Script
cat > /home/pi/led_status.py << 'EOF'
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(24, GPIO.OUT)

def blink(times=3):
    for _ in range(times):
        GPIO.output(24, GPIO.HIGH)
        time.sleep(0.2)
        GPIO.output(24, GPIO.LOW)
        time.sleep(0.2)

# Ready Signal
blink(3)
GPIO.cleanup()
EOF
```

---

## Finale Checkliste

- [ ] System ist upgedatet
- [ ] Node.js 20+ installiert
- [ ] Photobooth läuft unter PM2
- [ ] Nginx ist konfiguriert
- [ ] GPIO Buttons funktionieren
- [ ] Kamera ist verbunden und funktioniert
- [ ] Drucker ist eingerichtet (optional)
- [ ] Admin-PIN wurde geändert
- [ ] Backup ist eingerichtet
- [ ] Monitoring funktioniert
- [ ] Kiosk Mode ist aktiviert (optional)

---

## Support & Hilfe

### Logs prüfen
```bash
# Application Logs
pm2 logs photobooth

# System Logs
sudo journalctl -xe

# Nginx Logs
sudo tail -f /var/log/nginx/error.log
```

### Debug Mode
```bash
# Temporär im Debug Mode starten
NODE_ENV=development pm2 restart photobooth
```

### Community Support
- GitHub Issues: https://github.com/your-repo/photobooth-ng/issues
- Discord: [Link]
- Forum: [Link]

---

## Viel Erfolg mit deiner Photobooth! 📸

Bei Problemen oder Fragen, schaue zuerst im Troubleshooting-Bereich oder öffne ein Issue auf GitHub.