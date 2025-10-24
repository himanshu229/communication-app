import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Call state
  isInCall: false,
  callType: null, // 'video' | 'voice'
  callStatus: 'idle', // 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'
  callId: null,
  
  // Call participants
  localUserId: null,
  remoteUserId: null,
  remoteUserName: null,
  
  // Incoming call data
  incomingCall: null, // { callId, callerId, callerName, callType, roomId }
  
  // Media state
  isVideoEnabled: true,
  isAudioEnabled: true,
  isSpeakerEnabled: false,
  
  // WebRTC connection state
  connectionState: 'new', // 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed'
  
  // Error handling
  error: null,
  
  // Call history
  callHistory: [],
  
  // Call duration
  callDuration: 0,
  callStartTime: null
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    // Initialize outgoing call
    initiateCall: (state, action) => {
      const { userId, userName, callType } = action.payload;
      state.isInCall = true;
      state.callType = callType;
      state.callStatus = 'calling';
      state.remoteUserId = userId;
      state.remoteUserName = userName;
      state.callId = null; // Will be set when call is initiated
      state.error = null;
      state.callStartTime = null;
      state.callDuration = 0;
    },
    
    // Set call ID after initiation
    setCallId: (state, action) => {
      state.callId = action.payload;
    },
    
    // Receive incoming call
    receiveIncomingCall: (state, action) => {
      const { callId, callerId, callerName, callType, roomId } = action.payload;
      state.incomingCall = {
        callId,
        callerId,
        callerName,
        callType,
        roomId,
        timestamp: new Date().toISOString()
      };
      state.callStatus = 'ringing';
    },
    
    // Accept incoming call
    acceptCall: (state) => {
      if (state.incomingCall) {
        state.isInCall = true;
        state.callType = state.incomingCall.callType;
        state.callStatus = 'connected';
        state.remoteUserId = state.incomingCall.callerId;
        state.remoteUserName = state.incomingCall.callerName;
        state.callId = state.incomingCall.callId;
        state.callStartTime = Date.now();
        // Clear incoming call data
        state.incomingCall = null;
        state.error = null;
        // Reset media states to defaults
        state.isVideoEnabled = state.callType === 'video';
        state.isAudioEnabled = true;
        state.isSpeakerEnabled = false;
      }
    },
    
    // Reject incoming call
    rejectCall: (state) => {
      // Clear incoming call data
      state.incomingCall = null;
      state.callStatus = 'idle';
      state.error = null;
      // Reset any partial call state
      state.isInCall = false;
      state.callType = null;
      state.remoteUserId = null;
      state.remoteUserName = null;
      state.callId = null;
    },
    
    // End current call
    endCall: (state) => {
      // Add to call history before clearing
      if (state.isInCall && state.remoteUserId && state.callId) {
        const callRecord = {
          id: state.callId,
          userId: state.remoteUserId,
          userName: state.remoteUserName,
          callType: state.callType,
          duration: state.callDuration,
          timestamp: new Date().toISOString(),
          status: 'ended'
        };
        
        state.callHistory.unshift(callRecord);
        
        // Keep only last 50 calls
        if (state.callHistory.length > 50) {
          state.callHistory = state.callHistory.slice(0, 50);
        }
      }
      
      // Reset call state
      state.isInCall = false;
      state.callType = null;
      state.callStatus = 'idle';
      state.remoteUserId = null;
      state.remoteUserName = null;
      state.incomingCall = null;
      state.callId = null;
      state.connectionState = 'new';
      state.error = null;
      state.callStartTime = null;
      state.callDuration = 0;
    },
    
    // Update call status
    updateCallStatus: (state, action) => {
      state.callStatus = action.payload;
      if (action.payload === 'connected' && !state.callStartTime) {
        state.callStartTime = Date.now();
      }
    },
    
    // Update connection state
    updateConnectionState: (state, action) => {
      state.connectionState = action.payload;
    },
    
    // Set local user ID
    setLocalUserId: (state, action) => {
      state.localUserId = action.payload;
    },
    
    // Media controls
    toggleVideo: (state) => {
      state.isVideoEnabled = !state.isVideoEnabled;
    },
    
    toggleAudio: (state) => {
      state.isAudioEnabled = !state.isAudioEnabled;
    },
    
    toggleSpeaker: (state) => {
      state.isSpeakerEnabled = !state.isSpeakerEnabled;
    },
    
    setVideoEnabled: (state, action) => {
      state.isVideoEnabled = action.payload;
    },
    
    setAudioEnabled: (state, action) => {
      state.isAudioEnabled = action.payload;
    },
    
    setSpeakerEnabled: (state, action) => {
      state.isSpeakerEnabled = action.payload;
    },
    
    // Update call duration
    updateCallDuration: (state, action) => {
      state.callDuration = action.payload;
    },
    
    // Error handling
    setCallError: (state, action) => {
      state.error = action.payload;
      if (action.payload) {
        state.callStatus = 'idle';
        state.isInCall = false;
      }
    },
    
    clearCallError: (state) => {
      state.error = null;
    },
    
    // Call history management
    setCallHistory: (state, action) => {
      state.callHistory = action.payload;
    },
    
    clearCallHistory: (state) => {
      state.callHistory = [];
    },
    
    // Reset entire call state
    resetCallState: (state) => {
      return { ...initialState, callHistory: state.callHistory };
    }
  }
});

export const {
  initiateCall,
  setCallId,
  receiveIncomingCall,
  acceptCall,
  rejectCall,
  endCall,
  updateCallStatus,
  updateConnectionState,
  setLocalUserId,
  toggleVideo,
  toggleAudio,
  toggleSpeaker,
  setVideoEnabled,
  setAudioEnabled,
  setSpeakerEnabled,
  updateCallDuration,
  setCallError,
  clearCallError,
  setCallHistory,
  clearCallHistory,
  resetCallState
} = callSlice.actions;

// Selectors
export const selectCallState = (state) => state.call;
export const selectIsInCall = (state) => state.call.isInCall;
export const selectCallStatus = (state) => state.call.callStatus;
export const selectCallType = (state) => state.call.callType;
export const selectIncomingCall = (state) => state.call.incomingCall;
export const selectRemoteUser = (state) => ({
  id: state.call.remoteUserId,
  name: state.call.remoteUserName
});
export const selectMediaState = (state) => ({
  isVideoEnabled: state.call.isVideoEnabled,
  isAudioEnabled: state.call.isAudioEnabled,
  isSpeakerEnabled: state.call.isSpeakerEnabled
});
export const selectCallHistory = (state) => state.call.callHistory;
export const selectCallError = (state) => state.call.error;
export const selectConnectionState = (state) => state.call.connectionState;
export const selectCallDuration = (state) => state.call.callDuration;

export default callSlice.reducer;
