# gphoto2 Installation Guide

## Übersicht
gphoto2 ist eine Kommandozeilen-Software zur Steuerung von über 2500 Digitalkamera-Modellen. Diese Anleitung zeigt verschiedene Installationsmethoden für verschiedene Plattformen.

## Installation nach Plattform

### macOS (Homebrew)
```bash
# Installation via Homebrew
brew install gphoto2 libgphoto2

# Verifizieren
gphoto2 --version
gphoto2 --auto-detect
```

### Linux (Debian/Ubuntu)
```bash
# Installation via APT
sudo apt-get update
sudo apt-get install gphoto2 libgphoto2-dev libgphoto2-port12

# Verifizieren
gphoto2 --version
gphoto2 --list-cameras | wc -l  # Zeigt Anzahl unterstützter Kameras
```

### Linux (Fedora/RHEL)
```bash
# Installation via DNF/YUM
sudo dnf install gphoto2 libgphoto2 libgphoto2-devel

# Verifizieren
gphoto2 --version
```

### Raspberry Pi OS
```bash
# Installation
sudo apt-get update
sudo apt-get install gphoto2 libgphoto2-dev

# USB Permissions für pi user
sudo usermod -a -G plugdev pi
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Windows
```powershell
# Via WSL2 (empfohlen)
wsl --install
# Dann in WSL2:
sudo apt-get update
sudo apt-get install gphoto2

# Native Windows (experimentell)
# DigiCamControl als Alternative: https://digicamcontrol.com/
```

## Docker Container Optionen

### Option 1: Basis-Container mit gphoto2

```dockerfile
# Dockerfile.gphoto2
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    gphoto2 \
    libgphoto2-dev \
    libgphoto2-port12 \
    usbutils \
    && rm -rf /var/lib/apt/lists/*

# USB Device Permissions
RUN adduser --disabled-password --gecos '' photographer
RUN usermod -a -G plugdev photographer

USER photographer
WORKDIR /app

CMD ["gphoto2", "--help"]
```

### Option 2: Alpine-basierter Container (kleiner)

```dockerfile
# Dockerfile.gphoto2-alpine
FROM alpine:latest

RUN apk add --no-cache \
    gphoto2 \
    libgphoto2 \
    usbutils

WORKDIR /app

CMD ["gphoto2", "--help"]
```

### Option 3: Node.js + gphoto2 Container

```dockerfile
# Dockerfile.node-gphoto2
FROM node:20-bullseye

# Install gphoto2 and dependencies
RUN apt-get update && apt-get install -y \
    gphoto2 \
    libgphoto2-dev \
    libgphoto2-port12 \
    build-essential \
    usbutils \
    udev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy application
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# USB permissions
RUN usermod -a -G plugdev node

USER node

CMD ["node", "server.js"]
```

## Docker Container starten mit USB-Zugriff

### Linux Host
```bash
# Container mit USB Device Access starten
docker run -it --rm \
    --privileged \
    --device=/dev/bus/usb:/dev/bus/usb \
    -v /dev:/dev \
    gphoto2-container \
    gphoto2 --auto-detect

# Oder spezifisches USB Device
docker run -it --rm \
    --device=/dev/bus/usb/001/004 \
    gphoto2-container \
    gphoto2 --auto-detect
```

### macOS Host (Einschränkungen!)
```bash
# WICHTIG: macOS erlaubt keinen direkten USB-Passthrough zu Docker!
# Alternativen:
# 1. VirtualBox VM mit USB-Support
# 2. Native Installation via Homebrew (empfohlen)
# 3. Remote-Verbindung zu Linux-Host
```

### Windows Host (via WSL2)
```powershell
# USB-Passthrough zu WSL2 mit usbipd-win
# Installation: https://github.com/dorssel/usbipd-win

# Liste USB Devices
usbipd wsl list

# Bind device to WSL
usbipd wsl attach --busid 1-2

# In WSL2:
docker run -it --rm \
    --privileged \
    --device=/dev/bus/usb:/dev/bus/usb \
    gphoto2-container
```

## Docker Compose Beispiel

```yaml
# docker-compose.gphoto2.yml
version: '3.8'

services:
  photobooth:
    build:
      context: .
      dockerfile: Dockerfile.node-gphoto2
    privileged: true
    devices:
      - /dev/bus/usb:/dev/bus/usb
    volumes:
      - /dev:/dev:ro
      - ./photos:/app/photos
    environment:
      - GPHOTO2_DEBUG=1
    ports:
      - "3000:3000"
    restart: unless-stopped
```

## Probleme mit Docker und USB-Geräten

### Bekannte Einschränkungen

1. **macOS**: Kein direkter USB-Passthrough möglich
   - Lösung: Native Installation oder VM verwenden

2. **Windows**: Komplexer Setup mit usbipd-win
   - Lösung: WSL2 mit usbipd oder native Tools

3. **Permissions**: Container benötigt privileged mode
   - Sicherheitsrisiko in Production

4. **Hot-Plug**: Geräte-Wechsel erfordert Container-Neustart
   - Lösung: udev rules und Volume mounts

5. **Performance**: Overhead durch Virtualisierung
   - Lösung: Native Installation für beste Performance

### Empfohlene Lösungen nach Use-Case

#### Entwicklung (macOS/Windows)
```bash
# Native Installation empfohlen
brew install gphoto2  # macOS
# oder WSL2 für Windows
```

#### Testing/CI
```yaml
# GitHub Actions mit Ubuntu Runner
- name: Install gphoto2
  run: |
    sudo apt-get update
    sudo apt-get install -y gphoto2
```

#### Production (Raspberry Pi/Linux)
```bash
# Native Installation für beste Performance
sudo apt-get install gphoto2 libgphoto2-dev

# Systemd Service für Auto-Start
sudo systemctl enable photobooth
```

## Testen der Installation

### 1. Version prüfen
```bash
gphoto2 --version
```

### 2. Unterstützte Kameras anzeigen
```bash
gphoto2 --list-cameras
```

### 3. Angeschlossene Kamera erkennen
```bash
gphoto2 --auto-detect
```

### 4. Kamera-Zusammenfassung
```bash
gphoto2 --summary
```

### 5. Test-Aufnahme
```bash
# Foto aufnehmen und herunterladen
gphoto2 --capture-image-and-download

# Nur auslösen (Foto bleibt auf Kamera)
gphoto2 --capture-image

# Live-View (wenn unterstützt)
gphoto2 --capture-movie
```

## Troubleshooting

### Problem: "Could not claim the USB device"
```bash
# Lösung 1: Kill blocking processes
sudo killall gvfs-gphoto2-volume-monitor
sudo killall gvfsd-gphoto2

# Lösung 2: Reset USB
gphoto2 --reset

# Lösung 3: Permissions
sudo chmod 666 /dev/bus/usb/*/*
```

### Problem: "No camera detected"
```bash
# USB Geräte prüfen
lsusb

# Kamera-Port explizit angeben
gphoto2 --port usb:001,004 --summary

# Debug-Modus
GPHOTO2_DEBUG=1 gphoto2 --auto-detect
```

### Problem: Docker Container findet keine Kamera
```bash
# Host: USB Devices auflisten
lsusb

# Container mit mehr Rechten starten
docker run -it --rm \
    --privileged \
    -v /dev/bus/usb:/dev/bus/usb \
    -v /sys:/sys:ro \
    --network host \
    gphoto2-container \
    bash

# Im Container testen
lsusb
gphoto2 --auto-detect
```

## Integration in Photobooth-NG

### Environment Variables
```env
# .env
CAMERA_TYPE=gphoto2
GPHOTO2_PORT=auto
GPHOTO2_DEBUG=0
```

### Node.js Service nutzen
```typescript
// Bereits implementiert in:
// backend/src/hardware/services/gphoto2-node.service.ts
// backend/src/hardware/strategies/gphoto2-camera.strategy.ts

import { GPhoto2NodeService } from './hardware/services/gphoto2-node.service';

// Service nutzt native gphoto2 Binary
// Keine Python Dependencies!
```

## Performance-Tipps

1. **Native Installation** ist immer schneller als Docker
2. **USB 3.0** Ports verwenden wenn möglich
3. **Kamera-Settings** optimieren (JPEG statt RAW für Geschwindigkeit)
4. **Connection Pool** für multiple Kameras

## Unterstützte Kamera-Modelle

Vollständige Liste: http://gphoto.org/proj/libgphoto2/support.php

### Top unterstützte Marken:
- **Canon**: Alle EOS DSLRs und PowerShot
- **Nikon**: D-Serie und Z-Serie (teilweise)
- **Sony**: Alpha Serie (a6000, a7, etc.)
- **Fujifilm**: X-Serie (via PTP)
- **Olympus**: OM-D und PEN Serie
- **Panasonic**: Lumix Serie (teilweise)

## Fazit und Empfehlung

### Für Photobooth-NG empfehlen wir:

1. **Entwicklung**: 
   - macOS: `brew install gphoto2`
   - Windows: WSL2 mit apt
   - Linux: Native Package Manager

2. **Testing**: 
   - Docker mit Mocks/Simulatoren
   - CI/CD mit Ubuntu Runners

3. **Production (Raspberry Pi)**:
   - Native Installation via apt
   - Keine Docker-Container für USB-Hardware!

4. **Multi-Platform Support**:
   ```javascript
   // Automatische Erkennung in der App
   if (process.platform === 'darwin') {
     // macOS: Check Homebrew installation
   } else if (process.platform === 'win32') {
     // Windows: Use WSL2 or DigiCamControl
   } else {
     // Linux: Native gphoto2
   }
   ```

---
Letzte Aktualisierung: 08.08.2025