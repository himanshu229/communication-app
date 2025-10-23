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

    // Call-related handlers
    socket.on('initiate_call', (data) => {
      console.log(`Call initiated from ${data.from} to ${data.to}:`, data);
      const targetUser = this.userController.getUserById(data.to);
      
      if (targetUser && targetUser.socketId && targetUser.isOnline) {
        this.io.to(targetUser.socketId).emit('incoming_call', {
          from: data.from,
          fromName: data.fromName,
          callType: data.callType,
          roomId: data.roomId
        });
      } else {
        // User is offline or not found
        this.io.to(socket.id).emit('call_failed', {
          reason: 'User is offline or not found'
        });
      }
    });

    socket.on('answer_call', (data) => {
      console.log(`Call answered by ${data.from} to ${data.to}:`, data);
      const targetUser = this.userController.getUserById(data.to);
      
      if (targetUser && targetUser.socketId) {
        this.io.to(targetUser.socketId).emit('call_accepted', {
          from: data.from
        });
      }
    });

    socket.on('reject_call', (data) => {
      console.log(`Call rejected by ${data.from} to ${data.to}:`, data);
      const targetUser = this.userController.getUserById(data.to);
      
      if (targetUser && targetUser.socketId) {
        this.io.to(targetUser.socketId).emit('call_rejected', {
          from: data.from
        });
      }
    });

    socket.on('end_call', (data) => {
      console.log(`Call ended by ${data.from} to ${data.to}:`, data);
      const targetUser = this.userController.getUserById(data.to);
      
      if (targetUser && targetUser.socketId) {
        this.io.to(targetUser.socketId).emit('call_ended', {
          from: data.from
        });
      }
    });

    // WebRTC signaling handlers
    socket.on('call_offer', (data) => {
      console.log(`WebRTC offer from ${data.from} to ${data.to}`);
      const targetUser = this.userController.getUserById(data.to);
      
      if (targetUser && targetUser.socketId) {
        this.io.to(targetUser.socketId).emit('call_offer', {
          from: data.from,
          signal: data.signal,
          callType: data.callType
        });
      }
    });

    socket.on('call_answer', (data) => {
      console.log(`WebRTC answer from ${data.from} to ${data.to}`);
      const targetUser = this.userController.getUserById(data.to);
      
      if (targetUser && targetUser.socketId) {
        this.io.to(targetUser.socketId).emit('call_answer', {
          from: data.from,
          signal: data.signal
        });
      }
    });

    socket.on('ice_candidate', (data) => {
      console.log(`ICE candidate from ${data.from} to ${data.to}`);
      const targetUser = this.userController.getUserById(data.to);
      
      if (targetUser && targetUser.socketId) {
        this.io.to(targetUser.socketId).emit('ice_candidate', {
          from: data.from,
          candidate: data.candidate
        });
      }
    });

    socket.on('call_status_update', (data) => {
      console.log(`Call status update from ${data.from} to ${data.to}:`, data.status);
      const targetUser = this.userController.getUserById(data.to);
      
      if (targetUser && targetUser.socketId) {
        this.io.to(targetUser.socketId).emit('call_status_update', {
          from: data.from,
          status: data.status
        });
      }
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