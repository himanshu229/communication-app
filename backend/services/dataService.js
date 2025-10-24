const fs = require('fs');
const path = require('path');
const DataInitializer = require('./dataInitializer');

class DataService {
  constructor() {
    this.DATA_DIR = path.join(__dirname, '..', 'data');
    this.USERS_FILE = path.join(this.DATA_DIR, 'users.json');
    this.CHAT_ROOMS_FILE = path.join(this.DATA_DIR, 'chatRooms.json');
    this.MESSAGES_FILE = path.join(this.DATA_DIR, 'messages.json');
    this.CALL_HISTORY_FILE = path.join(this.DATA_DIR, 'callHistory.json');
    
    // Initialize data files if they don't exist
    this.dataInitializer = new DataInitializer(this.DATA_DIR);
    this.dataInitializer.initializeDataFiles();

    // Load initial data from JSON files
    this.users = new Map(Object.entries(this.readJSONFile(this.USERS_FILE, {})));
    this.chatRooms = new Map(Object.entries(this.readJSONFile(this.CHAT_ROOMS_FILE, {})));
    this.messages = new Map(Object.entries(this.readJSONFile(this.MESSAGES_FILE, {})));
    this.callHistory = new Map(Object.entries(this.readJSONFile(this.CALL_HISTORY_FILE, {})));
    
    // Reset all users to offline on server start
    this.resetAllUsersOffline();
    
    // Set up file watchers for auto-reload
    this.setupFileWatchers();
  }

  // Helper function to read JSON files
  readJSONFile(filePath, defaultValue = {}) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      return defaultValue;
    }
  }

  // Helper function to write JSON files
  writeJSONFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error writing ${filePath}:`, error);
      return false;
    }
  }

  // User operations
  saveUsers() {
    const usersObj = Object.fromEntries(this.users);
    this.writeJSONFile(this.USERS_FILE, usersObj);
  }

  addUser(user) {
    this.users.set(user.id, user);
    this.saveUsers();
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.users.set(userId, updatedUser);
      this.saveUsers();
      return updatedUser;
    }
    return null;
  }

  findUserByPhone(phoneNumber) {
    return Array.from(this.users.values()).find(user => user.phoneNumber === phoneNumber);
  }

  // Chat room operations
  saveChatRooms() {
    const roomsObj = Object.fromEntries(this.chatRooms);
    this.writeJSONFile(this.CHAT_ROOMS_FILE, roomsObj);
  }

  addChatRoom(room) {
    this.chatRooms.set(room.id, room);
    this.saveChatRooms();
  }

  getChatRoom(roomId) {
    return this.chatRooms.get(roomId);
  }

  getAllChatRooms() {
    return Array.from(this.chatRooms.values());
  }

  findRoomByParticipants(participants) {
    return Array.from(this.chatRooms.values()).find(room => {
      if (room.participants.length !== participants.length) return false;
      return participants.every(p => room.participants.includes(p));
    });
  }

  deleteRoom(roomId) {
    const deleted = this.chatRooms.delete(roomId);
    if (deleted) {
      this.saveChatRooms();
    }
    return deleted;
  }

  // Message operations
  saveMessages() {
    const messagesObj = Object.fromEntries(this.messages);
    this.writeJSONFile(this.MESSAGES_FILE, messagesObj);
  }

  addMessage(roomId, message) {
    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }
    this.messages.get(roomId).push(message);
    this.saveMessages();
  }

  getMessages(roomId) {
    return this.messages.get(roomId) || [];
  }

  deleteRoomMessages(roomId) {
    const deleted = this.messages.delete(roomId);
    if (deleted) {
      this.saveMessages();
    }
    return deleted;
  }

  // Cleanup operations
  cleanupDuplicateRooms() {
    const roomsToKeep = new Map();
    const roomsToDelete = [];
    
    // Group rooms by participants
    for (const [roomId, room] of this.chatRooms) {
      if (room.participants && room.participants.length === 2) {
        const sortedParticipants = [...room.participants].sort().join('-');
        
        if (!roomsToKeep.has(sortedParticipants)) {
          roomsToKeep.set(sortedParticipants, room);
        } else {
          // This is a duplicate, mark for deletion but merge messages
          const existingRoom = roomsToKeep.get(sortedParticipants);
          const existingMessages = this.messages.get(existingRoom.id) || [];
          const duplicateMessages = this.messages.get(roomId) || [];
          
          // Merge messages from duplicate room to the existing room
          if (duplicateMessages.length > 0) {
            const mergedMessages = [...existingMessages, ...duplicateMessages];
            this.messages.set(existingRoom.id, mergedMessages);
          }
          
          // Delete the duplicate room and its messages
          roomsToDelete.push(roomId);
          this.messages.delete(roomId);
        }
      }
    }
    
    // Remove duplicate rooms
    roomsToDelete.forEach(roomId => this.chatRooms.delete(roomId));
    
    if (roomsToDelete.length > 0) {
      console.log(`Cleaned up ${roomsToDelete.length} duplicate chat rooms`);
      this.saveChatRooms();
      this.saveMessages();
    }
  }

  // Call history operations
  saveCallHistory() {
    const callHistoryObj = Object.fromEntries(this.callHistory);
    this.writeJSONFile(this.CALL_HISTORY_FILE, callHistoryObj);
  }

  addCallToHistory(callData) {
    // Store call history by user ID for easy retrieval
    const userId = callData.callerId;
    if (!this.callHistory.has(userId)) {
      this.callHistory.set(userId, []);
    }
    
    const userCallHistory = this.callHistory.get(userId);
    userCallHistory.push(callData);
    
    // Keep only last 100 calls per user
    if (userCallHistory.length > 100) {
      userCallHistory.splice(0, userCallHistory.length - 100);
    }
    
    this.saveCallHistory();
  }

  getCallHistory(userId) {
    return this.callHistory.get(userId) || [];
  }

  // Save all data method
  saveAllData() {
    this.saveUsers();
    this.saveChatRooms();
    this.saveMessages();
    this.saveCallHistory();
  }

  // Reload data from JSON files (useful after manual edits)
  reloadAllData() {
    console.log('Reloading all data from JSON files...');
    this.users = new Map(Object.entries(this.readJSONFile(this.USERS_FILE, {})));
    this.chatRooms = new Map(Object.entries(this.readJSONFile(this.CHAT_ROOMS_FILE, {})));
    this.messages = new Map(Object.entries(this.readJSONFile(this.MESSAGES_FILE, {})));
    console.log(`Reloaded: ${this.users.size} users, ${this.chatRooms.size} rooms, ${this.messages.size} message groups`);
  }

  // Set up file watchers to auto-reload when JSON files are modified
  setupFileWatchers() {
    const watchOptions = { persistent: false };
    
    // Watch users file
    if (fs.existsSync(this.USERS_FILE)) {
      fs.watchFile(this.USERS_FILE, watchOptions, () => {
        console.log('Users file changed, reloading...');
        setTimeout(() => {
          this.users = new Map(Object.entries(this.readJSONFile(this.USERS_FILE, {})));
          console.log(`Reloaded ${this.users.size} users from file`);
        }, 100); // Small delay to ensure file write is complete
      });
    }

    // Watch chat rooms file
    if (fs.existsSync(this.CHAT_ROOMS_FILE)) {
      fs.watchFile(this.CHAT_ROOMS_FILE, watchOptions, () => {
        console.log('Chat rooms file changed, reloading...');
        setTimeout(() => {
          this.chatRooms = new Map(Object.entries(this.readJSONFile(this.CHAT_ROOMS_FILE, {})));
          console.log(`Reloaded ${this.chatRooms.size} chat rooms from file`);
        }, 100);
      });
    }

    // Watch messages file
    if (fs.existsSync(this.MESSAGES_FILE)) {
      fs.watchFile(this.MESSAGES_FILE, watchOptions, () => {
        console.log('Messages file changed, reloading...');
        setTimeout(() => {
          this.messages = new Map(Object.entries(this.readJSONFile(this.MESSAGES_FILE, {})));
          console.log(`Reloaded ${this.messages.size} message groups from file`);
        }, 100);
      });
    }

    console.log('File watchers set up for automatic data reloading');
  }

  // Periodic save method (alias for backward compatibility)
  periodicSave() {
    this.saveAllData();
  }

  // Reset all users to offline status on server start
  resetAllUsersOffline() {
    console.log('Resetting all users to offline status...');
    let updatedCount = 0;
    
    for (const [userId, user] of this.users) {
      if (user.isOnline) {
        user.isOnline = false;
        user.lastSeen = new Date();
        // Remove socket ID since they're not connected
        if (user.socketId) {
          delete user.socketId;
        }
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      this.saveUsers();
      console.log(`✅ Reset ${updatedCount} users to offline status`);
    } else {
      console.log('ℹ️ No users needed status reset');
    }
  }
}

module.exports = DataService;