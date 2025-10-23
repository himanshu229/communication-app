#!/bin/bash

# Get the network IP
NETWORK_IP=$(ifconfig | grep -E "inet.*broadcast" | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "🔒 SSL Certificate Setup for Communication App"
echo "=============================================="
echo ""
echo "To enable camera access over HTTPS, you need to accept SSL certificates."
echo ""
echo "📋 Steps to Accept SSL Certificates:"
echo ""
echo "1. Backend Certificate (Required First):"
echo "   🌐 Open: https://localhost:5001"
echo "   📱 Network: https://$NETWORK_IP:5001"
echo "   ⚠️  Click 'Advanced' → 'Proceed to localhost (unsafe)'"
echo ""
echo "2. Frontend Certificate:"
echo "   🌐 Open: https://localhost:3000"
echo "   📱 Network: https://$NETWORK_IP:3000"
echo "   ⚠️  Click 'Advanced' → 'Proceed to localhost (unsafe)'"
echo ""
echo "3. Test on Mobile/Other Devices:"
echo "   📱 Use: https://$NETWORK_IP:3000"
echo "   📹 Camera access will work after accepting certificates"
echo ""
echo "💡 Pro Tip: Do the backend certificate first, then frontend will work smoothly!"
echo ""

# Function to open URLs automatically
read -p "🚀 Would you like me to open these URLs automatically? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Opening backend URL..."
    open "https://localhost:5001"
    
    sleep 2
    
    echo "Opening frontend URL..."
    open "https://localhost:3000"
    
    echo "✅ URLs opened! Accept the certificates in each tab."
fi

echo ""
echo "🎯 Once certificates are accepted:"
echo "   • Video calls will work with camera access"
echo "   • Voice calls will have audio transmission"
echo "   • Network devices can join calls securely"
echo ""