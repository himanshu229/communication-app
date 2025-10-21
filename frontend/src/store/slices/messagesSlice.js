import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { encryptMessage, decryptMessage } from '../../utils/encryption';

// Async thunks for messages
export const fetchRoomMessages = createAsyncThunk(
  'messages/fetchRoomMessages',
  async (roomId, { rejectWithValue }) => {
    try {
      const response = await apiService.getRoomMessages(roomId);
      // Backend returns messages array directly for GET /messages/:roomId
      const messages = Array.isArray(response) ? response : [];
      
      // Decrypt messages before storing in state
      const decryptedMessages = messages.map(msg => ({
        ...msg,
        message: decryptMessage(msg.message)
      }));
      return { roomId, messages: decryptedMessages };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ roomId, message, senderId, socketEmit }, { rejectWithValue }) => {
    try {
      // Encrypt message for transmission
      const encryptedMessage = encryptMessage(message);
      
      const messageData = {
        roomId,
        message,
        encryptedMessage,
        senderId,
        timestamp: new Date().toISOString(),
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9) // Temporary ID
      };

      // Emit via socket for real-time delivery
      if (socketEmit && typeof socketEmit === 'function') {
        socketEmit('send_message', messageData);
        
        // Return the message data for immediate UI update
        return {
          ...messageData,
          message // Return decrypted message for immediate display
        };
      } else {
        return rejectWithValue('Socket connection not available');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  messagesByRoom: {}, // { roomId: [messages] }
  currentRoomMessages: [],
  loading: false,
  sending: false,
  error: null,
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      const message = action.payload;
      const roomId = message.roomId;
      
      if (!state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId] = [];
      }
      
      // Decrypt message if it's encrypted
      const decryptedMessage = {
        ...message,
        message: message.encryptedMessage ? decryptMessage(message.encryptedMessage) : message.message
      };
      
      state.messagesByRoom[roomId].push(decryptedMessage);
      
      // Update current room messages if it's the active room OR if we're receiving the very first message
      // Previous logic skipped pushing when currentRoomMessages was empty, causing UI not to show first message
      if (
        state.currentRoomMessages.length === 0 ||
        state.currentRoomMessages[0]?.roomId === roomId
      ) {
        state.currentRoomMessages.push(decryptedMessage);
      }
    },
    
    setCurrentRoomMessages: (state, action) => {
      const { roomId } = action.payload;
      state.currentRoomMessages = state.messagesByRoom[roomId] || [];
    },
    
    clearCurrentRoomMessages: (state) => {
      state.currentRoomMessages = [];
    },
    
    clearAllMessages: (state) => {
      state.messagesByRoom = {};
      state.currentRoomMessages = [];
    },
    
    updateMessage: (state, action) => {
      const { messageId, roomId, updates } = action.payload;
      
      if (state.messagesByRoom[roomId]) {
        const messageIndex = state.messagesByRoom[roomId].findIndex(
          msg => msg.id === messageId
        );
        if (messageIndex !== -1) {
          state.messagesByRoom[roomId][messageIndex] = {
            ...state.messagesByRoom[roomId][messageIndex],
            ...updates
          };
        }
      }
      
      // Update in current room messages if applicable
      const currentMessageIndex = state.currentRoomMessages.findIndex(
        msg => msg.id === messageId
      );
      if (currentMessageIndex !== -1) {
        state.currentRoomMessages[currentMessageIndex] = {
          ...state.currentRoomMessages[currentMessageIndex],
          ...updates
        };
      }
    },
    
    deleteMessage: (state, action) => {
      const { messageId, roomId } = action.payload;
      
      if (state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId] = state.messagesByRoom[roomId].filter(
          msg => msg.id !== messageId
        );
      }
      
      state.currentRoomMessages = state.currentRoomMessages.filter(
        msg => msg.id !== messageId
      );
    },
    
    clearMessagesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch room messages
      .addCase(fetchRoomMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoomMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { roomId, messages } = action.payload;
        state.messagesByRoom[roomId] = messages;
        state.currentRoomMessages = messages;
        state.error = null;
      })
      .addCase(fetchRoomMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        
        // Message is already added via socket listener,
        // but we can update it with server response data if needed
        const message = action.payload;
        const roomId = message.roomId;
        
        if (state.messagesByRoom[roomId]) {
          const messageIndex = state.messagesByRoom[roomId].findIndex(
            msg => msg.tempId === message.tempId || msg.id === message.id
          );
          if (messageIndex !== -1) {
            state.messagesByRoom[roomId][messageIndex] = message;
          }
        }
        
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload;
      });
  },
});

export const {
  addMessage,
  setCurrentRoomMessages,
  clearCurrentRoomMessages,
  clearAllMessages,
  updateMessage,
  deleteMessage,
  clearMessagesError,
} = messagesSlice.actions;

export default messagesSlice.reducer;