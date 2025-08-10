# Photobooth-NG Hardware Setup Guide

## Table of Contents

1. [Hardware Requirements](#hardware-requirements)
2. [Raspberry Pi Setup](#raspberry-pi-setup)
3. [Camera Setup](#camera-setup)
4. [Printer Configuration](#printer-configuration)
5. [Display & Touchscreen](#display--touchscreen)
6. [GPIO & Physical Controls](#gpio--physical-controls)
7. [Lighting Setup](#lighting-setup)
8. [Network Hardware](#network-hardware)
9. [Power Management](#power-management)
10. [Hardware Testing](#hardware-testing)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance](#maintenance)

## Hardware Requirements

### Minimum Hardware Setup

| Component | Minimum Requirement | Recommended |
|-----------|-------------------|--------------|
| **Computer** | Raspberry Pi 3B+ | Raspberry Pi 4 (4GB RAM) |
| **Camera** | USB Webcam (720p) | DSLR with USB tethering |
| **Display** | 15" Monitor | 21.5" Touchscreen |
| **Storage** | 16GB SD Card | 64GB+ SSD |
| **Network** | WiFi 802.11n | Gigabit Ethernet |
| **Printer** | Any CUPS-compatible | Canon SELPHY or DNP DS-RX1 |
| **Power** | 2.5A Power Supply | 3A+ with UPS |

### Professional Setup

| Component | Professional Choice | Notes |
|-----------|-------------------|--------|
| **Computer** | Intel NUC or Mac Mini | Better performance for high-volume events |
| **Camera** | Canon EOS R5/Nikon Z9 | Professional image quality |
| **Lighting** | 2x Godox SL-60W | Consistent professional lighting |
| **Display** | 27" 4K Touchscreen | Better user experience |
| **Printer** | DNP DS620A | Fast, reliable event printing |
| **Backup** | Secondary Pi/NUC | Failover system |

## Raspberry Pi Setup

### Initial Raspberry Pi Configuration

#### 1. Install Raspberry Pi OS

```bash
# Download Raspberry Pi Imager
# https://www.raspberrypi.org/software/

# Write image to SD card (64-bit recommended)
# Select: Raspberry Pi OS (64-bit) with desktop

# Enable SSH before first boot
touch /boot/ssh

# Configure WiFi (optional)
cat > /boot/wpa_supplicant.conf << EOF
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="YourNetworkSSID"
    psk="YourNetworkPassword"
    key_mgmt=WPA-PSK
}
EOF
```

#### 2. First Boot Configuration

```bash
# SSH into Raspberry Pi
ssh pi@raspberrypi.local
# Default password: raspberry

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Configure with raspi-config
sudo raspi-config

# Settings to configure:
# 1. Change default password
# 2. Set hostname to 'photobooth'
# 3. Enable Camera interface
# 4. Enable I2C (for displays)
# 5. Enable SPI (for some displays)
# 6. Set GPU memory split to 256MB
# 7. Expand filesystem
```

#### 3. Performance Optimization

```bash
# Edit config.txt for better performance
sudo nano /boot/config.txt

# Add these lines:
# Overclock (Pi 4 - use with cooling)
over_voltage=6
arm_freq=2000
gpu_freq=700

# GPU Memory
gpu_mem=256

# Disable unnecessary features
dtoverlay=disable-bt
dtoverlay=disable-wifi  # Only if using Ethernet

# Camera settings
camera_auto_detect=1
display_auto_detect=1

# Save and reboot
sudo reboot
```

#### 4. Install Required Software

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install system dependencies
sudo apt-get install -y \
    git \
    nginx \
    postgresql \
    redis-server \
    cups \
    gphoto2 \
    libgphoto2-dev \
    imagemagick \
    v4l-utils \
    python3-pip \
    python3-gpio

# Install PM2 for process management
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd -u pi --hp /home/pi
```

### Raspberry Pi Camera Module Setup

#### Camera Module v2/v3

```bash
# Enable camera
sudo raspi-config
# Interface Options > Camera > Enable

# Test camera
raspistill -o test.jpg

# Install camera libraries
sudo apt-get install -y python3-picamera2

# Python test script
cat > test_camera.py << 'EOF'
from picamera2 import Picamera2
import time

picam2 = Picamera2()
config = picam2.create_still_configuration()
picam2.configure(config)
picam2.start()
time.sleep(2)
picam2.capture_file("test.jpg")
picam2.stop()
print("Photo saved as test.jpg")
EOF

python3 test_camera.py
```

#### HQ Camera Module

```bash
# HQ Camera requires additional configuration
sudo nano /boot/config.txt

# Add for HQ Camera
dtoverlay=imx477
camera_auto_detect=0

# For manual focus control
sudo apt-get install -y v4l-utils

# Adjust focus
v4l2-ctl --set-ctrl=focus_absolute=200
```

## Camera Setup

### USB Webcam Setup

#### Basic Webcam Configuration

```bash
# List USB devices
lsusb

# List video devices
ls -la /dev/video*

# Test webcam with fswebcam
sudo apt-get install -y fswebcam
fswebcam -r 1920x1080 --jpeg 95 test.jpg

# Check webcam capabilities
v4l2-ctl --list-devices
v4l2-ctl -d /dev/video0 --list-formats-ext

# Set webcam parameters
v4l2-ctl -d /dev/video0 --set-ctrl=brightness=128
v4l2-ctl -d /dev/video0 --set-ctrl=contrast=32
v4l2-ctl -d /dev/video0 --set-ctrl=saturation=64
v4l2-ctl -d /dev/video0 --set-ctrl=gain=0
```

#### Logitech Webcam Specific

```bash
# Install Logitech control software
sudo apt-get install -y uvcdynctrl

# List Logitech controls
uvcdynctrl -c

# Set auto-focus
uvcdynctrl -s "Focus, Auto" 1

# Manual focus
uvcdynctrl -s "Focus, Auto" 0
uvcdynctrl -s "Focus (absolute)" 100
```

### DSLR Camera Setup

#### Canon DSLR Setup

```bash
# Install gphoto2
sudo apt-get install -y gphoto2 libgphoto2-dev

# Check camera detection
gphoto2 --auto-detect

# Camera information
gphoto2 --summary

# List configuration options
gphoto2 --list-config

# Configure camera settings
gphoto2 --set-config imageformat=0  # JPEG
gphoto2 --set-config iso=1          # ISO 100
gphoto2 --set-config shutterspeed=30 # 1/125
gphoto2 --set-config aperture=8     # f/5.6
gphoto2 --set-config whitebalance=1 # Auto

# Test capture
gphoto2 --capture-image-and-download --filename=test.jpg

# Continuous tethering mode
gphoto2 --capture-tethered
```

#### Nikon DSLR Setup

```bash
# Similar to Canon, but with Nikon-specific settings
gphoto2 --set-config d010=0  # Manual mode
gphoto2 --set-config d01a=0  # JPG format
gphoto2 --set-config d054=5  # ISO 400

# Fix common Nikon issues
# If "Could not claim interface"
sudo killall gvfs-gphoto2-volume-monitor
```

#### Sony Mirrorless Setup

```bash
# Sony cameras may need special configuration
# Enable PC Remote in camera menu

# Install Sony-specific support
sudo apt-get install -y libmtp-dev

# Configure for Sony
gphoto2 --set-config capture=on
gphoto2 --set-config movie=off
```

### Multi-Camera Setup

```bash
# List all cameras
gphoto2 --list-cameras

# Use specific camera by port
gphoto2 --port usb:001,005 --capture-image

# Python script for multiple cameras
cat > multi_camera.py << 'EOF'
import subprocess
import json

def get_cameras():
    result = subprocess.run(['gphoto2', '--auto-detect'], 
                          capture_output=True, text=True)
    lines = result.stdout.strip().split('\n')[2:]
    cameras = []
    for line in lines:
        parts = line.rsplit(' ', 1)
        if len(parts) == 2:
            cameras.append({
                'name': parts[0].strip(),
                'port': parts[1].strip()
            })
    return cameras

def capture_from_camera(port, filename):
    subprocess.run([
        'gphoto2',
        '--port', port,
        '--capture-image-and-download',
        '--filename', filename
    ])

# Example usage
cameras = get_cameras()
for i, camera in enumerate(cameras):
    capture_from_camera(camera['port'], f'camera_{i}.jpg')
EOF
```

## Printer Configuration

### CUPS Installation and Setup

```bash
# Install CUPS
sudo apt-get install -y cups cups-client

# Add user to lpadmin group
sudo usermod -a -G lpadmin pi

# Enable remote administration
sudo cupsctl --remote-admin --remote-any --share-printers

# Access CUPS web interface
# http://photobooth.local:631
```

### Canon SELPHY Setup

```bash
# Install Canon drivers
sudo apt-get install -y printer-driver-gutenprint

# Add printer via CUPS
sudo lpadmin -p "Canon_SELPHY" \
    -E \
    -v usb://Canon/SELPHY%20CP1300 \
    -m gutenprint.5.3://canon-cp1300/expert

# Set as default
sudo lpadmin -d Canon_SELPHY

# Test print
echo "Test Page" | lp -d Canon_SELPHY

# Configure print options
lpoptions -p Canon_SELPHY -o PageSize=Postcard
lpoptions -p Canon_SELPHY -o ColorModel=RGB
lpoptions -p Canon_SELPHY -o Resolution=300dpi
```

### DNP Printer Setup

```bash
# Download DNP drivers from manufacturer
# https://dnpphoto.com/en-us/Support/Drivers

# Install driver
sudo dpkg -i dnp-ds620_3.0.0_amd64.deb

# Add printer
sudo lpadmin -p "DNP_DS620" \
    -E \
    -v usb://DNP/DS620 \
    -P /usr/share/ppd/dnp/dnpds620.ppd

# Configure for event printing
lpoptions -p DNP_DS620 -o MediaType=Glossy
lpoptions -p DNP_DS620 -o PrintQuality=High
lpoptions -p DNP_DS620 -o CutterOption=2x6
```

### Network Printer Setup

```bash
# Discover network printers
sudo apt-get install -y avahi-utils
avahi-browse -art | grep -i printer

# Add network printer
sudo lpadmin -p "Network_Printer" \
    -E \
    -v ipp://192.168.1.100:631/printers/printer_name \
    -m everywhere

# For HP printers
sudo apt-get install -y hplip
hp-setup -i  # Interactive setup
```

### Print Queue Management

```bash
# Create print management script
cat > /usr/local/bin/print-manager.sh << 'EOF'
#!/bin/bash

# Monitor print queue
watch_queue() {
    while true; do
        lpstat -o
        sleep 2
    done
}

# Clear stuck jobs
clear_queue() {
    cancel -a
    sudo systemctl restart cups
}

# Print test page
test_print() {
    echo "Photobooth Test Page $(date)" | lp
}

case "$1" in
    watch) watch_queue ;;
    clear) clear_queue ;;
    test) test_print ;;
    *) echo "Usage: $0 {watch|clear|test}" ;;
esac
EOF

chmod +x /usr/local/bin/print-manager.sh
```

## Display & Touchscreen

### HDMI Display Configuration

```bash
# Check display status
tvservice -s

# Force HDMI output
sudo nano /boot/config.txt

# Add these lines:
hdmi_force_hotplug=1
hdmi_group=2  # DMT
hdmi_mode=82  # 1920x1080 @ 60Hz
hdmi_drive=2  # Normal HDMI mode

# For 4K displays
hdmi_enable_4kp60=1

# Rotate display if needed
display_rotate=1  # 90 degrees
# 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°
```

### Touchscreen Setup

#### Official Raspberry Pi Touchscreen

```bash
# No driver needed, but configure if required
sudo nano /boot/config.txt

# Add for touchscreen
lcd_rotate=2  # Flip screen if needed
disable_touchscreen=0

# Calibration
sudo apt-get install -y xinput-calibrator
xinput_calibrator

# Save calibration
sudo mkdir -p /etc/X11/xorg.conf.d
sudo cp /usr/share/X11/xorg.conf.d/99-calibration.conf /etc/X11/xorg.conf.d/
```

#### USB Touchscreen

```bash
# Install touch drivers
sudo apt-get install -y xserver-xorg-input-evdev

# Find touch device
xinput list

# Test touch input
evtest

# Calibrate
xinput_calibrator --device "USB Touchscreen"
```

#### Waveshare Touchscreen

```bash
# Clone Waveshare driver
git clone https://github.com/waveshare/LCD-show.git
cd LCD-show

# Install for specific model (e.g., 7inch)
sudo ./LCD7-show

# For HDMI screens with USB touch
sudo nano /boot/config.txt
# Add:
dtoverlay=ads7846,cs=1,penirq=25,penirq_pull=2,speed=50000,keep_vref_on=0,swapxy=0,pmax=255,xohms=150,xmin=200,xmax=3900,ymin=200,ymax=3900
```

### Kiosk Mode Setup

```bash
# Install minimal X environment
sudo apt-get install -y \
    xorg \
    chromium-browser \
    unclutter

# Create kiosk script
cat > /home/pi/kiosk.sh << 'EOF'
#!/bin/bash

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Hide cursor after 3 seconds
unclutter -idle 3 &

# Start browser in kiosk mode
chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --check-for-update-interval=31536000 \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --disable-translate \
    --disable-features=TranslateUI \
    --disk-cache-dir=/tmp/chromium-cache \
    --disk-cache-size=10485760 \
    --app=http://localhost:4200
EOF

chmod +x /home/pi/kiosk.sh

# Auto-start on boot
mkdir -p /home/pi/.config/autostart
cat > /home/pi/.config/autostart/kiosk.desktop << EOF
[Desktop Entry]
Type=Application
Name=Photobooth Kiosk
Exec=/home/pi/kiosk.sh
X-GNOME-Autostart-enabled=true
EOF
```

## GPIO & Physical Controls

### Button Setup

```python
#!/usr/bin/env python3
# gpio_controller.py

import RPi.GPIO as GPIO
import time
import requests
from datetime import datetime

# GPIO Pin Configuration
CAPTURE_BUTTON = 18  # Physical pin 12
PRINT_BUTTON = 23    # Physical pin 16
LED_READY = 24       # Physical pin 18
LED_BUSY = 25        # Physical pin 22
BUZZER = 8           # Physical pin 24

# API Configuration
API_BASE = "http://localhost:3000/api"

class PhotoboothGPIO:
    def __init__(self):
        # Setup GPIO
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        
        # Setup inputs (buttons)
        GPIO.setup(CAPTURE_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(PRINT_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        
        # Setup outputs (LEDs and buzzer)
        GPIO.setup(LED_READY, GPIO.OUT)
        GPIO.setup(LED_BUSY, GPIO.OUT)
        GPIO.setup(BUZZER, GPIO.OUT)
        
        # Initial state
        GPIO.output(LED_READY, GPIO.HIGH)
        GPIO.output(LED_BUSY, GPIO.LOW)
        GPIO.output(BUZZER, GPIO.LOW)
        
        # Debounce time
        self.last_button_time = 0
        self.debounce_time = 0.5
        
    def capture_photo(self, channel):
        current_time = time.time()
        if current_time - self.last_button_time < self.debounce_time:
            return
        
        self.last_button_time = current_time
        
        print(f"Capture button pressed at {datetime.now()}")
        
        # Visual feedback
        GPIO.output(LED_READY, GPIO.LOW)
        GPIO.output(LED_BUSY, GPIO.HIGH)
        self.beep(0.1)
        
        try:
            # Call API to capture
            response = requests.post(f"{API_BASE}/capture", 
                                    json={"mode": "single"})
            
            if response.status_code == 200:
                print("Photo captured successfully")
                self.beep(0.1, 2)  # Success beep
            else:
                print(f"Capture failed: {response.status_code}")
                self.beep(0.5)  # Error beep
                
        except Exception as e:
            print(f"Error: {e}")
            self.beep(0.5)
            
        finally:
            # Reset LEDs
            GPIO.output(LED_READY, GPIO.HIGH)
            GPIO.output(LED_BUSY, GPIO.LOW)
    
    def print_photo(self, channel):
        current_time = time.time()
        if current_time - self.last_button_time < self.debounce_time:
            return
        
        self.last_button_time = current_time
        
        print(f"Print button pressed at {datetime.now()}")
        
        # Visual feedback
        GPIO.output(LED_BUSY, GPIO.HIGH)
        self.beep(0.1)
        
        try:
            # Call API to print last photo
            response = requests.post(f"{API_BASE}/print/last")
            
            if response.status_code == 200:
                print("Print job queued")
                self.beep(0.1, 3)  # Print queued beep
            else:
                print(f"Print failed: {response.status_code}")
                self.beep(0.5)
                
        except Exception as e:
            print(f"Error: {e}")
            self.beep(0.5)
            
        finally:
            GPIO.output(LED_BUSY, GPIO.LOW)
    
    def beep(self, duration, count=1):
        for _ in range(count):
            GPIO.output(BUZZER, GPIO.HIGH)
            time.sleep(duration)
            GPIO.output(BUZZER, GPIO.LOW)
            if count > 1:
                time.sleep(0.1)
    
    def run(self):
        # Setup event detection
        GPIO.add_event_detect(CAPTURE_BUTTON, GPIO.FALLING, 
                             callback=self.capture_photo, 
                             bouncetime=500)
        GPIO.add_event_detect(PRINT_BUTTON, GPIO.FALLING, 
                             callback=self.print_photo, 
                             bouncetime=500)
        
        print("GPIO Controller running. Press Ctrl+C to exit.")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down...")
        finally:
            self.cleanup()
    
    def cleanup(self):
        GPIO.output(LED_READY, GPIO.LOW)
        GPIO.output(LED_BUSY, GPIO.LOW)
        GPIO.output(BUZZER, GPIO.LOW)
        GPIO.cleanup()

if __name__ == "__main__":
    controller = PhotoboothGPIO()
    controller.run()
```

### LED Strip Control (WS2812B/NeoPixel)

```python
#!/usr/bin/env python3
# led_strip.py

import time
import board
import neopixel

# LED Strip Configuration
LED_COUNT = 60        # Number of LEDs
LED_PIN = board.D18   # GPIO 18
LED_BRIGHTNESS = 0.5  # 0.0 to 1.0

class LEDController:
    def __init__(self):
        self.pixels = neopixel.NeoPixel(
            LED_PIN, 
            LED_COUNT, 
            brightness=LED_BRIGHTNESS,
            auto_write=False
        )
        
    def countdown(self, seconds=3):
        """Countdown animation"""
        colors = [
            (255, 0, 0),    # Red
            (255, 255, 0),  # Yellow
            (0, 255, 0)     # Green
        ]
        
        for i in range(seconds):
            color = colors[min(i, len(colors)-1)]
            self.fill(color)
            time.sleep(1)
            
        # Flash white for capture
        self.flash((255, 255, 255), 0.5)
        
    def fill(self, color):
        """Fill all LEDs with color"""
        self.pixels.fill(color)
        self.pixels.show()
        
    def flash(self, color, duration):
        """Flash effect"""
        self.fill(color)
        time.sleep(duration)
        self.fill((0, 0, 0))
        
    def rainbow(self):
        """Rainbow effect"""
        for j in range(255):
            for i in range(LED_COUNT):
                pixel_index = (i * 256 // LED_COUNT) + j
                self.pixels[i] = self.wheel(pixel_index & 255)
            self.pixels.show()
            time.sleep(0.01)
            
    def wheel(self, pos):
        """Generate rainbow colors"""
        if pos < 85:
            return (pos * 3, 255 - pos * 3, 0)
        elif pos < 170:
            pos -= 85
            return (255 - pos * 3, 0, pos * 3)
        else:
            pos -= 170
            return (0, pos * 3, 255 - pos * 3)
            
    def cleanup(self):
        self.fill((0, 0, 0))

# Install required library:
# sudo pip3 install adafruit-circuitpython-neopixel
```

### Motion Sensor Integration

```python
#!/usr/bin/env python3
# motion_sensor.py

import RPi.GPIO as GPIO
import time
import requests

PIR_SENSOR = 17  # GPIO 17

class MotionDetector:
    def __init__(self):
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(PIR_SENSOR, GPIO.IN)
        self.last_motion = 0
        self.cooldown = 30  # Seconds between triggers
        
    def motion_detected(self, channel):
        current_time = time.time()
        if current_time - self.last_motion < self.cooldown:
            return
            
        self.last_motion = current_time
        print("Motion detected! Starting attract mode...")
        
        # Trigger attract mode via API
        try:
            requests.post("http://localhost:3000/api/attract-mode")
        except Exception as e:
            print(f"Error triggering attract mode: {e}")
            
    def run(self):
        GPIO.add_event_detect(PIR_SENSOR, GPIO.RISING, 
                             callback=self.motion_detected)
        
        print("Motion detector active")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            GPIO.cleanup()
```

## Lighting Setup

### Basic Lighting Configuration

```python
#!/usr/bin/env python3
# lighting_control.py

import RPi.GPIO as GPIO
import time

# Relay control for studio lights
LIGHT_RELAY_1 = 5   # Main light
LIGHT_RELAY_2 = 6   # Fill light
LIGHT_RELAY_3 = 13  # Background light

class LightingController:
    def __init__(self):
        GPIO.setmode(GPIO.BCM)
        self.lights = [LIGHT_RELAY_1, LIGHT_RELAY_2, LIGHT_RELAY_3]
        
        for pin in self.lights:
            GPIO.setup(pin, GPIO.OUT)
            GPIO.output(pin, GPIO.LOW)  # Lights off initially
            
    def all_on(self):
        """Turn all lights on"""
        for pin in self.lights:
            GPIO.output(pin, GPIO.HIGH)
            
    def all_off(self):
        """Turn all lights off"""
        for pin in self.lights:
            GPIO.output(pin, GPIO.LOW)
            
    def portrait_mode(self):
        """Lighting for portraits"""
        GPIO.output(LIGHT_RELAY_1, GPIO.HIGH)  # Main
        GPIO.output(LIGHT_RELAY_2, GPIO.HIGH)  # Fill
        GPIO.output(LIGHT_RELAY_3, GPIO.LOW)   # Background off
        
    def party_mode(self):
        """Fun party lighting"""
        while True:
            for pin in self.lights:
                GPIO.output(pin, GPIO.HIGH)
                time.sleep(0.2)
                GPIO.output(pin, GPIO.LOW)
                
    def cleanup(self):
        self.all_off()
        GPIO.cleanup()
```

### DMX Lighting Control

```bash
# Install OLA (Open Lighting Architecture)
sudo apt-get install -y ola

# Configure OLA
ola_dev_info
ola_patch -d 1 -p 0 -u 0

# Python DMX control
pip3 install pyola
```

```python
#!/usr/bin/env python3
# dmx_control.py

from ola.ClientWrapper import ClientWrapper
import array

class DMXController:
    def __init__(self):
        self.wrapper = ClientWrapper()
        self.client = self.wrapper.Client()
        self.universe = 1
        self.dmx_data = array.array('B', [0] * 512)
        
    def set_channel(self, channel, value):
        """Set DMX channel value (1-512, 0-255)"""
        if 1 <= channel <= 512:
            self.dmx_data[channel - 1] = min(255, max(0, value))
            
    def send(self):
        """Send DMX data"""
        self.client.SendDmx(self.universe, self.dmx_data)
        
    def set_rgb_light(self, fixture_start, r, g, b):
        """Set RGB fixture (3 channel mode)"""
        self.set_channel(fixture_start, r)
        self.set_channel(fixture_start + 1, g)
        self.set_channel(fixture_start + 2, b)
        self.send()
        
    def strobe(self, speed=10):
        """Strobe effect"""
        import time
        delay = 1.0 / speed
        while True:
            self.dmx_data = array.array('B', [255] * 512)
            self.send()
            time.sleep(delay)
            self.dmx_data = array.array('B', [0] * 512)
            self.send()
            time.sleep(delay)
```

## Network Hardware

### Ethernet Configuration

```bash
# Static IP configuration
sudo nano /etc/dhcpcd.conf

# Add at the end:
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# Restart networking
sudo systemctl restart dhcpcd
```

### WiFi Access Point Setup

```bash
# Install hostapd and dnsmasq
sudo apt-get install -y hostapd dnsmasq

# Configure hostapd
sudo nano /etc/hostapd/hostapd.conf

# Add configuration:
interface=wlan0
driver=nl80211
ssid=PhotoboothWiFi
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=YourSecurePassword
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP

# Configure dnsmasq
sudo nano /etc/dnsmasq.conf

# Add:
interface=wlan0
dhcp-range=192.168.4.2,192.168.4.100,255.255.255.0,24h
domain=photobooth.local
address=/photobooth.local/192.168.4.1

# Enable services
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq
```

### 4G/LTE Modem Setup

```bash
# Install ModemManager
sudo apt-get install -y modemmanager network-manager

# Check modem
mmcli -L

# Connect to mobile network
nmcli connection add type gsm ifname "*" con-name "4G" apn "your.apn.com"
nmcli connection up "4G"

# Monitor connection
nmcli connection show "4G"
```

## Power Management

### UPS Integration

```bash
# Install NUT (Network UPS Tools)
sudo apt-get install -y nut nut-client nut-server

# Configure UPS
sudo nano /etc/nut/ups.conf

# Add your UPS:
[apc]
    driver = usbhid-ups
    port = auto
    desc = "APC Back-UPS"

# Start NUT
sudo systemctl start nut-server
sudo systemctl enable nut-server

# Monitor UPS
upsc apc
```

### Power Monitoring Script

```python
#!/usr/bin/env python3
# power_monitor.py

import subprocess
import time
import requests

class PowerMonitor:
    def __init__(self):
        self.on_battery = False
        self.low_battery_threshold = 20
        
    def check_ups_status(self):
        try:
            result = subprocess.run(['upsc', 'apc'], 
                                  capture_output=True, 
                                  text=True)
            
            for line in result.stdout.split('\n'):
                if 'battery.charge:' in line:
                    charge = int(line.split(':')[1].strip())
                    
                if 'ups.status:' in line:
                    status = line.split(':')[1].strip()
                    
            return charge, status
            
        except Exception as e:
            print(f"Error checking UPS: {e}")
            return 100, "OL"  # Default to online
            
    def monitor(self):
        while True:
            charge, status = self.check_ups_status()
            
            if "OB" in status and not self.on_battery:
                # Switched to battery
                self.on_battery = True
                self.notify("Running on battery power")
                
            elif "OL" in status and self.on_battery:
                # Back on line power
                self.on_battery = False
                self.notify("AC power restored")
                
            if charge < self.low_battery_threshold:
                self.notify(f"Low battery: {charge}%")
                self.initiate_shutdown()
                
            time.sleep(10)
            
    def notify(self, message):
        print(f"POWER: {message}")
        try:
            requests.post("http://localhost:3000/api/notify", 
                         json={"message": message, "type": "power"})
        except:
            pass
            
    def initiate_shutdown(self):
        print("Initiating safe shutdown...")
        subprocess.run(['sudo', 'shutdown', '-h', '+1', 
                       'Low battery - shutting down in 1 minute'])

if __name__ == "__main__":
    monitor = PowerMonitor()
    monitor.monitor()
```

### Auto-Start Configuration

```bash
# Create systemd service for photobooth
sudo nano /etc/systemd/system/photobooth.service

[Unit]
Description=Photobooth Application
After=network.target postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/photobooth-ng
ExecStart=/usr/bin/npm run start:prod
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable photobooth
sudo systemctl start photobooth
```

## Hardware Testing

### Comprehensive Hardware Test Script

```bash
#!/bin/bash
# hardware_test.sh

echo "=== Photobooth Hardware Test ==="
echo

# Test Camera
echo "Testing Camera..."
if command -v raspistill &> /dev/null; then
    raspistill -o /tmp/test_camera.jpg -t 1000
    if [ -f /tmp/test_camera.jpg ]; then
        echo "✓ Camera test passed"
    else
        echo "✗ Camera test failed"
    fi
elif command -v gphoto2 &> /dev/null; then
    gphoto2 --capture-image-and-download --filename=/tmp/test_dslr.jpg
    if [ -f /tmp/test_dslr.jpg ]; then
        echo "✓ DSLR test passed"
    else
        echo "✗ DSLR test failed"
    fi
else
    echo "✗ No camera software found"
fi
echo

# Test Printer
echo "Testing Printer..."
lpstat -p -d
if [ $? -eq 0 ]; then
    echo "✓ Printer detected"
    echo "Test print? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        echo "Test Page" | lp
    fi
else
    echo "✗ No printer found"
fi
echo

# Test Display
echo "Testing Display..."
tvservice -s
if [ $? -eq 0 ]; then
    echo "✓ Display connected"
else
    echo "✗ Display issue detected"
fi
echo

# Test Network
echo "Testing Network..."
ping -c 1 google.com &> /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Internet connection OK"
else
    echo "✗ No internet connection"
fi
echo

# Test GPIO
echo "Testing GPIO..."
if [ -e /sys/class/gpio ]; then
    echo "✓ GPIO available"
    python3 -c "import RPi.GPIO as GPIO; print('✓ GPIO Python module OK')" 2>/dev/null || echo "✗ GPIO Python module missing"
else
    echo "✗ GPIO not available"
fi
echo

# Test Storage
echo "Testing Storage..."
df -h /
available=$(df / | awk 'NR==2 {print $4}')
echo "Available storage: $available"
echo

# Test Services
echo "Testing Services..."
services=("postgresql" "redis-server" "cups" "nginx")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "✓ $service is running"
    else
        echo "✗ $service is not running"
    fi
done

echo
echo "=== Hardware Test Complete ==="
```

## Troubleshooting

### Camera Issues

```bash
# Camera not detected
# Check USB connections
lsusb
dmesg | grep -i camera

# Reset USB subsystem
sudo modprobe -r uvcvideo
sudo modprobe uvcvideo

# For DSLR issues
killall gvfs-gphoto2-volume-monitor
gphoto2 --reset

# Permission issues
sudo usermod -a -G video pi
```

### Printer Issues

```bash
# Printer not printing
# Check CUPS status
systemctl status cups
lpstat -t

# Clear print queue
cancel -a

# Restart CUPS
sudo systemctl restart cups

# USB printer not detected
ls -la /dev/usb/lp*
sudo chmod 666 /dev/usb/lp0
```

### Display Issues

```bash
# No display output
# Force HDMI
tvservice -p
fbset -depth 8; fbset -depth 16

# Wrong resolution
xrandr --output HDMI-1 --mode 1920x1080

# Touchscreen not working
ls -la /dev/input/event*
evtest  # Test touch input
```

### GPIO Issues

```bash
# GPIO not working
# Check permissions
ls -la /dev/gpiomem
sudo chmod 666 /dev/gpiomem

# Test GPIO
gpio readall

# Reset GPIO
echo "4" > /sys/class/gpio/unexport
```

## Maintenance

### Regular Maintenance Tasks

```bash
#!/bin/bash
# maintenance.sh

echo "Running maintenance tasks..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Clean package cache
sudo apt-get clean
sudo apt-get autoremove -y

# Clear logs
sudo journalctl --vacuum-time=7d

# Check disk health
sudo fsck -n /dev/mmcblk0p2

# Test hardware
/usr/local/bin/hardware_test.sh

# Backup configuration
tar -czf /backup/config-$(date +%Y%m%d).tar.gz /home/pi/photobooth-ng/config

echo "Maintenance complete!"
```

### Hardware Replacement Guide

#### Replacing Raspberry Pi
1. Backup SD card: `sudo dd if=/dev/mmcblk0 of=backup.img bs=4M`
2. Write backup to new SD card
3. Update hostname if needed
4. Test all peripherals

#### Replacing Camera
1. Identify new camera: `gphoto2 --auto-detect`
2. Update configuration files
3. Test capture functionality
4. Calibrate if necessary

#### Replacing Printer
1. Remove old printer: `lpadmin -x old_printer`
2. Add new printer via CUPS
3. Configure print settings
4. Test print quality

### Calibration Procedures

```bash
# Camera white balance calibration
gphoto2 --set-config whitebalance=9  # Custom
# Take photo of white card
# Adjust based on results

# Touchscreen calibration
xinput_calibrator --output-type xinput

# Monitor color calibration
# Use displaycal or similar tool
displaycal
```

---
Version 1.0.0 | Last Updated: 10.08.2025