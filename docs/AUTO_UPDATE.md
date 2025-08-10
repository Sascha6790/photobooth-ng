# 🚀 Photobooth Auto-Update System

## Übersicht

Das Auto-Update System ermöglicht automatische Updates der Photobooth-Software auf Raspberry Pi Geräten ohne manuellen Eingriff.

## Installation

### Voraussetzungen
- Raspberry Pi mit Raspbian OS
- Photobooth in `/opt/photobooth` installiert
- Root/Sudo Zugriff
- Internetverbindung

### Setup
```bash
cd /opt/photobooth
sudo bash scripts/install-auto-update.sh
```

Dies installiert:
- Update-Script nach `/usr/local/bin/photobooth-update`
- Systemd Service und Timer
- Konfigurationsdatei in `/etc/photobooth/update.conf`
- Backup-Verzeichnis in `/var/backups/photobooth`

## Konfiguration

Bearbeite `/etc/photobooth/update.conf`:

```bash
# Auto-Updates aktivieren/deaktivieren
AUTO_UPDATE_ENABLED=true

# Update-Kanal: stable, beta oder spezifische Version
UPDATE_CHANNEL=stable

# Automatische Backups vor Updates
AUTO_BACKUP=true

# Maximale Anzahl gespeicherter Backups
MAX_BACKUPS=5

# Email für Update-Benachrichtigungen (optional)
NOTIFY_EMAIL="admin@example.com"
```

## Verwendung

### Automatische Updates
Updates werden automatisch täglich um 3:00 Uhr überprüft und installiert.

### Manuelle Befehle

```bash
# Status anzeigen
photobooth-update status

# Manuell nach Updates suchen
photobooth-update check

# Bestimmte Version installieren
photobooth-update install 1.2.0

# Zum letzten Backup zurückkehren
photobooth-update rollback

# Auto-Updates deaktivieren
photobooth-update disable

# Auto-Updates aktivieren
photobooth-update enable
```

## Update-Prozess

1. **Version Check**
   - Abfrage der neuesten Version von GitHub Releases
   - Vergleich mit lokaler Version

2. **Backup**
   - Sicherung der aktuellen Installation
   - Rotation alter Backups (behält MAX_BACKUPS)

3. **Download & Installation**
   - Download des Release-Pakets von GitHub
   - Stoppen der Photobooth-Services
   - Entpacken der neuen Version
   - Installation der Dependencies

4. **Health Check**
   - Start der Services
   - Überprüfung der API-Verfügbarkeit
   - Service-Status-Check

5. **Rollback bei Fehler**
   - Automatisches Zurücksetzen bei fehlgeschlagenem Health Check
   - Wiederherstellung des letzten funktionierenden Backups

## Logs & Monitoring

### Log-Dateien
- **Update-Log:** `/var/log/photobooth/update.log`
- **Service-Logs:** `journalctl -u photobooth-updater`

### Systemd Timer Status
```bash
# Timer-Status prüfen
systemctl status photobooth-updater.timer

# Nächste geplante Ausführung
systemctl list-timers photobooth-updater

# Timer neu starten
sudo systemctl restart photobooth-updater.timer
```

### Manuelle Ausführung
```bash
# Sofortiger Update-Check
sudo systemctl start photobooth-updater.service

# Logs ansehen
journalctl -u photobooth-updater -f
```

## Sicherheit

### Backup-Strategie
- Automatische Backups vor jedem Update
- Komprimierte tar.gz Archive
- Ausschluss von node_modules und logs
- Rotation alter Backups

### Rollback-Mechanismus
```bash
# Manueller Rollback
photobooth-update rollback

# Backup-Liste anzeigen
ls -la /var/backups/photobooth/

# Spezifisches Backup wiederherstellen
cd /opt
sudo tar -xzf /var/backups/photobooth/photobooth-backup-20250810-120000.tar.gz
```

### Health Checks
Nach jedem Update werden folgende Checks durchgeführt:
- Backend Service läuft
- Frontend Service läuft
- API antwortet auf /health Endpoint
- Keine kritischen Fehler in Logs

## Troubleshooting

### Update schlägt fehl
```bash
# Logs prüfen
tail -n 100 /var/log/photobooth/update.log

# Manueller Rollback
photobooth-update rollback

# Services manuell starten
sudo systemctl start photobooth-backend photobooth-frontend
```

### Timer läuft nicht
```bash
# Timer aktivieren
sudo systemctl enable photobooth-updater.timer
sudo systemctl start photobooth-updater.timer

# Timer-Status prüfen
systemctl status photobooth-updater.timer
```

### Download-Probleme
```bash
# Proxy-Einstellungen prüfen
export HTTP_PROXY=http://proxy:port
export HTTPS_PROXY=http://proxy:port

# Manueller Download-Test
curl -L https://api.github.com/repos/Sascha6790/photobooth-ng/releases/latest
```

### Keine Berechtigung
```bash
# Berechtigungen korrigieren
sudo chown -R photobooth:photobooth /opt/photobooth
sudo chmod +x /usr/local/bin/photobooth-update
```

## Release-Workflow für Entwickler

### Neues Release erstellen
```bash
# Version bumpen und taggen
npm version patch  # oder minor/major
git push origin main --tags

# GitHub Release wird automatisch erstellt
```

### Release-Assets
Folgende Dateien werden automatisch erstellt:
- `photobooth-ng-vX.Y.Z-linux.tar.gz` - Hauptpaket
- `photobooth-ng-vX.Y.Z.zip` - Alternative
- `update.sh` - Standalone Update-Script

### Update-Kanäle
- **stable**: Nur stabile Releases (default)
- **beta**: Auch Pre-Releases
- **X.Y.Z**: Spezifische Version fixieren

## Best Practices

1. **Testen vor Release**
   - Immer auf Test-System prüfen
   - Health Checks validieren
   - Rollback-Funktion testen

2. **Monitoring**
   - Email-Benachrichtigungen konfigurieren
   - Regelmäßig Logs prüfen
   - Backup-Integrität sicherstellen

3. **Wartungsfenster**
   - Updates außerhalb der Nutzungszeiten
   - Timer auf passende Zeit anpassen
   - Nutzer über Updates informieren

## Support

Bei Problemen:
1. Logs prüfen: `/var/log/photobooth/update.log`
2. GitHub Issues: https://github.com/Sascha6790/photobooth-ng/issues
3. Rollback durchführen und manuell debuggen