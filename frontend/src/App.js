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
      
      if (sslAccepted) {
        // Attempt to fetch current user via cookie
        dispatch(fetchCurrentUser());
      }
    };

    initializeApp();

    // Handle page refresh/close during active call
    const handleBeforeUnload = (event) => {
      if (call.isInCall || call.incomingCall) {
        // Notify remote user about call end
        const targetUserId = call.remoteUserId || call.incomingCall?.callerId;
        if (targetUserId && user?.id) {
          socketService.endCall({
            to: targetUserId,
            from: user.id
          });
        }
        
        // Clear call state
        dispatch(endCall());
        
        // Show warning message
        const message = 'You have an active call. Are you sure you want to leave?';
        event.returnValue = message;
        return message;
      }
    };

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      ringtoneService.cleanup();
    };
  }, [call.isInCall, call.incomingCall, call.remoteUserId, user?.id]);

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
        <>
          <Chat onLogout={handleLogout} />
          {/* Call Components */}
          {(call.isInCall || call.callStatus === 'calling' || call.callStatus === 'connected') && <VideoCall />}
          {incomingCall && <IncomingCall />}
        </>
      ) : (
        <Auth />
      )}
    </div>
  );
}

export default App;