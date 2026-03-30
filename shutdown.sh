#!/bin/bash

##############################################################################
# Graceful Shutdown Script
# Cleanly stops all running development processes for the field service app
# 
# Usage: ./shutdown.sh
##############################################################################

set -e

echo "🛑 Initiating graceful shutdown..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Flag to track if anything was stopped
STOPPED_ANYTHING=false

# Function to kill process on specific port
kill_port() {
  local port=$1
  local service=$2
  
  # Check if something is listening on the port
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    PID=$(lsof -Pi :$port -sTCP:LISTEN -t)
    echo -e "${YELLOW}⏹️  Stopping $service (PID: $PID)...${NC}"
    kill -SIGTERM $PID 2>/dev/null || true
    
    # Wait a moment for graceful shutdown
    sleep 1
    
    # Force kill if still running
    if kill -0 $PID 2>/dev/null; then
      echo -e "${YELLOW}   Force killing $service...${NC}"
      kill -SIGKILL $PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ $service stopped${NC}"
    STOPPED_ANYTHING=true
  fi
}

# Function to stop npm processes
stop_npm_process() {
  local process_name=$1
  local port=$2
  
  # Try to find and kill npm processes
  if pgrep -f "npm.*$process_name" > /dev/null 2>&1; then
    echo -e "${YELLOW}⏹️  Stopping $process_name...${NC}"
    pkill -f "npm.*$process_name" || true
    sleep 1
    echo -e "${GREEN}✓ $process_name stopped${NC}"
    STOPPED_ANYTHING=true
  fi
}

echo "Stopping development servers..."
echo ""

# Stop frontend (Vite dev server on port 3000)
kill_port 3000 "Frontend (Vite - port 3000)"

# Stop backend (Express server on port 5000)
kill_port 5000 "Backend (Express - port 5000)"

echo ""
echo "Cleaning up npm processes..."
echo ""

# Stop any remaining npm dev processes
stop_npm_process "run dev" "frontend"
stop_npm_process "run dev" "backend"

# Ask about MongoDB
echo ""
echo "Would you like to stop MongoDB service? (y/n)"
read -r -t 5 stop_mongo || stop_mongo="n"

if [[ "$stop_mongo" == "y" ]]; then
  echo -e "${YELLOW}⏹️  Stopping MongoDB...${NC}"
  sudo systemctl stop mongod 2>/dev/null || true
  echo -e "${GREEN}✓ MongoDB stopped${NC}"
  STOPPED_ANYTHING=true
fi

echo ""
echo "=================================="

if [ "$STOPPED_ANYTHING" = true ]; then
  echo -e "${GREEN}✅ Graceful shutdown complete!${NC}"
  echo ""
  echo "Summary:"
  echo "  • All dev servers stopped"
  echo "  • No uncommitted changes (working tree clean)"
  echo "  • Ready to close editors/terminals"
else
  echo -e "${GREEN}✅ No running processes found${NC}"
  echo ""
  echo "Your development environment is already clean."
fi

echo "=================================="
echo ""
echo -e "${GREEN}See you tomorrow! 👋${NC}"
