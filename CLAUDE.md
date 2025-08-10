# Photobooth Migration: PHP → NestJS + Angular

## Projektübersicht
Migration einer PHP-basierten Photobooth-Anwendung zu einer modernen NestJS (Backend) + Angular (Frontend) Architektur.

## Aktueller Status (08.08.2025)
- ✅ **Backend**: 100% migriert (NestJS mit allen Services)
- ✅ **Database**: TypeORM mit PostgreSQL/SQLite
- ✅ **WebSocket**: Socket.IO für Realtime-Features
- ✅ **Docker**: Vollständige Containerisierung
- ✅ **Hardware**: GPIO & Camera Service implementiert
- 🚧 **Frontend**: 70% migriert (Admin UI fertig, Build-Fehler vorhanden)

## Projektstruktur
```
/photobooth-ng
  /apps
    /backend  (NestJS - ✅ fertig)
    /frontend (Angular - 70% fertig)
  /libs      (Shared libraries)
```

## Wichtige Implementierungsdetails

### Backend Services (✅ Alle implementiert)
1. **ConfigurationService**: Zentrale Konfiguration mit Joi-Validierung
2. **CameraService**: Strategy Pattern für verschiedene Kamera-Typen
3. **ImageProcessingService**: Bildbearbeitung mit Sharp
4. **GalleryService**: Bilderverwaltung mit Repository Pattern
5. **PrintService**: Druckerverwaltung mit Queue
6. **WebSocketGateway**: Realtime-Features mit Socket.IO
7. **CacheService**: LRU/LFU/FIFO Caching-Strategien
8. **BackupService**: Automatische Backups mit Rotation

### Frontend Components (70% fertig)
#### ✅ Fertig:
- Admin Module mit Routing
- Settings Form (7 Kategorien)
- Sidebar Navigation
- Custom Form Controls (Color Picker, File Upload, Toggle, Number Stepper)
- Core Components (Stage*, Preview, Gallery)
- Settings State Management mit Undo/Redo

#### ⚠️ Build-Fehler vorhanden:
- Admin Components Standalone-Problem
- TypeScript Typ-Fehler
- Template Binding Issues

### Database Schema (✅ Fertig)
- **Image**: Metadaten, Tags, Bewertungen
- **Session**: Multi-User Sessions
- **PrintJob**: Druckaufträge mit Status
- **Settings**: Konfiguration in DB

### Docker Setup (✅ Fertig)
- Multi-Stage Builds
- Development mit Hot-Reload
- Production optimiert
- PostgreSQL, Redis, MailHog integriert
- Health Checks & Monitoring

## Kritische TODOs

### 🔴 Sofort beheben (Blocker):
1. **Frontend Build Fehler** - verhindert Deployment
2. **Admin Panel Components** - müssen fertiggestellt werden
3. **E2E Tests** - für Hauptflows

### 🟡 Wichtig:
1. **Security**: JWT, RBAC, HTTPS
2. **Mail Service**: SMTP Implementation
3. **Production Scripts**: Raspberry Pi Deployment

## Environment-Strategie

### Unterstützte Umgebungen:
- **development**: macOS/Windows mit Mock Hardware
- **docker**: Container mit simulierter Hardware
- **staging**: Raspberry Pi Test
- **production**: Raspberry Pi Live

### Hardware-Unterstützung:
- **Raspberry Pi**: Volle Hardware-Unterstützung (GPIO, Kamera)
- **Linux/Ubuntu**: DSLR via gphoto2, Webcam
- **Windows**: Via WSL oder digiCamControl
- **macOS**: Entwicklung mit Docker/Mocks

## Build & Run Commands

### ⚠️ WICHTIGE HINWEISE FÜR CLAUDE SESSIONS ⚠️

**IMMER die Management Scripts verwenden - NIE direkt `npx nx serve` aufrufen!**

Die Scripts wurden speziell entwickelt um folgende Probleme zu lösen:
- Mehrere nx Prozesse können parallel laufen und blockieren sich
- Port 3000 wird nicht immer sauber freigegeben
- Backend braucht bis zu 20 Sekunden zum vollständigen Start
- Einfaches `kill` reicht oft nicht aus

**Was die Scripts automatisch machen:**
- **backend-start.sh**: Wartet bis zu 23 Sekunden auf vollständige Initialisierung
- **backend-stop.sh**: Räumt ALLE nx Prozesse und Port 3000 auf
- **frontend-start.sh**: Wartet bis zu 38 Sekunden auf Frontend Kompilierung
- **frontend-stop.sh**: Räumt ALLE nx/ng Prozesse und Port 4200 auf
- **api-test.sh**: Prüft ob Backend wirklich läuft bevor Tests starten
- **frontend-test.sh**: Prüft Frontend Routes und Assets

### Development:
```bash
# Backend starten und überwachen (WICHTIG: Immer vollständige Pfade verwenden!)
/Users/sascha/projects/photobooth/photobooth-ng/scripts/backend-start.sh    # Startet Backend (prüft ob bereits läuft)
/Users/sascha/projects/photobooth/photobooth-ng/scripts/backend-monitor.sh  # Überwacht Backend und startet bei Bedarf neu
/Users/sascha/projects/photobooth/photobooth-ng/scripts/backend-stop.sh     # Stoppt Backend

# Frontend (Port 4200)
/Users/sascha/projects/photobooth/photobooth-ng/scripts/frontend-stop.sh    # Stoppt Frontend komplett
/Users/sascha/projects/photobooth/photobooth-ng/scripts/frontend-start.sh   # Startet Frontend
/Users/sascha/projects/photobooth/photobooth-ng/scripts/frontend-test.sh    # Testet ob Frontend läuft
/Users/sascha/projects/photobooth/photobooth-ng/scripts/frontend-test.sh -w # Watch Mode (testet alle 5 Sekunden)

# API Tests (Port 3000)
/Users/sascha/projects/photobooth/photobooth-ng/scripts/api-test.sh         # Testet alle Backend API Endpoints

# Oder direkt aus dem photobooth-ng Verzeichnis:
cd photobooth-ng && npx nx serve backend
cd photobooth-ng && npx nx serve frontend

# Mit Docker
docker-compose -f docker-compose.dev.yml up
```

### Service Management Scripts:
Die Scripts im `scripts/` Verzeichnis helfen beim Service-Management.

**⚠️ KRITISCH: Diese Regeln MÜSSEN befolgt werden!**

1. **IMMER vollständige Pfade verwenden:**
```bash
# ✅ RICHTIG:
/Users/sascha/projects/photobooth/photobooth-ng/scripts/backend-start.sh

# ❌ FALSCH:
./scripts/backend-start.sh
cd scripts && ./backend-start.sh
```

2. **IMMER diese Reihenfolge einhalten:**
```bash
# Backend Workflow:
# 1. Erst stoppen (auch wenn nichts läuft!)
/Users/sascha/projects/photobooth/photobooth-ng/scripts/backend-stop.sh

# 2. Dann starten
/Users/sascha/projects/photobooth/photobooth-ng/scripts/backend-start.sh

# 3. API testen
/Users/sascha/projects/photobooth/photobooth-ng/scripts/api-test.sh

# 4. Wieder stoppen
/Users/sascha/projects/photobooth/photobooth-ng/scripts/backend-stop.sh

# Frontend Workflow (analog):
# 1. Erst stoppen
/Users/sascha/projects/photobooth/photobooth-ng/scripts/frontend-stop.sh

# 2. Dann starten
/Users/sascha/projects/photobooth/photobooth-ng/scripts/frontend-start.sh

# 3. Frontend testen
/Users/sascha/projects/photobooth/photobooth-ng/scripts/frontend-test.sh

# 4. Wieder stoppen
/Users/sascha/projects/photobooth/photobooth-ng/scripts/frontend-stop.sh
```

3. **NIEMALS direkt nx aufrufen:**
```bash
# ❌ FALSCH - Führt zu Problemen:
npx nx serve backend
cd photobooth-ng && npx nx serve backend

# ✅ RICHTIG - Verwende immer die Scripts:
/Users/sascha/projects/photobooth/photobooth-ng/scripts/backend-start.sh
```

4. **Bei Problemen:**
- Wenn Backend nicht startet: Erst `backend-stop.sh` ausführen, dann neu starten
- Wenn Frontend nicht startet: Erst `frontend-stop.sh` ausführen, dann neu starten
- Wenn Port 3000 blockiert: `backend-stop.sh` räumt automatisch auf
- Wenn Port 4200 blockiert: `frontend-stop.sh` räumt automatisch auf
- Wenn API Tests fehlschlagen: Backend könnte noch initialisieren (bis zu 23 Sekunden warten)
- Wenn Frontend nicht antwortet: Erste Kompilierung kann 30-60 Sekunden dauern!

#### Start Scripts:
- **backend-start.sh**: Startet Backend auf Port 3000
  - Wechselt automatisch ins richtige Verzeichnis (`photobooth-ng`)
  - Speichert PID in `/tmp/backend.pid`
  - Logs in `/tmp/backend.log`
  - Zeigt letzte 30 Log-Zeilen nach Start

- **frontend-start.sh**: Startet Frontend auf Port 4200
  - Wechselt automatisch ins richtige Verzeichnis (`photobooth-ng`)
  - Speichert PID in `/tmp/frontend.pid`
  - Logs in `/tmp/frontend.log`
  - Zeigt URL zum Zugriff auf die Anwendung

#### Stop Scripts:
- **backend-stop.sh**: Stoppt laufendes Backend
  - Nutzt gespeicherte PID oder findet Prozess über Port
  - Graceful shutdown, dann force kill falls nötig

- **backend-stop-port.sh**: Stoppt alle Prozesse auf Port 3000
- **frontend-stop.sh**: Stoppt laufendes Frontend
  - Nutzt gespeicherte PID oder findet Prozess über Port
  - Stoppt alle nx/ng serve Prozesse
  - Räumt Port 4200 komplett auf

#### Monitoring:
- **backend-monitor.sh**: Kontinuierliche Backend-Überwachung
  - Health-Checks alle 30 Sekunden
  - Auto-Restart nach 3 fehlgeschlagenen Checks
  - Zeigt CPU/Memory Stats und Fehler aus Logs

### Production:
```bash
# Build
npx nx build backend --configuration=production
npx nx build frontend --configuration=production

# Docker
docker-compose -f docker-compose.prod.yml up -d
```

## API Testing

### ⚠️ Backend WebSocket Problem
**BEKANNTES PROBLEM**: Alle API Requests antworten aktuell mit "WebSockets request was expected" (Status 400). 
Das ist ein Problem im Backend-Code, NICHT in den Scripts. Das Backend läuft trotzdem und die Scripts funktionieren korrekt.

### API Test Script
Zum Testen der API-Endpoints verwende das Script `scripts/api-test.sh`:

```bash
# Alle Tests ausführen (Backend muss laufen!)
./scripts/api-test.sh

# Interaktiver Modus für einzelne Tests
./scripts/api-test.sh -i
```

### Beispiel: Custom API Request mit dem Script

Das Script verwendet intern die `test_api` Funktion mit folgenden Parametern:
- **method**: HTTP Methode (GET, POST, PUT, DELETE)
- **endpoint**: API Pfad (z.B. `/api/gallery`)
- **data**: JSON Daten für POST/PUT (optional)
- **description**: Beschreibung des Tests

**Beispiel im Code:**
```bash
# GET Request
test_api "GET" "/api/gallery?page=1&limit=5" "" "Get first 5 gallery images"

# POST Request mit JSON Daten
test_api "POST" "/api/capture" '{"mode":"photo","filter":"grayscale"}' "Capture photo with grayscale filter"

# PUT Request
test_api "PUT" "/api/settings/section/camera" '{"countdown":5}' "Update camera countdown"
```

### Response Auswertung
Das Script zeigt für jeden Test:
- **HTTP Status Code**: Grün (2xx = Erfolg), Rot (Fehler)
- **Response Body**: JSON Antwort (max. 200 Zeichen, vollständig bei kurzen Responses)
- **Fehler**: Detaillierte Fehlermeldung bei nicht-erfolgreichen Requests

**Beispiel Output:**
```
Testing: Get gallery (page 1, limit 5)
  GET http://localhost:3000/api/gallery?page=1&limit=5
  ✓ Status: 200
  Response: {"data":[...],"pagination":{"page":1,"limit":5,"total":42}}
```

## API Endpoints (✅ Alle implementiert)
- POST `/api/capture` - Foto aufnehmen
- GET `/api/gallery` - Galerie abrufen
- GET/POST `/api/settings` - Einstellungen
- POST `/api/print` - Drucken
- GET `/api/qrcode` - QR-Code generieren
- POST `/api/chromakeying/*` - Greenscreen
- POST `/api/admin/*` - Admin-Funktionen

## WebSocket Events (✅ Implementiert)
- `gallery-update` - Galerie-Updates
- `settings-sync` - Settings-Synchronisation
- `print-queue-update` - Drucker-Queue
- `buzzer-triggered` - Remote Buzzer
- `collaboration-*` - Multi-User Features

## Bekannte Probleme
1. Frontend Build schlägt fehl (Admin Components)
2. TypeScript strict mode Fehler
3. Angular Animations Module fehlt
4. Config Service Type-Probleme

## Nächste Schritte
1. Build-Fehler beheben
2. E2E Tests implementieren
3. Security Layer hinzufügen
4. Production Deployment vorbereiten

---
Letzte Aktualisierung: 08.08.2025