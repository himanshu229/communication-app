class SocketController {
  constructor(io, userController, chatController) {
    this.io = io;
    this.userController = userController;
    this.chatController = chatController;
  }

  handleConnection = (socket) => {
    console.log('User connected:', socket.id);

    // Handle user coming online
    socket.on('user_online', (userId) => {
      const user = this.userController.updateUserStatus(userId, true, socket.id);
      if (user) {
        // Broadcast user online status
        socket.broadcast.emit('user_status_changed', {
          userId,
          isOnline: true
        });
      }
    });

    // Handle joining a room
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // Handle sending messages
    socket.on('send_message', (data) => {
      const { roomId, message, senderId, encryptedMessage } = data;
      
      const messageData = this.chatController.addMessage(roomId, senderId, encryptedMessage);
      
      if (messageData) {
        // Send to all users in the room
        this.io.to(roomId).emit('receive_message', messageData);
      }
    });

    // Handle creating rooms
    socket.on('create_room', (data) => {
      const { participants, roomName } = data;
      
      const room = this.chatController.createRoom(participants, roomName);
      
      if (room) {
        // Join all participants to the room
        participants.forEach(participantId => {
          const user = this.userController.getUserById(participantId);
          if (user && user.socketId) {
            this.io.to(user.socketId).emit('room_created', room);
          }
        });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      socket.to(data.roomId).emit('user_typing', {
        userId: data.userId,
        userName: data.userName,
        isTyping: data.isTyping,
        roomId: data.roomId
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Find user by socket ID and mark as offline
      const allUsers = this.userController.dataService.getAllUsers();
      const user = allUsers.find(u => u.socketId === socket.id);
      
      if (user) {
        this.userController.updateUserStatus(user.id, false);
        
        // Broadcast user offline status
        socket.broadcast.emit('user_status_changed', {
          userId: user.id,
          isOnline: false
        });
      }
    });
  };
}

module.exports = SocketController;