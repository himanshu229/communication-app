const { v4: uuidv4 } = require('uuid');
const { signUser } = require('../utils/jwt');

class UserController {
  constructor(dataService) {
    this.dataService = dataService;
  }

  // Register a new user
  register = (userData) => {
    try {
      const { name, phoneNumber } = userData;
      
      // Validation
      if (!name || !phoneNumber) {
        return { success: false, error: 'Name and phone number are required' };
      }

      // Validate name - must be at least 2 characters
      if (name.trim().length < 2) {
        return { success: false, error: 'Name must be at least 2 characters long' };
      }

      // Validate phone number - must be exactly 10 digits
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return { success: false, error: 'Phone number must be exactly 10 digits' };
      }

      // Check if phone number already exists
      const existingUser = this.dataService.findUserByPhone(phoneNumber);
      if (existingUser) {
        return { success: false, error: 'Phone number already registered' };
      }

      // Create new user
      const userId = uuidv4();
      const user = {
        id: userId,
        name: name.trim(),
        phoneNumber,
        isOnline: false,
        lastSeen: new Date()
      };

      this.dataService.addUser(user);
      
      const token = signUser(user);
      return { 
        success: true, 
        userId,
        token,
        user: { id: userId, name: name.trim(), phoneNumber, isOnline: false, lastSeen: user.lastSeen }
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Internal server error' };
    }
  };

  // Login existing user
  login = (loginData) => {
    try {
      const { phoneNumber } = loginData;
      
      if (!phoneNumber) {
        return { success: false, error: 'Phone number is required' };
      }

      // Validate phone number format
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return { success: false, error: 'Phone number must be exactly 10 digits' };
      }

      const user = this.dataService.findUserByPhone(phoneNumber);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      // If already online with a socket, treat as duplicate session
      if (user.isOnline && user.socketId) {
        return { success: false, conflict: true, message: 'User already logged in elsewhere' };
      }

      const token = signUser(user);
      return { 
        success: true, 
        userId: user.id,
        token,
        user: { id: user.id, name: user.name, phoneNumber: user.phoneNumber, isOnline: user.isOnline, lastSeen: user.lastSeen }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Internal server error' };
    }
  };

  // Force login - terminate previous session if exists and issue new token
  forceLogin = (loginData) => {
    try {
      const { phoneNumber } = loginData;
      if (!phoneNumber) return { success: false, error: 'Phone number is required' };
      const user = this.dataService.findUserByPhone(phoneNumber);
      if (!user) return { success: false, error: 'User not found' };

      // If there is an existing session, disconnect previous socket if we have io reference
      if (user.isOnline && user.socketId && this.io) {
        this.io.to(user.socketId).emit('force_logout', { reason: 'Session taken over' });
        // Clear previous socketId so new connection can attach
        user.socketId = null;
      }

      // Update lastSeen (do not mark online here; socket connection will set online to avoid race)
      user.lastSeen = new Date();
      this.dataService.updateUser(user.id, { lastSeen: user.lastSeen });

      const token = signUser(user);
      return {
        success: true,
        userId: user.id,
        token,
        forced: true,
        user: { id: user.id, name: user.name, phoneNumber: user.phoneNumber, isOnline: user.isOnline, lastSeen: user.lastSeen }
      };
    } catch (e) {
      console.error('Force login error:', e);
      return { success: false, error: 'Internal server error' };
    }
  };

  // Get all users
  getAllUsers = () => {
    try {
      const userList = this.dataService.getAllUsers().map(user => ({
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }));
      
      return userList;
    } catch (error) {
      console.error('Get users error:', error);
      return [];
    }
  };

  // Update user status
  updateUserStatus = (userId, isOnline, socketId = null) => {
    try {
      const updates = {
        isOnline,
        lastSeen: new Date()
      };
      
      if (socketId) {
        updates.socketId = socketId;
      } else {
        // Remove socketId when user goes offline
        const user = this.dataService.getUser(userId);
        if (user && user.socketId) {
          delete user.socketId;
          updates.socketId = undefined;
        }
      }

      return this.dataService.updateUser(userId, updates);
    } catch (error) {
      console.error('Update user status error:', error);
      return null;
    }
  };

  // Get user by ID
  getUserById = (userId) => {
    return this.dataService.getUser(userId);
  };
}

module.exports = UserController;