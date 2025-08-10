#!/bin/bash

# Backend Start Script
# Prüft ob Backend läuft und startet es bei Bedarf

PID_FILE="/tmp/backend.pid"
LOG_FILE="/tmp/backend.log"
PORT=3000

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Prüfe ob Backend bereits läuft
check_backend_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            return 0  # Backend läuft
        else
            rm -f "$PID_FILE"  # Entferne veraltete PID-Datei
        fi
    fi
    
    # Prüfe auch ob Port belegt ist
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port ist belegt, Backend läuft wahrscheinlich
    fi
    
    return 1  # Backend läuft nicht
}

# Starte Backend
start_backend() {
    echo -e "${YELLOW}Starting backend on port $PORT...${NC}"
    
    # Erstelle Log-Datei falls nicht vorhanden
    touch "$LOG_FILE"
    
    # Wechsle ins richtige Verzeichnis und starte Backend
    # Bestimme das Script-Verzeichnis und gehe eine Ebene hoch
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR/.."
    npx nx serve backend --port=$PORT > "$LOG_FILE" 2>&1 &
    PID=$!
    
    # Speichere PID
    echo $PID > "$PID_FILE"
    
    echo -e "${GREEN}Started backend with PID $PID${NC}"
    echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
    
    # Warte kurz und zeige erste Log-Ausgaben
    echo -e "${YELLOW}Waiting for backend to initialize...${NC}"
    sleep 8
    
    # Prüfe ob Prozess noch läuft
    if ps -p $PID > /dev/null; then
        echo -e "${GREEN}Backend process started successfully!${NC}"
        
        # Warte bis Backend wirklich bereit ist (prüfe Health endpoint)
        echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
        for i in {1..15}; do
            if curl -f -s -o /dev/null "http://localhost:$PORT/health" 2>/dev/null; then
                echo -e "${GREEN}Backend is fully ready and responding!${NC}"
                echo -e "\n${YELLOW}Last 30 lines from log:${NC}"
                tail -30 "$LOG_FILE"
                exit 0
            fi
            echo -n "."
            sleep 1
        done
        
        # Falls Health Check nicht erfolgreich, aber Prozess läuft
        echo -e "\n${YELLOW}Backend process is running but health check failed${NC}"
        echo -e "${YELLOW}Backend might still be initializing. Check logs for details.${NC}"
        echo -e "\n${YELLOW}Last 30 lines from log:${NC}"
        tail -30 "$LOG_FILE"
    else
        echo -e "${RED}Backend failed to start. Check log file: $LOG_FILE${NC}"
        tail -50 "$LOG_FILE"
        exit 1
    fi
}

# Hauptlogik
if check_backend_running; then
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}Backend is already running with PID $PID${NC}"
    else
        echo -e "${GREEN}Backend is already running on port $PORT${NC}"
    fi
    echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
    echo -e "\n${YELLOW}Last 30 lines from log:${NC}"
    tail -30 "$LOG_FILE"
else
    start_backend
fi