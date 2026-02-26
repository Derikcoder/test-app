#!/bin/bash

# setup-and-run.sh
# Comprehensive setup and startup script for MERN Field Service Management Application
# This script sets up the environment, installs dependencies, and starts all services

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main script starts here
print_header "MERN Field Service Management - Setup & Run"

# Step 1: Check Prerequisites
print_header "Step 1: Checking Prerequisites"

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js (v16 or higher) from https://nodejs.org/"
    exit 1
fi
print_success "Node.js $(node --version) found"

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm"
    exit 1
fi
print_success "npm $(npm --version) found"

if ! command_exists mongod; then
    print_warning "MongoDB is not installed"
    echo -e "\nWould you like to install MongoDB now? (y/n)"
    read -r install_mongo
    if [[ "$install_mongo" =~ ^[Yy]$ ]]; then
        if [[ -f "./install-mongodb.sh" ]]; then
            print_success "Found install-mongodb.sh script. Running it..."
            chmod +x ./install-mongodb.sh
            ./install-mongodb.sh
        else
            print_error "install-mongodb.sh script not found. Please install MongoDB manually."
            print_warning "Visit: https://www.mongodb.com/docs/manual/installation/"
            exit 1
        fi
    else
        print_error "MongoDB is required. Exiting."
        exit 1
    fi
else
    print_success "MongoDB found"
fi

# Step 2: Check/Create Environment Files
print_header "Step 2: Setting Up Environment Variables"

# Check server .env
if [[ ! -f "server/.env" ]]; then
    print_warning "server/.env not found. Creating template..."
    cat > server/.env << 'EOF'
PORT=5000
MONGO_URI=mongodb://localhost:27017/field-service-db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
EOF
    print_success "Created server/.env with default values"
    print_warning "⚠ IMPORTANT: Update JWT_SECRET in server/.env before production!"
else
    print_success "server/.env exists"
fi

# Check client .env
if [[ ! -f "client/.env" ]]; then
    print_warning "client/.env not found. Creating template..."
    cat > client/.env << 'EOF'
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
EOF
    print_success "Created client/.env with default values"
    print_warning "⚠ IMPORTANT: Add your Google Maps API key to client/.env!"
else
    print_success "client/.env exists"
fi

# Step 3: Install Dependencies
print_header "Step 3: Installing Dependencies"

# Install root dependencies
if [[ -f "package.json" ]]; then
    print_success "Installing root dependencies..."
    npm install
fi

# Install server dependencies
if [[ -d "server" && -f "server/package.json" ]]; then
    print_success "Installing server dependencies..."
    cd server
    npm install
    cd ..
fi

# Install client dependencies
if [[ -d "client" && -f "client/package.json" ]]; then
    print_success "Installing client dependencies..."
    cd client
    npm install
    cd ..
fi

print_success "All dependencies installed successfully!"

# Step 4: Start MongoDB
print_header "Step 4: Starting MongoDB"

# Check if MongoDB is already running
if pgrep -x "mongod" > /dev/null; then
    print_success "MongoDB is already running"
else
    print_success "Starting MongoDB..."
    
    # Try to start MongoDB using systemctl (systemd)
    if command_exists systemctl; then
        sudo systemctl start mongod
        if systemctl is-active --quiet mongod; then
            print_success "MongoDB started successfully via systemctl"
        else
            print_warning "Failed to start MongoDB via systemctl. Trying manual start..."
            mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /var/lib/mongodb
        fi
    else
        # Fallback to manual start
        print_warning "systemctl not found. Starting MongoDB manually..."
        mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /var/lib/mongodb
    fi
    
    # Wait a moment for MongoDB to start
    sleep 2
    
    if pgrep -x "mongod" > /dev/null; then
        print_success "MongoDB is now running"
    else
        print_error "Failed to start MongoDB. Please start it manually."
        exit 1
    fi
fi

# Step 5: Start the Backend Server
print_header "Step 5: Starting Backend Server"

cd server
print_success "Starting Express server on port 5000..."
npm run dev &
SERVER_PID=$!
cd ..

# Wait a moment for server to start
sleep 3

if kill -0 $SERVER_PID 2>/dev/null; then
    print_success "Backend server started successfully (PID: $SERVER_PID)"
else
    print_error "Failed to start backend server"
    exit 1
fi

# Step 6: Start the Frontend Client
print_header "Step 6: Starting Frontend Client"

cd client
print_success "Starting Vite development server on port 3000..."
npm run dev &
CLIENT_PID=$!
cd ..

# Wait a moment for client to start
sleep 3

if kill -0 $CLIENT_PID 2>/dev/null; then
    print_success "Frontend client started successfully (PID: $CLIENT_PID)"
else
    print_error "Failed to start frontend client"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Final Success Message
print_header "Setup Complete! 🚀"

echo -e "${GREEN}All services are running:${NC}"
echo -e "  ${BLUE}•${NC} MongoDB:        mongodb://localhost:27017"
echo -e "  ${BLUE}•${NC} Backend Server: http://localhost:5000"
echo -e "  ${BLUE}•${NC} Frontend Client: http://localhost:3000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Trap Ctrl+C to cleanup processes
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $CLIENT_PID 2>/dev/null
    kill $SERVER_PID 2>/dev/null
    print_success "All services stopped. Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running and show logs
wait
