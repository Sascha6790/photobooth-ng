# WebSocket Module

Dieses Modul implementiert die Echtzeit-Kommunikation für die Photobooth-Anwendung mit Socket.IO.

## Features

### 1. Remote Buzzer
- PIN-basierte Sessions für Remote-Auslösung
- Multi-User Support mit Master/Participant Rollen
- Automatische Session-Verwaltung

### 2. Live Updates
- Echtzeit Gallery-Updates
- Settings-Synchronisation zwischen Clients
- Print Queue Status-Updates

### 3. Collaboration
- Multi-User Sessions
- Voting-System für Bilder
- Live-Slideshow Mode
- Session-basierte Räume

### 4. Monitoring
- System-Metriken (CPU, RAM, Network)
- Aktive Verbindungen Tracking
- Error-Logging
- Performance-Metriken

## Verwendung

### Backend (NestJS)

Das WebSocket-Modul ist bereits in `app.module.ts` integriert.

### Frontend (Angular)

```typescript
import { WebSocketService } from './core/services/websocket.service';

constructor(private websocket: WebSocketService) {}

// Remote Buzzer erstellen
async createBuzzer() {
  const session = await this.websocket.createBuzzerSession('session-123', '1234');
  console.log('Buzzer session created:', session);
}

// Buzzer auslösen
async triggerCapture() {
  await this.websocket.triggerBuzzer('session-123');
}

// Gallery Updates empfangen
this.websocket.onGalleryUpdate().subscribe(update => {
  console.log('Gallery updated:', update);
});

// Settings synchronisieren
async syncSettings(settings: any) {
  await this.websocket.syncSettings(settings, 'main-room');
}
```

## Events

### Client → Server

#### Remote Buzzer
- `remote-buzzer`: Buzzer-Aktionen (create, join, trigger, leave, status)

#### Gallery
- `gallery-update`: Gallery-Updates (new-image, delete-image, update-metadata, refresh)

#### Settings
- `settings-sync`: Settings synchronisieren

#### Print Queue
- `print-queue-update`: Print-Queue Updates (add, update, remove, status, clear)

#### Collaboration
- `vote-image`: Für Bild abstimmen
- `slideshow-control`: Slideshow steuern (start, stop, next, previous)

#### Monitoring
- `get-metrics`: System-Metriken abrufen
- `get-active-sessions`: Aktive Sessions abrufen

#### Rooms
- `join-room`: Raum beitreten
- `leave-room`: Raum verlassen
- `broadcast-to-room`: Nachricht an Raum senden

### Server → Client

#### Remote Buzzer
- `buzzer-triggered`: Buzzer wurde ausgelöst
- `buzzer-participant-joined`: Teilnehmer beigetreten
- `buzzer-participant-left`: Teilnehmer verlassen
- `buzzer-master-changed`: Master gewechselt
- `buzzer-session-ended`: Session beendet

#### Gallery
- `gallery-update`: Gallery-Update Event

#### Settings
- `settings-sync`: Settings-Update Event

#### Print Queue
- `print-queue-update`: Print-Queue Update Event

#### Collaboration
- `collaboration-user-joined`: User beigetreten
- `collaboration-user-left`: User verlassen
- `collaboration-host-changed`: Host gewechselt
- `collaboration-vote-updated`: Vote aktualisiert
- `collaboration-slideshow-*`: Slideshow Events

#### Monitoring
- `monitoring-metrics-update`: Metriken-Update
- `monitoring-error`: Error aufgetreten

## Konfiguration

### Environment Variables

```env
# WebSocket Configuration
CORS_ORIGIN=http://localhost:4200,http://localhost:3000
WEBSOCKET_PORT=3000
```

### Socket.IO Options

```typescript
{
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
}
```

## Testing

### Unit Tests

```bash
npm run test:unit websocket
```

### Integration Tests

```bash
npm run test:e2e websocket
```

### Manual Testing

1. Starte Backend: `npm run start:dev`
2. Öffne Socket.IO Admin UI: http://localhost:3000/socket.io/admin
3. Teste Events mit Socket.IO Client

## Mobile App Support

Die WebSocket-Implementierung unterstützt mobile Apps durch:

1. **Polling Fallback**: Automatischer Fallback auf HTTP Long-Polling
2. **Reconnection**: Automatische Wiederverbindung bei Verbindungsverlust
3. **Lightweight Events**: Optimierte Event-Payloads für mobile Netze
4. **Battery Optimization**: Heartbeat-Intervalle angepasst

### iOS/Android SDKs

- iOS: [Socket.IO-Client-Swift](https://github.com/socketio/socket.io-client-swift)
- Android: [Socket.IO-Client-Java](https://github.com/socketio/socket.io-client-java)
- React Native: [socket.io-client](https://www.npmjs.com/package/socket.io-client)

## Performance

### Optimierungen

1. **Room-basierte Events**: Events nur an relevante Clients
2. **Event Throttling**: Rate-Limiting für häufige Events
3. **Compression**: WebSocket-Kompression aktiviert
4. **Binary Support**: Binärdaten für Bilder

### Monitoring

- Aktive Verbindungen: `/api/websocket/connections`
- Metriken: `/api/websocket/metrics`
- Health Check: `/api/websocket/health`

## Troubleshooting

### Häufige Probleme

1. **CORS Errors**
   - Prüfe `CORS_ORIGIN` in .env
   - Stelle sicher, dass Frontend-URL enthalten ist

2. **Connection Timeout**
   - Prüfe Firewall-Einstellungen
   - Verifiziere Port 3000 ist offen

3. **Memory Leaks**
   - Prüfe Event-Listener Cleanup
   - Monitoring Dashboard nutzen

### Debug Mode

```typescript
// Enable debug logging
localStorage.setItem('debug', 'socket.io-client:*');
```

## Architektur

```
WebSocketModule
├── WebSocketGateway (Main Gateway)
├── Services
│   ├── RemoteBuzzerService (Buzzer Logic)
│   ├── LiveUpdateService (Real-time Updates)
│   ├── CollaborationService (Multi-User)
│   └── MonitoringService (Metrics & Logging)
└── Client Library (Angular Service)
```

## Sicherheit

1. **PIN-Schutz**: Remote Buzzer Sessions sind PIN-geschützt
2. **Rate Limiting**: Schutz vor Spam
3. **Input Validation**: Alle Events werden validiert
4. **Room Isolation**: Sessions sind isoliert
5. **Connection Limits**: Max. Verbindungen pro IP

## Roadmap

- [ ] WebRTC Integration für Video-Streaming
- [ ] Push Notifications
- [ ] Offline Mode mit Sync
- [ ] End-to-End Encryption
- [ ] GraphQL Subscriptions Support