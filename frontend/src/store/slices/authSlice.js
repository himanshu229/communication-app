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
        return response.user;
      }
      return rejectWithValue(response.error || response.message);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiService.loginUser(credentials);
      if (response.success) {
        if (response.conflict) return rejectWithValue('CONFLICT');
        return response.user;
      }
      return rejectWithValue(response.error || response.message);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.fetchCurrentUser();
      if (response.success) {
        return response.user;
      }
      return rejectWithValue(response.error || response.message || 'Unable to fetch user');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await apiService.logout();
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
        return response.user;
      }
      return rejectWithValue(response.error || response.message || 'Force login failed');
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
  initialized: false,
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
      // Fetch current user via cookie
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
        state.initialized = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
        state.initialized = true;
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