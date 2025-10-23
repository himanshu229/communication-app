#!/bin/bash

# Network Communication App Startup Script
echo "🚀 Starting Communication App for Network Access..."

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)

echo "📡 Local IP Address: $LOCAL_IP"
echo "🌐 Backend will be available at: http://$LOCAL_IP:5001"
echo "🌐 Frontend will be available at: http://$LOCAL_IP:3000"
echo ""

# Kill any existing processes on these ports
echo "🔄 Cleaning up existing processes..."
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🔧 Starting frontend server..."
cd ../frontend
HOST=0.0.0.0 npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Servers starting..."
echo "🔗 Access the app from other devices at: http://$LOCAL_IP:3000"
echo "📱 Make sure devices are on the same network"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap 'echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait