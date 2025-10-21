import React, { useEffect } from 'react';
import { useAppDispatch, useAuth } from './hooks/redux';
import { loadUserFromStorage, logoutUser } from './store/slices/authSlice';
import { socketService } from './services/socket';
import Auth from './components/Auth';
import Chat from './components/Chat';

function App() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Check if user is already logged in on app start
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  const handleLogout = async () => {
    // Disconnect socket before logging out
    if (user?.id) {
      socketService.userOffline(user.id);
    }
    socketService.disconnect();
    
    // Then dispatch logout action
    dispatch(logoutUser());
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5 text-white">
        <div className="w-10 h-10 border-4 border-white border-opacity-30 border-t-white rounded-full animate-spin"></div>
        <p className="text-lg font-medium m-0">Loading SecureChat...</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      {isAuthenticated && user ? (
        <Chat onLogout={handleLogout} />
      ) : (
        <Auth />
      )}
    </div>
  );
}

export default App;