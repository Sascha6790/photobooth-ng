#!/bin/bash

# Script to stop frontend services running on port 4200

echo "Stopping frontend services on port 4200..."

# Find processes using port 4200
PIDS=$(lsof -ti :4200 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "No process found on port 4200"
    exit 0
fi

echo "Found processes on port 4200: $PIDS"

# Try graceful shutdown first
for PID in $PIDS; do
    if ps -p $PID > /dev/null 2>&1; then
        echo "Stopping process $PID..."
        kill -TERM $PID 2>/dev/null
    fi
done

# Wait a bit for graceful shutdown
sleep 2

# Check if any processes are still running and force kill if necessary
for PID in $PIDS; do
    if ps -p $PID > /dev/null 2>&1; then
        echo "Force killing process $PID..."
        kill -KILL $PID 2>/dev/null
    fi
done

# Also stop any nx serve frontend processes
NX_PIDS=$(ps aux | grep "nx serve frontend" | grep -v grep | awk '{print $2}')
if [ ! -z "$NX_PIDS" ]; then
    echo "Stopping nx serve frontend processes: $NX_PIDS"
    for PID in $NX_PIDS; do
        kill -TERM $PID 2>/dev/null
    done
fi

echo "Frontend services on port 4200 stopped successfully"