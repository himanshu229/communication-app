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
      console.log(`User ${userId} coming online with socket ${socket.id}`);
      const user = this.userController.updateUserStatus(userId, true, socket.id);
      if (user) {
        // Store userId on socket for disconnect handling
        socket.userId = userId;
        
        // Emit to all (including sender) so the initiating client updates too
        this.io.emit('user_status_changed', {
          userId,
          isOnline: true
        });
        
        console.log(`User ${userId} (${user.name}) is now online`);
      }
    });

    // Handle user going offline (explicit logout)
    socket.on('user_offline', (userId) => {
      console.log(`User ${userId} going offline explicitly`);
      const user = this.userController.updateUserStatus(userId, false);
      if (user) {
        // Emit to all (including sender)
        this.io.emit('user_status_changed', {
          userId,
          isOnline: false
        });
        
        console.log(`User ${userId} (${user.name}) logged out`);
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

    // Handle typing indicators (emit to entire room including sender for self typing display)
    socket.on('typing', (data) => {
      this.io.to(data.roomId).emit('user_typing', {
        userId: data.userId,
        userName: data.userName,
        isTyping: data.isTyping,
        roomId: data.roomId
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      let userId = socket.userId;
      
      // If userId wasn't stored on socket, find user by socket ID
      if (!userId) {
        const allUsers = this.userController.dataService.getAllUsers();
        const user = allUsers.find(u => u.socketId === socket.id);
        userId = user?.id;
      }
      
      if (userId) {
        const user = this.userController.updateUserStatus(userId, false);
        
        if (user) {
          // Emit to all (including sender)
            this.io.emit('user_status_changed', {
            userId,
            isOnline: false
          });
          
          console.log(`User ${userId} (${user.name}) is now offline`);
        }
      } else {
        console.log('Could not identify user for disconnect event');
      }
    });
  };
}

module.exports = SocketController;