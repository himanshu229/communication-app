import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAuth, useCurrentRoom } from './redux';
import { socketService } from '../services/socket';
import { updateUserOnlineStatus } from '../store/slices/usersSlice';
import { updateAuthUserStatus } from '../store/slices/authSlice';
import { addMessage } from '../store/slices/messagesSlice';
import { 
  setCurrentRoom, 
  addTypingUser, 
  removeTypingUser, 
  clearTypingUsers 
} from '../store/slices/chatSlice';
import { 
  receiveIncomingCall,
  updateCallStatus,
  endCall as endCallAction,
  setCallError
} from '../store/slices/callSlice';
import { decryptMessage } from '../utils/encryption';

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const userId = user?.id; // primitive dependency to avoid object reference changes triggering loops
  const currentRoom = useCurrentRoom();
  // Ref to avoid stale closure of currentRoom inside socket event handlers
  const currentRoomRef = useRef(currentRoom);
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Setup socket event listeners
  const setupSocketListeners = useCallback(() => {
    // User status changes
    socketService.onUserStatusChanged((data) => {
      dispatch(updateUserOnlineStatus({
        userId: data.userId,
        isOnline: data.isOnline
      }));
      // If this status update is for the authenticated user, reflect in auth slice
      if (userId && data.userId === userId) {
        dispatch(updateAuthUserStatus({ isOnline: data.isOnline, lastSeen: new Date().toISOString() }));
      }
    });

    // Message received
    socketService.onReceiveMessage((messageData) => {
      const activeRoom = currentRoomRef.current;
      // Only add message if it belongs to the current room
      if (activeRoom && messageData.roomId === activeRoom.id) {
        const decryptedMessage = {
          ...messageData,
          message: decryptMessage(messageData.message || messageData.encryptedMessage)
        };
        dispatch(addMessage(decryptedMessage));
      }
    });

    // Room created/joined
    socketService.onRoomCreated((room) => {
      dispatch(setCurrentRoom(room));
      dispatch(clearTypingUsers());
      
      // Join the room
      socketService.joinRoom(room.id);
    });

    // Typing indicators (exclude self typing)
    socketService.onUserTyping((data) => {
      const activeRoom = currentRoomRef.current;
      // Only show typing for other users, not self
      if (activeRoom && data.roomId === activeRoom.id && data.userId !== userId) {
        if (data.isTyping) {
          dispatch(addTypingUser({
            userId: data.userId,
            userName: data.userName,
            roomId: data.roomId
          }));
        } else {
          dispatch(removeTypingUser({ userId: data.userId }));
        }
      }
    });

    // Connection status changes
    socketService.on('connect', () => {
      console.log('Socket connected:', socketService.getConnectionStatus().socketId);
      if (userId) {
        socketService.userOnline(userId);
      }
    });

    socketService.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Forced logout from server (session taken over elsewhere)
    socketService.on('force_logout', (payload) => {
      console.warn('Force logout received:', payload);
      // Dispatch logout action directly (assuming auth slice has logoutUser action type)
      dispatch({ type: 'auth/logoutUser' });
      // Disconnect the socket to prevent further events
      socketService.disconnect();
    });

    // Call-related event listeners
    socketService.onIncomingCall((callData) => {
      console.log('Incoming call received:', callData);
      dispatch(receiveIncomingCall({
        callId: callData.callId,
        callerId: callData.callerId,
        callerName: callData.callerName,
        callType: callData.callType,
        roomId: callData.roomId
      }));
    });

    socketService.onCallAccepted((callData) => {
      console.log('Call accepted by remote user:', callData);
      dispatch(updateCallStatus('connected'));
    });

    socketService.onCallRejected((callData) => {
      console.log('Call rejected by remote user:', callData);
      dispatch(endCallAction());
    });

    socketService.onCallEnded((callData) => {
      console.log('Call ended by remote user:', callData);
      dispatch(endCallAction());
    });

    socketService.onCallOffer((offerData) => {
      console.log('WebRTC offer received:', offerData);
      window.dispatchEvent(new CustomEvent('webrtc-offer', { detail: offerData }));
    });

    socketService.onCallAnswer((answerData) => {
      console.log('WebRTC answer received:', answerData);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('webrtc-answer', { detail: answerData }));
      }, 100);
    });

    socketService.onIceCandidate((candidateData) => {
      console.log('ICE candidate received:', candidateData);
      window.dispatchEvent(new CustomEvent('webrtc-ice-candidate', { detail: candidateData }));
    });

    socketService.onCallFailed((errorData) => {
      console.log('Call failed:', errorData);
      dispatch(setCallError(errorData.reason));
    });


  // Intentionally excluding currentRoom from deps; we use ref to avoid stale closure without re-registering listeners per room change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Initialize socket connection
  const connect = useCallback(() => {
    if (!userId) return null;

    const socket = socketService.connect();
    
    if (socket) {
      // Notify server that user is online
      socketService.userOnline(userId);
      
      // Setup event listeners
      setupSocketListeners();
    }
    
    return socket;
  }, [userId]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (userId) {
      socketService.userOffline(userId);
    }
    socketService.disconnect();
  }, [userId]);

  // Send message via socket
  const sendMessage = useCallback((messageData) => {
    return socketService.sendMessage(messageData);
  }, []);

  // Generic emit function for Redux actions
  const emit = useCallback((event, data) => {
    return socketService.emit(event, data);
  }, []);

  // Join room
  const joinRoom = useCallback((roomId) => {
    return socketService.joinRoom(roomId);
  }, []);

  // Leave room
  const leaveRoom = useCallback((roomId) => {
    return socketService.leaveRoom(roomId);
  }, []);

  // Create room
  const createRoom = useCallback((roomData) => {
    return socketService.createRoom(roomData);
  }, []);

  // Typing indicators
  const startTyping = useCallback((roomId, userId, userName) => {
    return socketService.startTyping(roomId, userId, userName);
  }, []);

  const stopTyping = useCallback((roomId, userId, userName) => {
    return socketService.stopTyping(roomId, userId, userName);
  }, []);

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    return socketService.getConnectionStatus();
  }, []);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketService.cleanup();
    };
  }, []);

  // Call-related methods
  const initiateCall = useCallback((callData) => {
    return socketService.initiateCall(callData);
  }, []);

  const answerCall = useCallback((callData) => {
    return socketService.answerCall(callData);
  }, []);

  const rejectCall = useCallback((callData) => {
    return socketService.rejectCall(callData);
  }, []);

  const endCall = useCallback((callData) => {
    return socketService.endCall(callData);
  }, []);

  const sendCallOffer = useCallback((offerData) => {
    return socketService.sendCallOffer(offerData);
  }, []);

  const sendCallAnswer = useCallback((answerData) => {
    return socketService.sendCallAnswer(answerData);
  }, []);

  const sendIceCandidate = useCallback((candidateData) => {
    return socketService.sendIceCandidate(candidateData);
  }, []);

  return {
    connect,
    disconnect,
    sendMessage,
    emit,
    joinRoom,
    leaveRoom,
    createRoom,
    startTyping,
    stopTyping,
    getConnectionStatus,
    isConnected: socketService.isConnected,
    // Call methods
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    sendCallOffer,
    sendCallAnswer,
    sendIceCandidate,
  };
};

export default useSocket;