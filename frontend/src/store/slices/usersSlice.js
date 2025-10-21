import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Async thunks for users
export const fetchAllUsers = createAsyncThunk(
  'users/fetchAllUsers',
  async (currentUserId, { rejectWithValue }) => {
    try {
      const response = await apiService.getAllUsers();
      // Backend returns users array directly for GET /users
      const usersList = Array.isArray(response) ? response : [];
      // Filter out current user from the list
      const filteredUsers = usersList.filter(user => user.id !== currentUserId);
      return filteredUsers;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserStatus = createAsyncThunk(
  'users/updateUserStatus',
  async ({ userId, isOnline }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateUserStatus(userId, isOnline);
      if (response.success) {
        return { userId, isOnline };
      } else {
        return rejectWithValue(response.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  usersList: [],
  loading: false,
  error: null,
  onlineUsers: [],
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    updateUserOnlineStatus: (state, action) => {
      const { userId, isOnline } = action.payload;
      const userIndex = state.usersList.findIndex(user => user.id === userId);
      if (userIndex !== -1) {
        state.usersList[userIndex].isOnline = isOnline;
      }
      
      if (isOnline) {
        if (!state.onlineUsers.includes(userId)) {
          state.onlineUsers.push(userId);
        }
      } else {
        state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
      }
    },
    
    setUsersList: (state, action) => {
      state.usersList = action.payload;
    },
    
    addUser: (state, action) => {
      const newUser = action.payload;
      const existingUserIndex = state.usersList.findIndex(user => user.id === newUser.id);
      if (existingUserIndex === -1) {
        state.usersList.push(newUser);
      }
    },
    
    removeUser: (state, action) => {
      const userId = action.payload;
      state.usersList = state.usersList.filter(user => user.id !== userId);
      state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
    },
    
    clearUsersError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all users
      .addCase(fetchAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.usersList = action.payload;
        state.onlineUsers = action.payload
          .filter(user => user.isOnline)
          .map(user => user.id);
        state.error = null;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update user status
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        const { userId, isOnline } = action.payload;
        const userIndex = state.usersList.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
          state.usersList[userIndex].isOnline = isOnline;
        }
        
        if (isOnline) {
          if (!state.onlineUsers.includes(userId)) {
            state.onlineUsers.push(userId);
          }
        } else {
          state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
        }
      })
      .addCase(updateUserStatus.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  updateUserOnlineStatus,
  setUsersList,
  addUser,
  removeUser,
  clearUsersError,
} = usersSlice.actions;

export default usersSlice.reducer;