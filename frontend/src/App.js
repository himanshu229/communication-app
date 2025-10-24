import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAuth, useCall, useIncomingCall } from './hooks/redux';
import { fetchCurrentUser, logoutUser } from './store/slices/authSlice';
import { endCall } from './store/slices/callSlice';
import { socketService } from './services/socket';
import { ringtoneService } from './services/ringtone';
import { checkAndAcceptBackendSSL } from './config/ssl-helper';
import Auth from './components/Auth';
import Chat from './components/Chat';
import VideoCall from './components/VideoCall';
import IncomingCall from './components/IncomingCall';

function App() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading } = useAuth();
  const call = useCall();
  const incomingCall = useIncomingCall();
  const [sslChecked, setSslChecked] = useState(false);

  useEffect(() => {
    // Check SSL certificate first
    const initializeApp = async () => {
      const sslAccepted = await checkAndAcceptBackendSSL();
      setSslChecked(true);
      
      // Initialize ringtone service
      await ringtoneService.initialize();
      
      if (sslAccepted) {
        // Attempt to fetch current user via cookie
        dispatch(fetchCurrentUser());
      }
    };

    initializeApp();

    // Cleanup function
    return () => {
      // Cleanup ringtone service on unmount
      ringtoneService.cleanup();
    };
  }, []); // Remove user?.id dependency to prevent infinite loop

  // Handle page refresh/close during calls
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (call.isInCall) {
        e.preventDefault();
        e.returnValue = 'You have an active call. Are you sure you want to leave?';
        // End the call when user leaves
        dispatch(endCall({ duration: call.callDuration, status: 'ended' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [call.isInCall, call.callDuration, dispatch]);

  const handleLogout = async () => {
    // Disconnect socket before logging out
    if (user?.id) {
      socketService.userOffline(user.id);
    }
    socketService.disconnect();
    
    // Then dispatch logout action
    dispatch(logoutUser());
  };

  if (loading || !sslChecked) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5 text-white">
        <div className="w-10 h-10 border-4 border-white border-opacity-30 border-t-white rounded-full animate-spin"></div>
        <p className="text-lg font-medium m-0">
          {!sslChecked ? 'Checking SSL connection...' : 'Loading SecureChat...'}
        </p>
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
      
      {/* Call Components */}
      {call.isInCall && <VideoCall />}
      {incomingCall && <IncomingCall />}
    </div>
  );
}

export default App;