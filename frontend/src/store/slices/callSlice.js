import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Call state
  isInCall: false,
  callType: null, // 'video' | 'voice'
  callStatus: 'idle', // 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'
  
  // Call participants
  localUserId: null,
  remoteUserId: null,
  remoteUserName: null,
  
  // Incoming call data
  incomingCall: null, // { callerId, callerName, callType, roomId }
  
  // Media state
  isVideoEnabled: true,
  isAudioEnabled: true,
  isSpeakerEnabled: false,
  
  // WebRTC connection state
  localStream: null,
  remoteStream: null,
  connectionState: 'new', // 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed'
  
  // Error handling
  error: null,
  
  // Call history
  callHistory: []
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    // Initialize outgoing call
    initiateCall: (state, action) => {
      const { userId, userName, callType, roomId } = action.payload;
      state.isInCall = true;
      state.callType = callType;
      state.callStatus = 'calling';
      state.remoteUserId = userId;
      state.remoteUserName = userName;
      state.error = null;
    },
    
    // Receive incoming call
    receiveIncomingCall: (state, action) => {
      const { callerId, callerName, callType, roomId } = action.payload;
      state.incomingCall = {
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
        state.incomingCall = null;
        state.error = null;
      }
    },
    
    // Reject incoming call
    rejectCall: (state) => {
      state.incomingCall = null;
      state.callStatus = 'idle';
    },
    
    // End current call
    endCall: (state) => {
      // Add to call history before clearing
      if (state.isInCall && state.remoteUserId) {
        state.callHistory.unshift({
          userId: state.remoteUserId,
          userName: state.remoteUserName,
          callType: state.callType,
          duration: 0, // Will be calculated by component
          timestamp: new Date().toISOString(),
          status: 'ended'
        });
        
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
      state.localStream = null;
      state.remoteStream = null;
      state.connectionState = 'new';
      state.error = null;
    },
    
    // Update call status
    updateCallStatus: (state, action) => {
      state.callStatus = action.payload;
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
    
    // Stream management
    setLocalStream: (state, action) => {
      state.localStream = action.payload;
    },
    
    setRemoteStream: (state, action) => {
      state.remoteStream = action.payload;
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
  setLocalStream,
  setRemoteStream,
  setCallError,
  clearCallError,
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

export default callSlice.reducer;