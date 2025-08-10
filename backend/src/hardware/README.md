# Hardware Module

Das Hardware Module bietet eine Abstraktionsschicht für die Hardware-Integration der Photobooth-Anwendung. Es unterstützt GPIO-Steuerung (Buttons/LEDs) und verschiedene Kamera-Backends.

## Architektur

### Services

#### GpioService
- **Mock Service**: Simuliert GPIO für Entwicklung (automatisch auf macOS/Windows)
- **Real Service**: Nutzt `onoff` Package für echte GPIO-Steuerung auf Raspberry Pi
- **Features**:
  - Button-Registrierung mit Debouncing
  - LED-Steuerung (An/Aus/Blinken)
  - Event-basierte Architektur

#### CameraService
- **Strategy Pattern** für verschiedene Kamera-Backends:
  - **MockCameraStrategy**: Simulierte Kamera für Entwicklung
  - **WebcamCameraStrategy**: USB-Webcam Support via FFmpeg
  - **GPhoto2CameraStrategy**: DSLR-Kameras via gphoto2
- **Features**:
  - Foto-Aufnahme mit Countdown
  - Video-Aufnahme (Webcam/Mock)
  - Live-View Stream
  - Einstellungs-Management

### Event System

Das Modul nutzt NestJS EventEmitter für die Kommunikation:

#### GPIO Events
- `gpio.button.pressed`: Button wurde gedrückt
- `gpio.button.released`: Button wurde losgelassen  
- `gpio.led.changed`: LED-Status geändert

#### Camera Events
- `camera.capture.started`: Aufnahme gestartet
- `camera.capture.completed`: Aufnahme abgeschlossen
- `camera.capture.failed`: Aufnahme fehlgeschlagen
- `camera.video.started`: Video-Aufnahme gestartet
- `camera.video.stopped`: Video-Aufnahme beendet
- `camera.settings.changed`: Kamera-Einstellungen geändert
- `camera.connection.lost`: Verbindung verloren
- `camera.connection.restored`: Verbindung wiederhergestellt

## Konfiguration

### Environment Variables

Siehe `.env.example` für alle verfügbaren Optionen.

#### Wichtige Einstellungen:

```env
# GPIO Mock für Entwicklung
GPIO_MOCK=true

# Kamera-Strategie
CAMERA_STRATEGY=mock  # mock, webcam, gphoto2

# Button-Pins (BCM-Nummerierung)
GPIO_BUTTON_CAPTURE_PIN=17
GPIO_BUTTON_PRINT_PIN=22
GPIO_BUTTON_GALLERY_PIN=23
GPIO_BUTTON_DELETE_PIN=24
GPIO_BUTTON_MODE_PIN=25

# LED-Pins
GPIO_LED_STATUS_PIN=27
GPIO_LED_FLASH_PIN=4
GPIO_LED_SUCCESS_PIN=5
GPIO_LED_ERROR_PIN=6
```

## Button-Funktionen

### Standard-Buttons

| Button | Kurz drücken | Lang drücken (2s) |
|--------|-------------|------------------|
| Capture | Foto aufnehmen | Video starten/stoppen |
| Print | Drucken | - |
| Gallery | Galerie öffnen | - |
| Delete | Letztes Bild löschen | Alle löschen |
| Mode | Kamera-Modus wechseln | Einstellungen zurücksetzen |

### Custom Button Actions

```typescript
// In einem Service oder Controller
constructor(
  private buttonEventListener: ButtonEventListener
) {}

// Eigene Aktion registrieren
this.buttonEventListener.registerButtonAction('capture', async () => {
  console.log('Custom capture action');
  // Ihre Logik hier
});
```

## API Endpoints

### Hardware Status
```
GET /api/hardware/status
```

### Foto aufnehmen
```
POST /api/hardware/camera/capture
Body: {
  countdown: 3,
  sound: true,
  flash: true,
  saveToGallery: true,
  settings: {
    iso: 200,
    aperture: "f/5.6"
  }
}
```

### Mehrere Fotos
```
POST /api/hardware/camera/capture-multiple
Body: {
  count: 4,
  interval: 2000,
  options: { ... }
}
```

### Video-Aufnahme
```
POST /api/hardware/camera/video/start
POST /api/hardware/camera/video/stop
```

### Kamera-Einstellungen
```
GET /api/hardware/camera/settings
POST /api/hardware/camera/settings
```

### GPIO-Steuerung
```
POST /api/hardware/gpio/led/{name}/set
POST /api/hardware/gpio/led/{name}/toggle
POST /api/hardware/gpio/led/{name}/blink
GET /api/hardware/gpio/button/{name}
```

## Plattform-Support

### Raspberry Pi (Production)
- Volle GPIO-Unterstützung
- Alle Kamera-Strategien verfügbar
- Hardware-Buttons und LEDs

### Linux/Ubuntu
- Keine GPIO (nur Mock)
- Webcam und gphoto2 Support
- Entwicklung mit Docker empfohlen

### macOS (Development)
- GPIO Mock Service automatisch
- Mock Camera für Entwicklung
- Webcam teilweise (via FFmpeg)

### Windows
- GPIO Mock Service
- Webcam via DirectShow
- WSL2 für Linux-Features empfohlen

## Abhängigkeiten

### Required
- Node.js 18+
- NestJS 10+

### Optional (je nach Features)
- `onoff`: GPIO auf Raspberry Pi
- `ffmpeg`: Webcam-Support
- `gphoto2`: DSLR-Support
- `imagemagick`: Thumbnail-Generierung

## Installation

### Raspberry Pi
```bash
# GPIO Support
npm install onoff

# Kamera-Tools
sudo apt-get install gphoto2 ffmpeg imagemagick

# Berechtigungen für GPIO
sudo usermod -a -G gpio $USER
```

### macOS/Windows (Development)
```bash
# FFmpeg für Webcam (optional)
# macOS: brew install ffmpeg
# Windows: Download von ffmpeg.org

# Keine weiteren Abhängigkeiten nötig
# Mock-Services werden automatisch verwendet
```

## Testing

```bash
# Unit Tests
npm run test:unit hardware

# Integration Tests  
npm run test:e2e hardware

# Hardware-Verbindung testen
curl -X POST http://localhost:3000/api/hardware/test-connection
```

## Troubleshooting

### GPIO nicht verfügbar
- Prüfen Sie, ob auf Raspberry Pi
- Prüfen Sie Benutzer-Berechtigungen (`groups` sollte `gpio` enthalten)
- Setzen Sie `GPIO_MOCK=true` für Entwicklung

### Kamera nicht erkannt
- gphoto2: `gphoto2 --auto-detect`
- Webcam Linux: `ls /dev/video*`
- Webcam macOS: `ffmpeg -f avfoundation -list_devices true -i ""`
- Wechseln Sie zu Mock-Strategy: `CAMERA_STRATEGY=mock`

### Events werden nicht empfangen
- Prüfen Sie EventEmitterModule Import
- Verwenden Sie korrekte Event-Namen (siehe oben)
- Prüfen Sie Listener-Registrierung

## Entwicklung

### Neue Kamera-Strategy hinzufügen

1. Interface implementieren:
```typescript
export class MyCustomStrategy implements ICameraStrategy {
  // Implementierung
}
```

2. In CameraService registrieren:
```typescript
private createStrategy(type: string): ICameraStrategy {
  switch(type) {
    case 'custom':
      return new MyCustomStrategy();
    // ...
  }
}
```

3. Environment-Variable hinzufügen:
```env
CAMERA_STRATEGY=custom
```

### Neue Button-Funktionen

1. Button in Config registrieren
2. Event-Listener implementieren
3. Action in ButtonEventListener hinzufügen

## Lizenz

Siehe Hauptprojekt-Lizenz.