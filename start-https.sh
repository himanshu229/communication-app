#!/bin/bash

echo "🚀 Starting Communication App with HTTPS for camera access..."
echo ""

# Get the network IP
NETWORK_IP=$(ifconfig | grep -E "inet.*broadcast" | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "📡 Network IP detected: $NETWORK_IP"
echo ""

# Start backend with HTTPS
echo "🔧 Starting backend server with HTTPS..."
cd backend
USE_HTTPS=true HOST=0.0.0.0 npm start &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend with HTTPS
echo "🌐 Starting frontend with HTTPS..."
cd frontend
HTTPS=true HOST=0.0.0.0 npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers starting..."
echo "📱 Backend HTTPS: https://localhost:5001"
echo "📱 Frontend HTTPS: https://localhost:3000"
echo "🌐 Network Access: https://$NETWORK_IP:3000"
echo ""
echo "⚠️  You may see SSL warnings - click 'Advanced' and 'Proceed' to accept self-signed certificates"
echo "📹 HTTPS is required for camera/microphone access on network devices"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Wait for both processes
wait