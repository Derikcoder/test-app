#!/bin/bash
# refresh.sh — Stop and restart backend + frontend dev servers
#
# ⚠️  DEV ONLY — REMOVE THIS SCRIPT BEFORE GOING TO PRODUCTION

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛑 Stopping existing processes..."
pkill -f "node server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

echo "🚀 Starting backend..."
cd "$SCRIPT_DIR/server"
setsid node server.js > /tmp/server.log 2>&1 &
disown

sleep 3
if ss -tlnp | grep -q ':5000'; then
  echo "✅ Backend running on http://localhost:5000"
else
  echo "❌ Backend failed to start — check /tmp/server.log"
  exit 1
fi

echo "🚀 Starting frontend..."
cd "$SCRIPT_DIR/client"
setsid node node_modules/.bin/vite > /tmp/client.log 2>&1 &
disown

sleep 4
if ss -tlnp | grep -q ':3000'; then
  echo "✅ Frontend running on http://localhost:3000"
else
  echo "❌ Frontend failed to start — check /tmp/client.log"
  exit 1
fi

echo ""
echo "✅ All services running."
echo "   Frontend : http://localhost:3000"
echo "   Backend  : http://localhost:5000"
echo ""
echo "⚠️  Reminder: remove refresh.sh before going to production!"
