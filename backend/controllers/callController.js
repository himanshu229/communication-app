const { v4: uuidv4 } = require('uuid');

class CallController {
  constructor(dataService) {
    this.dataService = dataService;
    this.activeCalls = new Map(); // Track active calls
  }

  // Initiate a call from one user to another
  initiateCall = (callerId, calleeId, callType, roomId) => {
    try {
      // Validate users exist
      const caller = this.dataService.getUser(callerId);
      const callee = this.dataService.getUser(calleeId);
      
      if (!caller || !callee) {
        return { success: false, error: 'User not found' };
      }

      // Check if callee is online
      if (!callee.isOnline) {
        return { success: false, error: 'User is offline' };
      }

      // Check if caller is already in a call
      if (this.isUserInCall(callerId)) {
        return { success: false, error: 'You are already in a call' };
      }

      // Check if callee is already in a call
      if (this.isUserInCall(calleeId)) {
        return { success: false, error: 'User is busy' };
      }

      // Create call record
      const callId = uuidv4();
      const callData = {
        id: callId,
        callerId,
        calleeId,
        callerName: caller.name,
        calleeName: callee.name,
        callType, // 'video' or 'voice'
        roomId,
        status: 'initiated', // 'initiated', 'ringing', 'connected', 'ended', 'rejected', 'missed'
        startTime: new Date(),
        endTime: null,
        duration: 0
      };

      // Store active call
      this.activeCalls.set(callId, callData);
      this.activeCalls.set(callerId, callId); // Map user to call
      this.activeCalls.set(calleeId, callId);

      return { success: true, callData };
    } catch (error) {
      console.error('Error initiating call:', error);
      return { success: false, error: 'Failed to initiate call' };
    }
  };

  // Accept a call
  acceptCall = (callId, userId) => {
    try {
      const callData = this.activeCalls.get(callId);
      
      if (!callData) {
        return { success: false, error: 'Call not found' };
      }

      // Verify user is the callee
      if (callData.calleeId !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      // Update call status
      callData.status = 'connected';
      callData.connectedTime = new Date();

      return { success: true, callData };
    } catch (error) {
      console.error('Error accepting call:', error);
      return { success: false, error: 'Failed to accept call' };
    }
  };

  // Reject a call
  rejectCall = (callId, userId) => {
    try {
      const callData = this.activeCalls.get(callId);
      
      if (!callData) {
        return { success: false, error: 'Call not found' };
      }

      // Verify user is the callee
      if (callData.calleeId !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      // Update call status
      callData.status = 'rejected';
      callData.endTime = new Date();
      callData.duration = 0;

      // Save to call history
      this.saveCallToHistory(callData);

      // Clean up active call
      this.cleanupCall(callId);

      return { success: true, callData };
    } catch (error) {
      console.error('Error rejecting call:', error);
      return { success: false, error: 'Failed to reject call' };
    }
  };

  // End a call
  endCall = (callId, userId) => {
    try {
      const callData = this.activeCalls.get(callId);
      
      if (!callData) {
        return { success: false, error: 'Call not found' };
      }

      // Verify user is part of the call
      if (callData.callerId !== userId && callData.calleeId !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      // Update call status
      callData.status = 'ended';
      callData.endTime = new Date();
      
      // Calculate duration
      if (callData.connectedTime) {
        callData.duration = Math.floor((callData.endTime - callData.connectedTime) / 1000);
      } else {
        callData.duration = 0;
      }

      // Save to call history
      this.saveCallToHistory(callData);

      // Clean up active call
      this.cleanupCall(callId);

      return { success: true, callData };
    } catch (error) {
      console.error('Error ending call:', error);
      return { success: false, error: 'Failed to end call' };
    }
  };

  // Get call history for a user
  getCallHistory = (userId, limit = 50) => {
    try {
      const callHistory = this.dataService.getCallHistory(userId);
      return {
        success: true,
        calls: callHistory.slice(0, limit)
      };
    } catch (error) {
      console.error('Error getting call history:', error);
      return { success: false, error: 'Failed to get call history' };
    }
  };

  // Get active call for a user
  getActiveCall = (userId) => {
    try {
      const callId = this.activeCalls.get(userId);
      if (!callId) {
        return { success: true, callData: null };
      }

      const callData = this.activeCalls.get(callId);
      return { success: true, callData };
    } catch (error) {
      console.error('Error getting active call:', error);
      return { success: false, error: 'Failed to get active call' };
    }
  };

  // Check if user is in a call
  isUserInCall = (userId) => {
    return this.activeCalls.has(userId);
  };

  // Save call to history
  saveCallToHistory = (callData) => {
    try {
      this.dataService.addCallToHistory(callData);
    } catch (error) {
      console.error('Error saving call to history:', error);
    }
  };

  // Clean up call from active calls
  cleanupCall = (callId) => {
    const callData = this.activeCalls.get(callId);
    if (callData) {
      this.activeCalls.delete(callId);
      this.activeCalls.delete(callData.callerId);
      this.activeCalls.delete(callData.calleeId);
    }
  };

  // Get call by ID
  getCallById = (callId) => {
    return this.activeCalls.get(callId);
  };

  // Clean up calls for disconnected user
  cleanupUserCalls = (userId) => {
    const callId = this.activeCalls.get(userId);
    if (callId) {
      const callData = this.activeCalls.get(callId);
      if (callData) {
        // Mark call as ended due to disconnection
        callData.status = 'ended';
        callData.endTime = new Date();
        callData.duration = callData.connectedTime ? 
          Math.floor((callData.endTime - callData.connectedTime) / 1000) : 0;
        
        // Save to history
        this.saveCallToHistory(callData);
        
        // Clean up
        this.cleanupCall(callId);
      }
    }
  };
}

module.exports = CallController;
