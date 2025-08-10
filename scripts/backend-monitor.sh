#!/bin/bash

# Backend Monitor Script
# Überwacht das Backend und startet es bei Bedarf neu

PID_FILE="/tmp/backend.pid"
LOG_FILE="/tmp/backend.log"
PORT=3000
CHECK_INTERVAL=30  # Sekunden zwischen Checks
MAX_RETRIES=3
HEALTH_CHECK_URL="http://localhost:$PORT/health"

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Signal Handler für sauberes Beenden
trap cleanup EXIT INT TERM

cleanup() {
    echo -e "\n${YELLOW}Stopping monitor...${NC}"
    exit 0
}

# Prüfe Backend Status
check_backend_health() {
    # Prüfe ob PID existiert
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ! ps -p $PID > /dev/null 2>&1; then
            return 1  # Prozess läuft nicht
        fi
    else
        return 1  # Keine PID-Datei
    fi
    
    # Prüfe Health-Endpoint (falls verfügbar)
    if command -v curl &> /dev/null; then
        if curl -f -s -o /dev/null -w "%{http_code}" --max-time 5 "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            return 0  # Health check erfolgreich
        fi
    fi
    
    # Fallback: Prüfe ob Port belegt ist
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port ist belegt
    fi
    
    return 1  # Backend nicht erreichbar
}

# Starte Backend neu
restart_backend() {
    echo -e "${YELLOW}Restarting backend...${NC}"
    
    # Stoppe altes Backend falls vorhanden
    bash "$(dirname "$0")/backend-stop.sh" > /dev/null 2>&1
    
    sleep 2
    
    # Starte Backend neu
    bash "$(dirname "$0")/backend-start.sh"
}

# Zeige Status
show_status() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    if check_backend_health; then
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            echo -e "${GREEN}[$timestamp] Backend is healthy (PID: $PID)${NC}"
        else
            echo -e "${GREEN}[$timestamp] Backend is healthy${NC}"
        fi
    else
        echo -e "${RED}[$timestamp] Backend is not responding${NC}"
        return 1
    fi
    
    # Zeige Memory/CPU usage falls möglich
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if command -v ps &> /dev/null; then
            local stats=$(ps -p $PID -o %cpu,%mem,etime 2>/dev/null | tail -1)
            if [ ! -z "$stats" ]; then
                echo -e "${BLUE}  Stats: $stats${NC}"
            fi
        fi
    fi
    
    return 0
}

# Log-Überwachung
watch_logs() {
    if [ -f "$LOG_FILE" ]; then
        # Zeige Fehler aus den letzten Zeilen
        local errors=$(tail -100 "$LOG_FILE" 2>/dev/null | grep -i "error\|exception\|fatal" | tail -5)
        if [ ! -z "$errors" ]; then
            echo -e "${RED}Recent errors in log:${NC}"
            echo "$errors"
        fi
    fi
}

# Hauptschleife
main() {
    echo -e "${BLUE}Backend Monitor Started${NC}"
    echo -e "${YELLOW}Monitoring backend on port $PORT${NC}"
    echo -e "${YELLOW}Check interval: ${CHECK_INTERVAL}s${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop monitoring${NC}\n"
    
    local retry_count=0
    
    # Initial check und ggf. Start
    if ! check_backend_health; then
        echo -e "${YELLOW}Backend not running, starting...${NC}"
        restart_backend
        retry_count=0
    fi
    
    # Monitoring Loop
    while true; do
        sleep $CHECK_INTERVAL
        
        if show_status; then
            retry_count=0
            watch_logs
        else
            retry_count=$((retry_count + 1))
            echo -e "${YELLOW}Retry $retry_count of $MAX_RETRIES${NC}"
            
            if [ $retry_count -ge $MAX_RETRIES ]; then
                echo -e "${RED}Backend failed $MAX_RETRIES times, attempting restart...${NC}"
                restart_backend
                retry_count=0
                sleep 10  # Extra Zeit nach Restart
            fi
        fi
        
        echo ""  # Leerzeile für bessere Lesbarkeit
    done
}

# Script starten
main