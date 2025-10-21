import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Async thunks for authentication
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await apiService.registerUser(userData);
      if (response.success) {
        if (response.conflict) {
          return rejectWithValue('CONFLICT');
        }
        const user = response.user;
        const userId = response.userId;
        const token = response.token;
        
        // Store user data in localStorage
  localStorage.setItem('userId', userId);
  localStorage.setItem('user', JSON.stringify(user));
  if (token) localStorage.setItem('authToken', token);
        
        return user;
      } else {
        return rejectWithValue(response.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('Login attempt with credentials:', credentials);
      const response = await apiService.loginUser(credentials);
      console.log('Login response:', response);
      
      if (response.success) {
        if (response.conflict) {
          return rejectWithValue('CONFLICT');
        }
        const user = response.user;
        const userId = response.userId;
        const token = response.token;
        
        console.log('Login successful - User:', user, 'UserId:', userId);
        
        // Store user data in localStorage
  localStorage.setItem('userId', userId);
  localStorage.setItem('user', JSON.stringify(user));
  if (token) localStorage.setItem('authToken', token);
        
        return user;
      } else {
        console.log('Login failed:', response.error);
        return rejectWithValue(response.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const loadUserFromStorage = createAsyncThunk(
  'auth/loadUserFromStorage',
  async (_, { rejectWithValue }) => {
    try {
      const savedUserId = localStorage.getItem('userId');
      const savedUser = localStorage.getItem('user');
      
      if (savedUserId && savedUser) {
        const userData = JSON.parse(savedUser);
        return userData;
      } else {
        return rejectWithValue('No saved user found');
      }
    } catch (error) {
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
      return rejectWithValue('Invalid saved user data');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Force login (override existing session)
export const forceLoginUser = createAsyncThunk(
  'auth/forceLoginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiService.forceLogin(credentials);
      if (response.success) {
        const user = response.user;
        const userId = response.user?.id || response.userId;
        const token = response.token;
        if (userId) localStorage.setItem('userId', userId);
        if (user) localStorage.setItem('user', JSON.stringify(user));
        if (token) localStorage.setItem('authToken', token);
        return user;
      } else {
        return rejectWithValue(response.error || 'Force login failed');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  isRegistering: false,
  isLoggingIn: false,
  loginConflict: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    updateAuthUserStatus: (state, action) => {
      if (state.user && action.payload) {
        const { isOnline, lastSeen } = action.payload;
        state.user.isOnline = isOnline;
        if (lastSeen) state.user.lastSeen = lastSeen;
      }
    },
    clearLoginConflict: (state) => {
      state.loginConflict = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // Register user
      .addCase(registerUser.pending, (state) => {
        state.isRegistering = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isRegistering = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isRegistering = false;
        state.error = action.payload;
        state.loading = false;
      })
      
      // Login user
      .addCase(loginUser.pending, (state) => {
        state.isLoggingIn = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoggingIn = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoggingIn = false;
        if (action.payload === 'CONFLICT') {
          state.loginConflict = true;
          state.error = null;
        } else {
          state.error = action.payload;
        }
        state.loading = false;
      })
      
      // Load user from storage
      .addCase(loadUserFromStorage.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUserFromStorage.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(loadUserFromStorage.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      
      // Logout user
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      });

    // Force login user
    builder
      .addCase(forceLoginUser.pending, (state) => {
        state.isLoggingIn = true;
        state.error = null;
      })
      .addCase(forceLoginUser.fulfilled, (state, action) => {
        state.isLoggingIn = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
        state.loginConflict = false;
      })
      .addCase(forceLoginUser.rejected, (state, action) => {
        state.isLoggingIn = false;
        state.error = action.payload;
        state.loading = false;
      });
  },
});

export const { clearError, setLoading, updateAuthUserStatus, clearLoginConflict } = authSlice.actions;
export default authSlice.reducer;