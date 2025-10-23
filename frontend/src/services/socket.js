import io from 'socket.io-client';
import { getSocketUrl } from '../config/urls';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
  }

  // Initialize socket connection
  connect(serverUrl = getSocketUrl()) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5,
    });

    this.setupDefaultListeners();
    return this.socket;
  }

  // Setup default socket event listeners
  setupDefaultListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Generic method to emit events
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
      return true;
    }
    console.warn(`Cannot emit ${event}: Socket not connected`);
    return false;
  }

  // Generic method to listen to events
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      // Store listener for cleanup
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(callback);
    }
  }

  // Remove specific event listener
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      
      // Remove from stored listeners
      if (this.eventListeners.has(event)) {
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.eventListeners.delete(event);
    }
  }

  // User-related socket methods
  userOnline(userId) {
    return this.emit('user_online', userId);
  }

  userOffline(userId) {
    return this.emit('user_offline', userId);
  }

  // Room-related socket methods
  joinRoom(roomId) {
    return this.emit('join_room', roomId);
  }

  leaveRoom(roomId) {
    return this.emit('leave_room', roomId);
  }

  createRoom(roomData) {
    return this.emit('create_room', roomData);
  }

  // Message-related socket methods
  sendMessage(messageData) {
    return this.emit('send_message', messageData);
  }

  // Typing indicator methods
  startTyping(roomId, userId, userName) {
    return this.emit('typing', {
      roomId,
      userId,
      userName,
      isTyping: true,
    });
  }

  stopTyping(roomId, userId, userName) {
    return this.emit('typing', {
      roomId,
      userId,
      userName,
      isTyping: false,
    });
  }

  // Call-related socket methods
  initiateCall(callData) {
    return this.emit('initiate_call', callData);
  }

  answerCall(callData) {
    return this.emit('answer_call', callData);
  }

  rejectCall(callData) {
    return this.emit('reject_call', callData);
  }

  endCall(callData) {
    return this.emit('end_call', callData);
  }

  // WebRTC signaling methods
  sendCallOffer(offerData) {
    return this.emit('call_offer', offerData);
  }

  sendCallAnswer(answerData) {
    return this.emit('call_answer', answerData);
  }

  sendIceCandidate(candidateData) {
    return this.emit('ice_candidate', candidateData);
  }

  // Call status updates
  updateCallStatus(statusData) {
    return this.emit('call_status_update', statusData);
  }

  // Convenience methods for common event listeners
  onReceiveMessage(callback) {
    this.on('receive_message', callback);
  }

  onUserStatusChanged(callback) {
    this.on('user_status_changed', callback);
  }

  onRoomCreated(callback) {
    this.on('room_created', callback);
  }

  onUserTyping(callback) {
    this.on('user_typing', callback);
  }

  onRoomJoined(callback) {
    this.on('room_joined', callback);
  }

  // Call event listeners
  onIncomingCall(callback) {
    this.on('incoming_call', callback);
  }

  onCallAccepted(callback) {
    this.on('call_accepted', callback);
  }

  onCallRejected(callback) {
    this.on('call_rejected', callback);
  }

  onCallEnded(callback) {
    this.on('call_ended', callback);
  }

  onCallOffer(callback) {
    this.on('call_offer', callback);
  }

  onCallAnswer(callback) {
    this.on('call_answer', callback);
  }

  onIceCandidate(callback) {
    this.on('ice_candidate', callback);
  }

  onCallStatusUpdate(callback) {
    this.on('call_status_update', callback);
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
    };
  }

  // Clean up all listeners
  cleanup() {
    this.eventListeners.forEach((listeners, event) => {
      this.removeAllListeners(event);
    });
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;