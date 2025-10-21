const express = require('express');

class ChatRoutes {
  constructor(chatController) {
    this.chatController = chatController;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes = () => {
    // Create room route
    this.router.post('/room', (req, res) => {
      try {
        const { participants, roomName } = req.body;
        const room = this.chatController.createRoom(participants, roomName);
        res.status(200).json({ success: true, room });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Get room by ID route
    this.router.get('/room/:id', (req, res) => {
      try {
        const room = this.chatController.getRoomById(req.params.id);
        if (room) {
          res.status(200).json({ success: true, room });
        } else {
          res.status(404).json({ success: false, message: 'Room not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Find room between users route
    this.router.get('/room/between/:user1/:user2', (req, res) => {
      try {
        const room = this.chatController.getRoomBetweenUsers(req.params.user1, req.params.user2);
        if (room) {
          res.status(200).json({ success: true, room });
        } else {
          res.status(404).json({ success: false, message: 'Room not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Get messages for a room route
    this.router.get('/room/:id/messages', (req, res) => {
      try {
        const messages = this.chatController.getRoomMessages(req.params.id);
        res.status(200).json({ success: true, messages });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Add message to room route
    this.router.post('/room/:id/message', (req, res) => {
      try {
        const { senderId, encryptedMessage } = req.body;
        const message = this.chatController.addMessage(req.params.id, senderId, encryptedMessage);
        res.status(200).json({ success: true, message });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Get all rooms for a user route
    this.router.get('/user/:id/rooms', (req, res) => {
      try {
        const rooms = this.chatController.getUserRooms(req.params.id);
        res.status(200).json({ success: true, rooms });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Delete room route
    this.router.delete('/room/:id', (req, res) => {
      try {
        const success = this.chatController.deleteRoom(req.params.id);
        res.status(200).json({ success });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
  };

  getRouter = () => {
    return this.router;
  };
}

module.exports = ChatRoutes;