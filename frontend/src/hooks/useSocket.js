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

    // Typing indicators (include self typing)
    socketService.onUserTyping((data) => {
      const activeRoom = currentRoomRef.current;
      if (activeRoom && data.roomId === activeRoom.id) {
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

  // Intentionally excluding currentRoom from deps; we use ref to avoid stale closure without re-registering listeners per room change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, userId]);

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
  }, [userId, setupSocketListeners]);

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
  };
};

export default useSocket;