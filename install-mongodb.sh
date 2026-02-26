cd client
npm install#!/bin/bash

echo "🔧 MongoDB Installation Script"
echo "=============================="
echo ""

# Check if MongoDB is already installed
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB is already installed"
    mongod --version
    echo ""
    echo "Checking MongoDB status..."
    sudo systemctl status mongodb --no-pager || sudo systemctl status mongod --no-pager || echo "⚠️  MongoDB service not running"
    echo ""
    echo "To start MongoDB:"
    echo "  sudo systemctl start mongodb"
    echo "  OR"
    echo "  sudo systemctl start mongod"
    exit 0
fi

echo "📦 Installing MongoDB..."
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
fi

echo "Detected OS: $OS"
echo ""

# Ubuntu/Debian Installation
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    echo "Installing MongoDB for Ubuntu/Debian..."
    
    sudo apt-get update
    sudo apt-get install -y mongodb
    
    echo ""
    echo "✅ MongoDB installed successfully!"
    echo ""
    echo "Starting MongoDB service..."
    sudo systemctl start mongodb
    sudo systemctl enable mongodb
    
    echo ""
    echo "MongoDB status:"
    sudo systemctl status mongodb --no-pager
    
    echo ""
    echo "✅ MongoDB is now running!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your server: cd server && npm run dev"
    echo "2. MongoDB will connect automatically"
    
else
    echo "❌ Unsupported OS: $OS"
    echo ""
    echo "Please install MongoDB manually:"
    echo "Visit: https://docs.mongodb.com/manual/installation/"
    echo ""
    echo "OR use MongoDB Atlas (free cloud database):"
    echo "1. Sign up at https://www.mongodb.com/cloud/atlas"
    echo "2. Create a free cluster"
    echo "3. Get your connection string"
    echo "4. Update server/.env with your connection string"
    exit 1
fi

# VITE_GOOGLE_MAPS_API_KEY removed for security
