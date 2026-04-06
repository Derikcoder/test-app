#!/bin/bash

##############################################################################
# Development Startup Script
# Starts MongoDB, backend server, and frontend client in parallel
# 
# Usage: ./start-dev.sh
# Or: npm run dev
##############################################################################

set -e

ROOT_DIR="$(pwd)"
USER_MONGO_PID_FILE="$ROOT_DIR/.mongodb/mongod.pid"
MONGOD_USER_MODE_STARTED=0

echo "🚀 Starting Field Service Management System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Resolve local protocol display based on env flags
SERVER_PROTOCOL="http"
CLIENT_PROTOCOL="http"
if [[ -f "server/.env" ]] && grep -Eq '^SSL_ENABLED=true' server/.env; then
  SERVER_PROTOCOL="https"
fi
if [[ -f "client/.env" ]] && grep -Eq '^VITE_SSL_ENABLED=true' client/.env; then
  CLIENT_PROTOCOL="https"
fi

# Trap to kill all background processes on exit
cleanup() {
  kill $(jobs -p) 2>/dev/null || true

  # Only stop user-mode mongod instances started by this script.
  if [[ "$MONGOD_USER_MODE_STARTED" -eq 1 ]] && [[ -f "$USER_MONGO_PID_FILE" ]]; then
    local mongod_pid
    mongod_pid="$(cat "$USER_MONGO_PID_FILE" 2>/dev/null || true)"
    if [[ -n "$mongod_pid" ]] && kill -0 "$mongod_pid" 2>/dev/null; then
      kill "$mongod_pid" 2>/dev/null || true
    fi
    rm -f "$USER_MONGO_PID_FILE"
  fi
}
trap cleanup EXIT

# Function to check if port is available
check_port() {
  if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -ne "${YELLOW}⚠️  Port $1 is already in use. ${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Startup cancelled."
      exit 1
    fi
  fi
}

start_system_mongodb() {
  if ! command -v systemctl >/dev/null 2>&1; then
    return 1
  fi

  if ! systemctl list-unit-files 2>/dev/null | grep -q '^mongod\.service'; then
    return 1
  fi

  if sudo -n true >/dev/null 2>&1; then
    sudo systemctl start mongod
    return 0
  fi

  echo -e "${YELLOW}ℹ️  Skipping system MongoDB start (sudo privileges unavailable).${NC}"
  return 1
}

start_user_mode_mongodb() {
  if ! command -v mongod >/dev/null 2>&1; then
    return 1
  fi

  mkdir -p "$ROOT_DIR/.mongodb/data" "$ROOT_DIR/.mongodb/logs"

  mongod \
    --dbpath "$ROOT_DIR/.mongodb/data" \
    --bind_ip 127.0.0.1 \
    --port 27017 \
    --logpath "$ROOT_DIR/.mongodb/logs/mongod.log" \
    --pidfilepath "$USER_MONGO_PID_FILE" \
    --fork
}

# Check if ports are available
echo "Checking ports..."
check_port 5000  # Backend
check_port 3000  # Frontend
echo ""

# Start MongoDB
echo -e "${BLUE}📦 Starting MongoDB...${NC}"
if ! pgrep -x "mongod" > /dev/null 2>&1; then
  if start_system_mongodb; then
    echo -e "${GREEN}✓ MongoDB system service started${NC}"
  elif start_user_mode_mongodb; then
    MONGOD_USER_MODE_STARTED=1
    echo -e "${GREEN}✓ MongoDB started in user mode (${ROOT_DIR}/.mongodb)${NC}"
  else
    echo -e "${YELLOW}⚠️  Could not start MongoDB service.${NC}"
    echo "   Make sure MongoDB is installed: ./install-mongodb.sh"
    read -p "Continue without MongoDB? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
else
  echo -e "${GREEN}✓ MongoDB is already running${NC}"
fi
echo ""

# Start Backend Server
echo -e "${BLUE}🔧 Starting Backend Server (port 5000)...${NC}"
cd server
npm run dev &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Wait a moment for backend to start
sleep 2

# Start Frontend Client
echo -e "${BLUE}⚛️  Starting Frontend Client (port 3000)...${NC}"
cd ../client
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""

# Return to root
cd ..

echo "=================================="
echo -e "${GREEN}✅ All services started!${NC}"
echo "=================================="
echo ""
echo "📍 Services running:"
echo "   • MongoDB      → mongodb://localhost:27017"
echo "   • Backend  API → ${SERVER_PROTOCOL}://localhost:5000"
echo "   • Frontend App → ${CLIENT_PROTOCOL}://localhost:3000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep the script running and show logs
wait
