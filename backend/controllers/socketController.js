class SocketController {
  constructor(io, userController, chatController, callController) {
    this.io = io;
    this.userController = userController;
    this.chatController = chatController;
    this.callController = callController;
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

    // New Call System Handlers
    socket.on('initiate_call', (data) => {
      if (!data || !data.from || !data.to) {
        console.log('Invalid initiate_call data received:', data);
        return;
      }
      
      console.log(`Call initiated from ${data.from} to ${data.to}:`, data);
      
      // Use call controller to initiate call
      const result = this.callController.initiateCall(
        data.from,
        data.to,
        data.callType,
        data.roomId
      );
      
      if (result.success) {
        // Send incoming call to target user only
        const targetUser = this.userController.getUserById(data.to);
        if (targetUser && targetUser.socketId && targetUser.isOnline) {
          this.io.to(targetUser.socketId).emit('incoming_call', {
            callId: result.callData.id,
            callerId: data.from,
            callerName: result.callData.callerName,
            callType: data.callType,
            roomId: data.roomId
          });
          
          // Send success confirmation to caller
          this.io.to(socket.id).emit('call_initiated', {
            callId: result.callData.id,
            success: true
          });
        } else {
          // User is offline or not found
          this.io.to(socket.id).emit('call_failed', {
            reason: 'User is offline or not found'
          });
        }
      } else {
        // Send error back to caller
        this.io.to(socket.id).emit('call_failed', {
          reason: result.error
        });
      }
    });

    socket.on('accept_call', (data) => {
      if (!data || !data.callId || !data.userId) {
        console.log('Invalid accept_call data received:', data);
        return;
      }
      
      console.log(`Call accepted by ${data.userId} for call ${data.callId}`);
      
      // Use call controller to accept call
      const result = this.callController.acceptCall(data.callId, data.userId);
      
      if (result.success) {
        // Notify caller that call was accepted
        const caller = this.userController.getUserById(result.callData.callerId);
        if (caller && caller.socketId) {
          this.io.to(caller.socketId).emit('call_accepted', {
            callId: data.callId,
            calleeId: data.userId
          });
        }
      } else {
        // Send error back to callee
        this.io.to(socket.id).emit('call_failed', {
          reason: result.error
        });
      }
    });

    socket.on('reject_call', (data) => {
      if (!data || !data.callId || !data.userId) {
        console.log('Invalid reject_call data received:', data);
        return;
      }
      
      console.log(`Call rejected by ${data.userId} for call ${data.callId}`);
      
      // Use call controller to reject call
      const result = this.callController.rejectCall(data.callId, data.userId);
      
      if (result.success) {
        // Notify caller that call was rejected
        const caller = this.userController.getUserById(result.callData.callerId);
        if (caller && caller.socketId) {
          this.io.to(caller.socketId).emit('call_rejected', {
            callId: data.callId,
            calleeId: data.userId
          });
        }
      } else {
        // Send error back to callee
        this.io.to(socket.id).emit('call_failed', {
          reason: result.error
        });
      }
    });

    socket.on('end_call', (data) => {
      if (!data || !data.callId || !data.userId) {
        console.log('Invalid end_call data received:', data);
        return;
      }
      
      console.log(`Call ended by ${data.userId} for call ${data.callId}`);
      
      // Use call controller to end call
      const result = this.callController.endCall(data.callId, data.userId);
      
      if (result.success) {
        // Notify the other participant
        const otherUserId = result.callData.callerId === data.userId ? 
          result.callData.calleeId : result.callData.callerId;
        const otherUser = this.userController.getUserById(otherUserId);
        
        if (otherUser && otherUser.socketId) {
          this.io.to(otherUser.socketId).emit('call_ended', {
            callId: data.callId,
            endedBy: data.userId
          });
        }
      } else {
        // Send error back to user
        this.io.to(socket.id).emit('call_failed', {
          reason: result.error
        });
      }
    });

    // WebRTC signaling handlers (for direct peer-to-peer communication)
    socket.on('call_offer', (data) => {
      if (!data || !data.from || !data.to) {
        console.log('Invalid call_offer data received:', data);
        return;
      }
      
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
      if (!data || !data.from || !data.to) {
        console.log('Invalid call_answer data received:', data);
        return;
      }
      
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
      if (!data || !data.from || !data.to) {
        console.log('Invalid ice_candidate data received:', data);
        return;
      }
      
      console.log(`ICE candidate from ${data.from} to ${data.to}`);
      const targetUser = this.userController.getUserById(data.to);
      
      if (targetUser && targetUser.socketId) {
        this.io.to(targetUser.socketId).emit('ice_candidate', {
          from: data.from,
          candidate: data.candidate
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
          // Clean up any active calls for this user
          this.callController.cleanupUserCalls(userId);
          
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