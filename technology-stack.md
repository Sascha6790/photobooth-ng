# Technology Stack - Context7 Reference

Diese Datei enthält die Context7 Library IDs für alle Technologien der Photobooth Migration.
Verwende diese IDs mit "use context7" um aktuelle Dokumentation abzurufen.

## Verwendung

```
# Beispiel für spezifische Dokumentation:
"Zeige mir NestJS Controller Dokumentation. use library /nestjs/nest for api and docs"
"Wie erstelle ich einen Angular Service? use library /angular/angular"
```

## Backend-Technologien

### Core Framework
- **NestJS**: `/nestjs/nest` (160 code snippets, Trust Score: 9.5)
- **TypeScript**: `/microsoft/typescript` (19,177 code snippets, Trust Score: 9.9)
- **Socket.io**: `/socketio/socket.io` (221 code snippets)

### Datenbank & ORM
- **PostgreSQL**: `/postgres/postgres` (89 code snippets, Trust Score: 8.4)
- **SQLite**: `/sqlite/sqlite` (134 code snippets)
- **Prisma**: `/prisma/docs` (4,460 code snippets, Trust Score: 10) ⭐ Empfohlen
- **TypeORM**: `/n8n-io/typeorm` (976 code snippets, Trust Score: 9.7)

### Queue & Process Management
- **Bull**: `/optimalbits/bull` (92 code snippets, Trust Score: 7.2)
- **PM2**: `/unitech/pm2` (109 code snippets, Trust Score: 9.6)

## Frontend-Technologien

### Framework
- **Angular**: `/angular/angular` (127 code snippets, Trust Score: 8.9)

### Styling
- **Tailwind CSS**: `/context7/tailwindcss` (2,336 code snippets, Trust Score: 7.5)

## DevOps & Testing

### Container & Deployment
- **Docker**: `/docker/docs` (5,961 code snippets, Trust Score: 9.9)

### Testing
- **Jest**: `/jestjs/jest` (2,196 code snippets, Trust Score: 6.9)

## Weitere verfügbare Libraries (ohne gefundene IDs)

Diese Technologien sind im Projekt, aber es wurden keine spezifischen Context7 IDs gefunden:
- Node.js (verwende TypeScript docs)
- Express (Teil von NestJS)
- Nx (Monorepo Tool)
- onoff (GPIO Library)
- PhotoSwipe
- gphoto2
- Sharp/Jimp (Bildbearbeitung)
- Multer (File Upload)
- Winston/Pino (Logging)

## Empfehlungen

1. **Prisma** statt TypeORM (10/10 Trust Score, mehr Snippets)
2. **Context7 On-Demand nutzen** statt alle Docs vorab speichern
3. **Topic-spezifisch abfragen**: 
   ```
   "NestJS WebSocket implementation. use library /nestjs/nest topic websockets"
   ```

## Nützliche Queries

```bash
# NestJS mit GPIO Mock Service
"Create NestJS service with conditional provider for GPIO. use library /nestjs/nest"

# Angular mit Socket.io
"Angular service for Socket.io connection. use library /angular/angular and /socketio/socket.io"

# Prisma mit SQLite
"Setup Prisma with SQLite for development. use library /prisma/docs"
```

---
Letzte Aktualisierung: 2025-08-08