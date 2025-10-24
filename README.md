# Communication App - Video Calling & Chat

A modern, secure chat application with **video calling capabilities** built with React.js and Node.js featuring end-to-end encryption for private communications.

## 🎯 Key Features

🎥 **Video & Voice Calls** - WebRTC-powered real-time video and audio calling
� **Mobile Responsive** - Optimized for mobile devices with touch-friendly controls  
�🔐 **End-to-End Encryption** - All messages are encrypted on the client side using AES encryption
👥 **Multi-User Chat** - Support for one-on-one conversations
 **Real-time Status** - See when users are online/offline
⚡ **Live Typing Indicators** - Know when someone is typing
🌐 **Network Ready** - Access from multiple devices on same WiFi network

## 🚀 Quick Start (Network Access Enabled by Default)

Both servers are now configured to allow network access automatically:

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm start
```

**Access URLs:**
- Local: http://localhost:3000
- Network: http://YOUR_IP:3000 (shown in React terminal output)

## � Video Calling Features

- **Call Types**: Both video and voice calls supported
- **Mobile Optimized**: Auto-hiding controls, camera switching, fullscreen mode
- **Call Controls**: Mute, video toggle, speaker toggle, end call
- **WebRTC**: Peer-to-peer real-time communication
- **Cross-Device**: Call between phones, tablets, computers on same network

## Technology Stack

### Backend
- Node.js
- Express.js
- Socket.io (Real-time communication)
- CORS (Cross-origin resource sharing)
- UUID (Unique identifier generation)

### Frontend
- React.js
- Socket.io-client
- Crypto-JS (Encryption/Decryption)
- Lucide React (Icons)
- CSS3 with modern animations

## Security Features

- **Client-side Encryption**: Messages are encrypted before being sent to the server
- **AES Encryption**: Industry-standard encryption algorithm
- **Secure Key Management**: Encryption keys are managed securely
- **No Plain Text Storage**: Messages are stored in encrypted format in JSON files
- **Input Validation**: Server-side validation for phone numbers and names
- **Data Persistence Security**: Encrypted messages remain encrypted in storage

## Data Storage

The application now uses **JSON file storage** for persistence:

### Data Files Location
```
backend/data/
├── users.json       # User accounts and profiles
├── chatRooms.json   # Chat room information
└── messages.json    # All encrypted messages
```

### Features
- **Automatic Saving**: Data is saved immediately when changes occur
- **Periodic Backups**: Additional saves every 30 seconds
- **Graceful Shutdown**: Data is safely saved when server stops
- **Error Handling**: Robust file I/O with fallback mechanisms
- **Data Persistence**: All data survives server restarts

### Data Structure
- **Users**: Store user ID, name, phone number, online status, and last seen
- **Chat Rooms**: Room ID, participants, room name, and creation date
- **Messages**: Encrypted message content, sender, timestamp, and room association

### Data Files Location
```
backend/data/
├── users.json       # User accounts and profiles
├── chatRooms.json   # Chat room information
└── messages.json    # All encrypted messages
```

### Features
- **Automatic Saving**: Data is saved immediately when changes occur
- **Periodic Backups**: Additional saves every 30 seconds
- **Graceful Shutdown**: Data is safely saved when server stops
- **Error Handling**: Robust file I/O with fallback mechanisms
- **Data Persistence**: All data survives server restarts

### Data Structure
- **Users**: Store user ID, name, phone number, online status, and last seen
- **Chat Rooms**: Room ID, participants, room name, and creation date
- **Messages**: Encrypted message content, sender, timestamp, and room association

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git (for version control)

### Clone Repository (if using Git)

```bash
git clone <repository-url>
cd communication-app
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm start
```
The server will run on http://localhost:5001

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```
The application will open at http://localhost:3001

## Usage Guide

### Registration/Login
1. Open the application in your browser
2. Choose "Register" to create a new account or "Login" for existing users
3. Enter your name and phone number
4. Click "Create Account" or "Login"

### Starting a Chat
1. After login, click the "Start New Chat" button or the "+" icon
2. Select one or more users from the list
3. Click "Create Chat" to start the conversation
4. Begin sending encrypted messages!

### Chat Features
- **Send Messages**: Type in the input field and press Enter or click the send button
- **Real-time Updates**: See messages appear instantly
- **Typing Indicators**: Watch typing indicators when others are composing messages
- **Online Status**: Green dot indicates online users
- **Message Encryption**: All messages are automatically encrypted

## Project Structure

```
communication-app/
├── backend/
│   ├── data/
│   │   ├── users.json
│   │   ├── chatRooms.json
│   │   └── messages.json
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth.js
│   │   │   ├── Auth.css
│   │   │   ├── Chat.js
│   │   │   └── Chat.css
│   │   ├── utils/
│   │   │   └── encryption.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## API Endpoints

### REST API
- `POST /api/register` - Register a new user
- `POST /api/login` - Login existing user
- `GET /api/users` - Get all users
- `GET /api/messages/:roomId` - Get messages for a room

### Socket.io Events
- `user_online` - Notify server user is online
- `join_room` - Join a chat room
- `send_message` - Send a message
- `receive_message` - Receive a message
- `create_room` - Create a new chat room
- `typing` - Typing indicator
- `user_status_changed` - User online/offline status

## Security Considerations

⚠️ **Important for Production:**

1. **Change Encryption Key**: Update the encryption key in `frontend/src/utils/encryption.js`
2. **Use HTTPS**: Deploy with SSL certificates
3. **Database**: Replace in-memory storage with a proper database
4. **Authentication**: Implement proper JWT-based authentication
5. **Input Validation**: Add comprehensive input validation
6. **Rate Limiting**: Implement rate limiting for API endpoints
7. **Environment Variables**: Use environment variables for sensitive data

## Development

### Version Control with Git

This project uses Git for version control. Important files that are excluded from version control:

**Excluded from Git (.gitignore):**
- `node_modules/` - Package dependencies
- `package-lock.json` - Lock files (optional)
- `.env*` - Environment variables
- `build/` & `dist/` - Build outputs
- `logs/` - Log files
- `*.log` - Individual log files
- `.DS_Store` - macOS system files

**Git Commands:**
```bash
# Check status
git status

# Add files
git add .

# Commit changes
git commit -m "Your commit message"

# Push to remote
git push origin main

# Pull latest changes
git pull origin main
```

### Running in Development Mode

Backend (with auto-restart):
```bash
cd backend
npm start
```

Frontend (with hot reload):
```bash
cd frontend
npm start
```

### Building for Production

```bash
cd frontend
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please create an issue in the repository.

---

**Note**: This is a demonstration application. For production use, implement additional security measures and proper database storage.




<!-- there are mutiple issue 
1 issue the video is capuring but not steaming 
2 issue if I will click on answer then still ringtone 
3 issue sometime ringtone.mp ring otherwise it taking beep sound I don't want beep soucd 
4) issue if am cutting the call the system camera should also disconnect and off 
5) if I am cutting the call then both side disconnect the call  -->