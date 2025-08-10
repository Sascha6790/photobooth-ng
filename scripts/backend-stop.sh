#!/bin/bash

# Backend Stop Script
# Stoppt das laufende Backend und alle zugehörigen Prozesse

PID_FILE="/tmp/backend.pid"
LOG_FILE="/tmp/backend.log"
PORT=3000

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktion zum Stoppen aller nx backend Prozesse
stop_all_nx_backend() {
    echo -e "${YELLOW}Stopping all nx backend processes...${NC}"
    
    # Finde alle nx serve backend Prozesse
    local nx_pids=$(ps aux | grep "nx serve backend" | grep -v grep | awk '{print $2}')
    
    if [ ! -z "$nx_pids" ]; then
        echo -e "${YELLOW}Found nx processes: $nx_pids${NC}"
        for pid in $nx_pids; do
            kill -TERM $pid 2>/dev/null
        done
        sleep 2
        
        # Force kill falls noch laufend
        for pid in $nx_pids; do
            if ps -p $pid > /dev/null 2>&1; then
                kill -KILL $pid 2>/dev/null
            fi
        done
    fi
    
    # Finde auch alle node Prozesse die webpack auf Port 3000 ausführen
    local node_pids=$(ps aux | grep "node.*webpack.*3000" | grep -v grep | awk '{print $2}')
    if [ ! -z "$node_pids" ]; then
        echo -e "${YELLOW}Found node webpack processes: $node_pids${NC}"
        for pid in $node_pids; do
            kill -TERM $pid 2>/dev/null
        done
    fi
}

# Funktion zum Stoppen aller Prozesse auf Port 3000
stop_port_processes() {
    echo -e "${YELLOW}Checking for processes on port $PORT...${NC}"
    
    # Finde alle Prozesse die Port 3000 verwenden
    local port_pids=$(lsof -ti :$PORT 2>/dev/null)
    
    if [ ! -z "$port_pids" ]; then
        echo -e "${YELLOW}Found processes on port $PORT: $port_pids${NC}"
        for pid in $port_pids; do
            kill -TERM $pid 2>/dev/null
        done
        sleep 2
        
        # Force kill falls noch laufend
        for pid in $port_pids; do
            if ps -p $pid > /dev/null 2>&1; then
                kill -KILL $pid 2>/dev/null
            fi
        done
        echo -e "${GREEN}Port $PORT cleared${NC}"
    else
        echo -e "${GREEN}No processes found on port $PORT${NC}"
    fi
}

# Hauptfunktion
stop_backend() {
    local stopped=false
    
    # 1. Versuche über PID-Datei zu stoppen
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping backend with PID $PID...${NC}"
            kill -TERM $PID 2>/dev/null
            
            # Warte bis zu 5 Sekunden auf Beendigung
            for i in {1..5}; do
                if ! ps -p $PID > /dev/null 2>&1; then
                    echo -e "${GREEN}Backend PID $PID stopped${NC}"
                    stopped=true
                    break
                fi
                sleep 1
            done
            
            # Falls noch läuft, kill -9
            if ps -p $PID > /dev/null 2>&1; then
                echo -e "${YELLOW}Force stopping PID $PID...${NC}"
                kill -KILL $PID 2>/dev/null
                sleep 1
            fi
        else
            echo -e "${YELLOW}PID $PID not found, removing stale PID file${NC}"
        fi
        rm -f "$PID_FILE"
    fi
    
    # 2. Stoppe alle nx backend Prozesse
    stop_all_nx_backend
    
    # 3. Stelle sicher dass Port 3000 frei ist
    stop_port_processes
    
    # 4. Finaler Check
    if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend completely stopped${NC}"
        echo -e "${GREEN}✓ Port $PORT is free${NC}"
    else
        echo -e "${RED}Warning: Port $PORT may still be in use${NC}"
        echo -e "${YELLOW}You may need to manually kill the process or wait a moment${NC}"
    fi
    
    # Zeige letzte Log-Einträge falls vorhanden
    if [ -f "$LOG_FILE" ]; then
        echo -e "\n${YELLOW}Last 20 lines from log before shutdown:${NC}"
        tail -20 "$LOG_FILE"
    fi
}

# Hauptlogik
echo -e "${BLUE}=== Backend Stop Script ===${NC}"
stop_backend
echo -e "${BLUE}=== Done ===${NC}"