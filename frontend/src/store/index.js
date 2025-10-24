import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import chatSlice from './slices/chatSlice';
import messagesSlice from './slices/messagesSlice';
import usersSlice from './slices/usersSlice';
import callSlice from './slices/callSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
    messages: messagesSlice,
    users: usersSlice,
    call: callSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types from serializable check
        ignoredActions: ['socket/connect', 'socket/disconnect'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['socket.instance'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// For TypeScript users, you can export these types:
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;

export default store;