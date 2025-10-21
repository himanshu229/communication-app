const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Import MVC components
const DataService = require('./services/dataService');
const UserController = require('./controllers/userController');
const ChatController = require('./controllers/chatController');
const SocketController = require('./controllers/socketController');
const UserRoutes = require('./routes/userRoutes');
const ChatRoutes = require('./routes/chatRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
   origin: "*",
  credentials: true
}));
app.use(express.json());

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
app.use('/api', userRoutes.getRouter());
app.use('/api', chatRoutes.getRouter());

// Additional API endpoints that need special handling
app.get('/api/messages/:roomId', (req, res) => {
  try {
    const messages = chatController.getRoomMessages(req.params.roomId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/room/:userId1/:userId2', (req, res) => {
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
app.post('/api/admin/reload', (req, res) => {
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
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