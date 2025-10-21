const { v4: uuidv4 } = require('uuid');

class ChatController {
  constructor(dataService) {
    this.dataService = dataService;
  }

  // Find or get room between two users
  getRoomBetweenUsers = (userId1, userId2) => {
    try {
      const participants = [userId1, userId2];
      
      // Find existing room between these two users
      const existingRoom = this.dataService.findRoomByParticipants(participants);

      return existingRoom;
    } catch (error) {
      console.error('Get room between users error:', error);
      return null;
    }
  };

  // Create a new chat room
  createRoom = (participants, roomName) => {
    try {
      // Check if a room already exists between these participants
      const existingRoom = this.dataService.findRoomByParticipants(participants);

      if (existingRoom) {
        console.log(`Using existing room ${existingRoom.id} for participants: ${participants.join(', ')}`);
        return existingRoom;
      } else {
        // Create new room
        const roomId = uuidv4();
        const room = {
          id: roomId,
          name: roomName || 'Chat Room',
          participants,
          createdAt: new Date()
        };
        
        this.dataService.addChatRoom(room);
        console.log(`Created new room ${room.id} for participants: ${participants.join(', ')}`);
        return room;
      }
    } catch (error) {
      console.error('Create room error:', error);
      return null;
    }
  };

  // Add message to room
  addMessage = (roomId, senderId, encryptedMessage) => {
    try {
      const messageData = {
        id: uuidv4(),
        senderId,
        message: encryptedMessage,
        timestamp: new Date(),
        roomId
      };

      this.dataService.addMessage(roomId, messageData);
      return messageData;
    } catch (error) {
      console.error('Add message error:', error);
      return null;
    }
  };

  // Get room by ID
  getRoomById = (roomId) => {
    return this.dataService.getChatRoom(roomId);
  };

  // Get room messages
  getRoomMessages(roomId) {
    return this.dataService.getMessages(roomId);
  }

  // Get all rooms for a specific user
  getUserRooms(userId) {
    const allRooms = this.dataService.getAllChatRooms();
    return allRooms.filter(room => room.participants.includes(userId));
  }

  // Delete a room and its messages
  deleteRoom(roomId) {
    const success = this.dataService.deleteRoom(roomId);
    if (success) {
      this.dataService.deleteRoomMessages(roomId);
    }
    return success;
  }
}

module.exports = ChatController;