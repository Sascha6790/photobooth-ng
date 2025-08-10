#!/bin/bash

# Frontend Start Script
# Prüft ob Frontend läuft und startet es bei Bedarf

PID_FILE="/tmp/frontend.pid"
LOG_FILE="/tmp/frontend.log"
PORT=4200

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Prüfe ob Frontend bereits läuft
check_frontend_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            return 0  # Frontend läuft
        else
            rm -f "$PID_FILE"  # Entferne veraltete PID-Datei
        fi
    fi
    
    # Prüfe auch ob Port belegt ist
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port ist belegt, Frontend läuft wahrscheinlich
    fi
    
    return 1  # Frontend läuft nicht
}

# Starte Frontend
start_frontend() {
    echo -e "${YELLOW}Starting frontend on port $PORT...${NC}"
    
    # Erstelle Log-Datei falls nicht vorhanden
    touch "$LOG_FILE"
    
    # Wechsle ins richtige Verzeichnis und starte Frontend
    cd /Users/sascha/projects/photobooth/photobooth-ng
    npx nx serve frontend --port=$PORT > "$LOG_FILE" 2>&1 &
    PID=$!
    
    # Speichere PID
    echo $PID > "$PID_FILE"
    
    echo -e "${GREEN}Started frontend with PID $PID${NC}"
    echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
    
    # Warte kurz und zeige erste Log-Ausgaben
    echo -e "${YELLOW}Waiting for frontend to initialize...${NC}"
    sleep 8
    
    # Prüfe ob Prozess noch läuft
    if ps -p $PID > /dev/null; then
        echo -e "${GREEN}Frontend process started successfully!${NC}"
        
        # Warte bis Frontend wirklich bereit ist (prüfe ob Port antwortet)
        echo -e "${YELLOW}Waiting for frontend to be ready...${NC}"
        for i in {1..30}; do
            # Prüfe ob der Dev-Server antwortet
            if curl -f -s -o /dev/null "http://localhost:$PORT/" 2>/dev/null; then
                echo -e "${GREEN}Frontend is fully ready and responding!${NC}"
                echo -e "${GREEN}✓ Access the application at: http://localhost:$PORT${NC}"
                echo -e "\n${YELLOW}Last 30 lines from log:${NC}"
                tail -30 "$LOG_FILE"
                exit 0
            fi
            echo -n "."
            sleep 1
        done
        
        # Falls Health Check nicht erfolgreich, aber Prozess läuft
        echo -e "\n${YELLOW}Frontend process is running but not yet responding${NC}"
        echo -e "${YELLOW}Frontend might still be compiling. This can take up to 60 seconds on first start.${NC}"
        echo -e "${GREEN}Try accessing: http://localhost:$PORT${NC}"
        echo -e "\n${YELLOW}Last 30 lines from log:${NC}"
        tail -30 "$LOG_FILE"
    else
        echo -e "${RED}Frontend failed to start. Check log file: $LOG_FILE${NC}"
        tail -50 "$LOG_FILE"
        exit 1
    fi
}

# Hauptlogik
if check_frontend_running; then
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}Frontend is already running with PID $PID${NC}"
    else
        echo -e "${GREEN}Frontend is already running on port $PORT${NC}"
    fi
    echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
    echo -e "${GREEN}Access the application at: http://localhost:$PORT${NC}"
    echo -e "\n${YELLOW}Last 30 lines from log:${NC}"
    tail -30 "$LOG_FILE"
else
    start_frontend
fi