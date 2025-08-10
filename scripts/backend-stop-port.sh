#!/bin/bash

# Script to stop backend services running on port 3000

echo "Stopping backend services on port 3000..."

# Find processes using port 3000
PIDS=$(lsof -ti :3000 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "No process found on port 3000"
    exit 0
fi

echo "Found processes on port 3000: $PIDS"

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

# Also stop any nx serve backend processes
NX_PIDS=$(ps aux | grep "nx serve backend" | grep -v grep | awk '{print $2}')
if [ ! -z "$NX_PIDS" ]; then
    echo "Stopping nx serve backend processes: $NX_PIDS"
    for PID in $NX_PIDS; do
        kill -TERM $PID 2>/dev/null
    done
fi

echo "Backend services on port 3000 stopped successfully"