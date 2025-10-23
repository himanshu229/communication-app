// Load environment variables
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');
const cors = require('cors');

// Import MVC components
const DataService = require('./services/dataService');
const UserController = require('./controllers/userController');
const ChatController = require('./controllers/chatController');
const SocketController = require('./controllers/socketController');
const UserRoutes = require('./routes/userRoutes');
const ChatRoutes = require('./routes/chatRoutes');
const auth = require('./middleware/auth');

const app = express();

// SSL configuration for HTTPS
let server;
const useHTTPS = process.env.USE_HTTPS === 'true' || process.argv.includes('--https');

if (useHTTPS) {
  try {
    const options = {
      key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
    };
    server = https.createServer(options, app);
    console.log('HTTPS server configured');
  } catch (error) {
    console.error('SSL certificates not found, falling back to HTTP');
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

const io = socketIo(server, {
  cors: {
    origin: [
      // HTTP origins
      "http://localhost:3000",
      "http://localhost:3001", 
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://172.20.10.3:3000",
      "http://172.20.10.3:3001",
      // HTTPS origins
      "https://localhost:3000",
      "https://localhost:3001", 
      "https://127.0.0.1:3000",
      "https://127.0.0.1:3001",
      "https://172.20.10.3:3000",
      "https://172.20.10.3:3001",
      // Dynamic patterns for network IPs
      /^https?:\/\/192\.168\.\d+\.\d+:(3000|3001)$/,
      /^https?:\/\/172\.\d+\.\d+\.\d+:(3000|3001)$/,
      /^https?:\/\/10\.\d+\.\d+\.\d+:(3000|3001)$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:(3000|3001)$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [
    // HTTP origins
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://172.20.10.3:3000",
    "http://172.20.10.3:3001",
    // HTTPS origins
    "https://localhost:3000",
    "https://localhost:3001", 
    "https://127.0.0.1:3000",
    "https://127.0.0.1:3001",
    "https://172.20.10.3:3000",
    "https://172.20.10.3:3001",
    // Dynamic patterns for network IPs
    /^https?:\/\/192\.168\.\d+\.\d+:(3000|3001)$/,
    /^https?:\/\/172\.\d+\.\d+\.\d+:(3000|3001)$/,
    /^https?:\/\/10\.\d+\.\d+\.\d+:(3000|3001)$/
  ],
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Cookie']
}));
app.use(express.json());
app.use(cookieParser());

// Initialize services and controllers
const dataService = new DataService();
const userController = new UserController(dataService);
const chatController = new ChatController(dataService);
const socketController = new SocketController(io, userController, chatController);

// Clean up duplicate rooms on startup
dataService.cleanupDuplicateRooms();

// Initialize routes
const userRoutes = new UserRoutes(userController);
const chatRoutes = new ChatRoutes(chatController);

// Use routes
// Health check endpoint for SSL certificate validation
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend server is running with HTTPS',
    timestamp: new Date().toISOString(),
    protocol: req.protocol,
    secure: req.secure
  });
});

// Simple root endpoint to help with SSL certificate acceptance
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Communication App Backend</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: #10b981; }
        .info { color: #3b82f6; }
      </style>
    </head>
    <body>
      <h1 class="success">✅ Backend Server Running</h1>
      <p class="info">🔒 HTTPS SSL Certificate Accepted</p>
      <p>Protocol: ${req.protocol}</p>
      <p>Secure: ${req.secure ? 'Yes' : 'No'}</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p><strong>You can now close this tab and return to the app.</strong></p>
    </body>
    </html>
  `);
});

// Public auth endpoints remain accessible inside userRoutes (register/login)
app.use('/api', userRoutes.getRouter());
// Protect chat routes & extra endpoints
app.use('/api', auth, chatRoutes.getRouter());

// Additional API endpoints that need special handling
app.get('/api/messages/:roomId', auth, (req, res) => {
  try {
    const messages = chatController.getRoomMessages(req.params.roomId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/room/:userId1/:userId2', auth, (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const room = chatController.getRoomBetweenUsers(userId1, userId2);
    
    if (room) {
      const messages = chatController.getRoomMessages(room.id);
      res.json({ 
        success: true, 
        room,
        messages
      });
    } else {
      res.json({ 
        success: false, 
        room: null,
        messages: []
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Data reload endpoint - useful after manual JSON file edits
app.post('/api/admin/reload', auth, (req, res) => {
  try {
    dataService.reloadAllData();
    res.json({ 
      success: true, 
      message: 'Data reloaded successfully from JSON files' 
    });
  } catch (error) {
    console.error('Error reloading data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reload data' 
    });
  }
});

// Socket.io connection handling
io.on('connection', socketController.handleConnection);

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
  const protocol = useHTTPS ? 'https' : 'http';
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Local access: ${protocol}://localhost:${PORT}`);
  console.log(`Network access: ${protocol}://172.20.10.3:${PORT}`);
  console.log(`Data will be stored in: ${dataService.DATA_DIR}`);
});

// Periodic save every 30 seconds (backup)
setInterval(() => {
  dataService.saveAllData();
}, 30000);

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Saving data and shutting down gracefully...');
  dataService.saveAllData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Saving data and shutting down gracefully...');
  dataService.saveAllData();
  process.exit(0);
});