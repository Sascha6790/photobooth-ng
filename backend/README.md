# Photobooth Backend (NestJS)

## Migration Status

Backend-Migration von PHP zu NestJS für die Photobooth-Anwendung.

### ✅ Abgeschlossene Komponenten

#### Core Services
- [x] **ConfigurationService** - Zentrale Konfigurationsverwaltung mit Joi-Validierung
- [x] **LoggerService** - Winston-basiertes Logging mit Daily Rotate
- [x] **FileService** - File-System-Abstraktion
- [x] **ValidationService** - Input-Validierung mit Joi

#### API Controllers & Services
- [x] **CaptureController/Service** - Foto-/Video-Aufnahme
- [x] **GalleryController/Service** - Bilderverwaltung
- [x] **SettingsController** - Konfigurationsverwaltung
- [x] **PrintController/Service** - Druckerverwaltung
- [x] **QrcodeController/Service** - QR-Code-Generierung
- [x] **ChromakeyingController** - Greenscreen-Verarbeitung
- [x] **AdminController** - Admin-Funktionen
- [x] **CameraService** - Kamera-Abstraktion mit Strategy Pattern
- [x] **ImageProcessingService** - Bildbearbeitung mit Sharp

### 🚧 In Arbeit
- [ ] WebSocket-Integration für Live-Updates
- [ ] Session-Management
- [ ] JWT-Authentication
- [ ] Database-Integration (TypeORM/Prisma)

### 📁 Projektstruktur

```
backend/
├── src/
│   ├── api/
│   │   ├── controllers/    # REST API Controller
│   │   ├── dto/            # Data Transfer Objects
│   │   └── services/       # Business Logic Services
│   ├── config/
│   │   ├── config.module.ts
│   │   └── configuration.service.ts
│   ├── services/
│   │   ├── file.service.ts
│   │   ├── logger.service.ts
│   │   └── validation.service.ts
│   └── app/
│       ├── app.module.ts
│       └── main.ts
```

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Entwicklung

```bash
# Entwicklungsserver starten
npm run dev

# Mit Nx
nx serve backend
```

### Environment Variables

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
NODE_ENV=development
PORT=3000

# Camera
CAMERA_MODE=mock  # mock, gphoto2, webcam, raspistill

# Database
DATABASE_TYPE=sqlite
DATABASE_PATH=data/photobooth.db

# Paths
DATA_DIR=data
IMAGES_DIR=data/images
THUMBS_DIR=data/thumbs

# Features
PRINT_ENABLED=false
MAIL_ENABLED=false
GPIO_ENABLED=false

# Admin
ADMIN_PASSWORD=admin
ADMIN_PIN=1234
```

## 📚 API Documentation

Swagger-Dokumentation ist verfügbar unter:
```
http://localhost:3000/docs
```

## 🔌 API Endpoints

### Capture
- `POST /api/capture` - Foto aufnehmen
- `POST /api/capture/upload` - Bild hochladen
- `GET /api/capture/preview` - Kamera-Vorschau
- `POST /api/capture/countdown/start` - Countdown starten
- `POST /api/capture/countdown/cancel` - Countdown abbrechen

### Gallery
- `GET /api/gallery` - Bilder abrufen (mit Pagination)
- `GET /api/gallery/latest` - Neueste Bilder
- `GET /api/gallery/random` - Zufällige Bilder
- `GET /api/gallery/stats` - Galerie-Statistiken
- `GET /api/gallery/:id` - Einzelnes Bild
- `DELETE /api/gallery/:id` - Bild löschen
- `DELETE /api/gallery/bulk` - Mehrere Bilder löschen
- `POST /api/gallery/rebuild` - Datenbank neu aufbauen

### Settings
- `GET /api/settings` - Alle Einstellungen
- `PUT /api/settings` - Einstellungen aktualisieren
- `GET /api/settings/section/:section` - Einstellungs-Bereich
- `PUT /api/settings/section/:section` - Bereich aktualisieren
- `POST /api/settings/export` - Einstellungen exportieren
- `POST /api/settings/import` - Einstellungen importieren

### Print
- `POST /api/print` - Bild drucken
- `GET /api/print/queue` - Druckwarteschlange

### QR Code
- `GET /api/qrcode` - QR-Code generieren

### Chromakeying
- `POST /api/chromakeying/apply` - Chromakey anwenden
- `GET /api/chromakeying/backgrounds` - Verfügbare Hintergründe

### Admin
- `POST /api/admin/login` - Admin-Login
- `POST /api/admin/logout` - Admin-Logout
- `GET /api/admin/status` - System-Status
- `POST /api/admin/shutdown` - System herunterfahren
- `POST /api/admin/restart` - System neustarten

## 🎯 Camera Strategies

### Mock Camera (Development)
```typescript
CAMERA_MODE=mock
```
Verwendet Platzhalter-Bilder für die Entwicklung.

### GPhoto2 (DSLR)
```typescript
CAMERA_MODE=gphoto2
```
Benötigt installiertes gphoto2:
```bash
sudo apt-get install gphoto2
```

### Webcam
```typescript
CAMERA_MODE=webcam
```
Benötigt ffmpeg:
```bash
sudo apt-get install ffmpeg
```

### Raspistill (Raspberry Pi)
```typescript
CAMERA_MODE=raspistill
```
Nur auf Raspberry Pi mit Camera Module.

## 🧪 Testing

```bash
# Unit Tests
npm run test

# E2E Tests
npm run test:e2e

# Test Coverage
npm run test:cov
```

## 🏗️ Build

```bash
# Production Build
npm run build

# Mit Nx
nx build backend
```

## 📝 TODOs

### High Priority
- [ ] WebSocket für Echtzeit-Updates
- [ ] JWT Authentication implementieren
- [ ] Session Management
- [ ] Database Integration (SQLite/PostgreSQL)

### Medium Priority
- [ ] File Upload Limits
- [ ] Rate Limiting
- [ ] Request Logging Middleware
- [ ] Error Handling Middleware

### Low Priority
- [ ] Metrics Collection
- [ ] Health Check Endpoint erweitern
- [ ] Backup/Restore Funktionalität
- [ ] Multi-Language Support

## 🔧 Konfiguration

### Konfigurationsdatei

Die Konfiguration kann auch über JSON-Dateien erfolgen:

```json
// config/photobooth.development.json
{
  "app": {
    "name": "Photobooth",
    "version": "5.0.0",
    "debug": true
  },
  "camera": {
    "mode": "mock",
    "countdown": 5
  },
  // ...
}
```

### Priorität der Konfigurationsquellen

1. Environment Variables (höchste Priorität)
2. `.env` Dateien
3. JSON-Konfigurationsdateien
4. Default-Werte (niedrigste Priorität)

## 📄 License

MIT