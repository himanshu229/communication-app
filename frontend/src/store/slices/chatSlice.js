import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Async thunks for chat rooms
export const getOrCreateRoom = createAsyncThunk(
  'chat/getOrCreateRoom',
  async ({ userId1, userId2 }, { rejectWithValue }) => {
    try {
      const response = await apiService.getOrCreateRoom(userId1, userId2);
      if (response.success) {
        return response; // Return the full response object which contains room, messages, etc.
      } else {
        return rejectWithValue(response.error || 'Failed to get or create room');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createRoom = createAsyncThunk(
  'chat/createRoom',
  async (roomData, { rejectWithValue }) => {
    try {
      const response = await apiService.createRoom(roomData);
      if (response.success) {
        return response.room || response.data; // Handle both response structures
      } else {
        return rejectWithValue(response.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getUserRooms = createAsyncThunk(
  'chat/getUserRooms',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await apiService.getUserRooms(userId);
      if (response.success) {
        return response.rooms || response.data; // Handle both response structures
      } else {
        return rejectWithValue(response.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  currentRoom: null,
  selectedUser: null,
  rooms: [],
  typingUsers: [],
  loading: false,
  error: null,
  isCreatingRoom: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentRoom: (state, action) => {
      state.currentRoom = action.payload;
    },
    
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    
    clearCurrentRoom: (state) => {
      state.currentRoom = null;
      state.selectedUser = null;
      state.typingUsers = [];
    },
    
    addTypingUser: (state, action) => {
      const { userId, userName, roomId } = action.payload;
      
      // Only add typing indicator for current room
      if (state.currentRoom && roomId === state.currentRoom.id) {
        const existingIndex = state.typingUsers.findIndex(user => user.userId === userId);
        if (existingIndex === -1) {
          state.typingUsers.push({ userId, userName, roomId });
        }
      }
    },
    
    removeTypingUser: (state, action) => {
      const { userId } = action.payload;
      state.typingUsers = state.typingUsers.filter(user => user.userId !== userId);
    },
    
    clearTypingUsers: (state) => {
      state.typingUsers = [];
    },
    
    addRoom: (state, action) => {
      const newRoom = action.payload;
      const existingRoomIndex = state.rooms.findIndex(room => room.id === newRoom.id);
      if (existingRoomIndex === -1) {
        state.rooms.push(newRoom);
      } else {
        state.rooms[existingRoomIndex] = newRoom;
      }
    },
    
    updateRoom: (state, action) => {
      const updatedRoom = action.payload;
      const roomIndex = state.rooms.findIndex(room => room.id === updatedRoom.id);
      if (roomIndex !== -1) {
        state.rooms[roomIndex] = { ...state.rooms[roomIndex], ...updatedRoom };
      }
    },
    
    clearChatError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get or create room
      .addCase(getOrCreateRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOrCreateRoom.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        if (response.room) {
          state.currentRoom = response.room;
          
          // Add room to rooms list if not already present
          const existingRoomIndex = state.rooms.findIndex(room => room.id === response.room.id);
          if (existingRoomIndex === -1) {
            state.rooms.push(response.room);
          }
        }
        
        state.error = null;
      })
      .addCase(getOrCreateRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create room
      .addCase(createRoom.pending, (state) => {
        state.isCreatingRoom = true;
        state.error = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.isCreatingRoom = false;
        state.currentRoom = action.payload;
        
        // Add room to rooms list
        const existingRoomIndex = state.rooms.findIndex(room => room.id === action.payload.id);
        if (existingRoomIndex === -1) {
          state.rooms.push(action.payload);
        }
        
        state.error = null;
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.isCreatingRoom = false;
        state.error = action.payload;
      })
      
      // Get user rooms
      .addCase(getUserRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload;
        state.error = null;
      })
      .addCase(getUserRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setCurrentRoom,
  setSelectedUser,
  clearCurrentRoom,
  addTypingUser,
  removeTypingUser,
  clearTypingUsers,
  addRoom,
  updateRoom,
  clearChatError,
} = chatSlice.actions;

export default chatSlice.reducer;