#!/bin/bash

##############################################################################
# Development Startup Script
# Starts MongoDB, backend server, and frontend client in parallel
# 
# Usage: ./start-dev.sh
# Or: npm run dev
##############################################################################

set -e

echo "🚀 Starting Field Service Management System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Trap to kill all background processes on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

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

# Check if ports are available
echo "Checking ports..."
check_port 5000  # Backend
check_port 3000  # Frontend
echo ""

# Start MongoDB
echo -e "${BLUE}📦 Starting MongoDB...${NC}"
if ! pgrep -x "mongod" > /dev/null 2>&1; then
  sudo systemctl start mongod 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not start MongoDB service.${NC}"
    echo "   Make sure MongoDB is installed: ./install-mongodb.sh"
    read -p "Continue without MongoDB? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  }
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
echo "   • Backend  API → https://localhost:5000"
echo "   • Frontend App → https://localhost:3000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep the script running and show logs
wait
