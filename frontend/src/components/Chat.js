import React, { useState, useEffect, useRef } from 'react';
import { Users, Lock, LogOut, Circle, ArrowLeft, Video, Phone, Clock } from 'lucide-react';
import { useAppDispatch, useAuth, useUsers, useChat, useMessages } from '../hooks/redux';
import { useSocket } from '../hooks/useSocket';
import { fetchAllUsers } from '../store/slices/usersSlice';
import { getOrCreateRoom, setSelectedUser, clearCurrentRoom } from '../store/slices/chatSlice';
import { fetchRoomMessages, sendMessage as sendMessageAction, clearCurrentRoomMessages } from '../store/slices/messagesSlice';
import { initiateCall, setLocalUserId } from '../store/slices/callSlice';
import { useCallManager } from '../hooks/useCallManager';
import MessagesContainer from './MessagesContainer';
import CallHistory from './CallHistory';

const Chat = ({ onLogout }) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth(); // Get user from Redux state instead of props
  const { usersList, onlineUsers } = useUsers();
  const { currentRoom, selectedUser, typingUsers } = useChat();
  const { currentRoomMessages, sending } = useMessages();
  
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentRoomRef = useRef(null);

  // Socket connection and functions
  const { 
    connect, 
    disconnect, 
    emit,
    createRoom, 
    startTyping, 
    stopTyping,
    joinRoom,
    leaveRoom
  } = useSocket();

  // Call manager
  const { initiateCall } = useCallManager();

  // Initialize socket connection and fetch users
  useEffect(() => {
    const socket = connect();
    if (socket && user?.id) {
      dispatch(fetchAllUsers(user.id));
      dispatch(setLocalUserId(user.id));
    }

    return () => {
      disconnect();
    };
  }, [user?.id]);

  // Detect mobile viewport (simple matchMedia listener)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handleChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Keep currentRoomRef in sync with currentRoom state
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentRoomMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (currentMessage.trim() && currentRoom && !sending) {
      try {
        // Dispatch Redux action for sending message
        await dispatch(sendMessageAction({
          roomId: currentRoom.id,
          message: currentMessage,
          senderId: user.id,
          socketEmit: emit
        })).unwrap();

        setCurrentMessage('');
        handleTyping(false);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const handleTyping = (typing) => {
    if (currentRoom && user?.id && user?.name) {
      if (typing) {
        startTyping(currentRoom.id, user.id, user.name);
      } else {
        stopTyping(currentRoom.id, user.id, user.name);
      }
    }
  };

  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      handleTyping(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      handleTyping(false);
    }, 1000);
  };

  const createDirectChat = async (targetUser) => {
    if (!user?.id) return;
    
    try {
      // Leave previous room if exists for privacy isolation
      const prevRoomId = currentRoomRef.current?.id;
      if (prevRoomId) {
        leaveRoom(prevRoomId);
      }

      // Clear current room state & messages before switching
      dispatch(clearCurrentRoom());
      dispatch(clearCurrentRoomMessages());
      dispatch(setSelectedUser(targetUser));

      // Try to get or create room between users
      const result = await dispatch(getOrCreateRoom({
        userId1: user.id,
        userId2: targetUser.id
      })).unwrap();

      if (result.success && result.room) {
        // Join only the specific room for A<->B
        joinRoom(result.room.id);
        dispatch(fetchRoomMessages(result.room.id));
      } else {
        // Create new room via socket
        const participants = [user.id, targetUser.id];
        const roomName = `Chat with ${targetUser.name}`;

        createRoom({
          participants,
          roomName
        });
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);
      // Fallback to creating new room
      const participants = [user.id, targetUser.id];
      const roomName = `Chat with ${targetUser.name}`;

      createRoom({
        participants,
        roomName
      });
    }
  };

  const handleUserSelect = (targetUser) => {
    createDirectChat(targetUser);
  };

  const handleBackToUsers = () => {
    const prevRoomId = currentRoomRef.current?.id;
    if (prevRoomId) {
      leaveRoom(prevRoomId);
    }
    dispatch(setSelectedUser(null));
    dispatch(clearCurrentRoom());
    dispatch(clearCurrentRoomMessages());
  };

  const handleInitiateCall = async (callType) => {
    if (!selectedUser || !currentRoom || !user?.id) {
      console.error('Cannot initiate call: missing required data');
      return;
    }

    try {
      // Use call manager to initiate call
      await initiateCall(
        selectedUser.id,
        selectedUser.name,
        callType,
        currentRoom.id
      );
    } catch (error) {
      console.error('Error initiating call:', error);
    }
  };

  const handleVideoCall = () => {
    handleInitiateCall('video');
  };

  const handleVoiceCall = () => {
    handleInitiateCall('voice');
  };


  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Safety check: if user is not loaded yet, show loading
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5 text-white">
        <div className="w-10 h-10 border-4 border-white border-opacity-30 border-t-white rounded-full animate-spin"></div>
        <p className="text-lg font-medium m-0">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3">
          {selectedUser && (
            <button
              className="md:hidden flex p-1.5 sm:p-2 bg-white bg-opacity-20 border-none rounded-full text-white cursor-pointer transition-all duration-300 hover:bg-opacity-30 hover:scale-110 items-center justify-center"
              onClick={handleBackToUsers}
              title="Back to Users"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
            </button>
          )}
          {(() => {
            // Decide which user to display: on mobile show selectedUser if exists, else auth user
            const displayUser = isMobile && selectedUser ? selectedUser : user;
            return (
              <>
                <div className="relative">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center font-semibold text-sm sm:text-base">
                    {displayUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  {/* Online/Offline indicator */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-white shadow ${
                      displayUser?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    title={displayUser?.isOnline ? 'Online' : 'Offline'}
                  ></span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-sm sm:text-base font-semibold truncate">
                    {displayUser?.name || 'Loading...'}
                  </h3>
                  <span className="text-xs opacity-80 block truncate">
                    {displayUser?.phoneNumber || ''}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
        
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Call buttons - only show when user is selected and online */}
          {selectedUser && selectedUser.isOnline && currentRoom && (
            <div className="flex items-center gap-2">
              {/* Video Call Button */}
              <button
                onClick={handleVideoCall}
                className="p-2 bg-white bg-opacity-20 border-none rounded-full text-white cursor-pointer transition-all duration-300 hover:bg-opacity-30 hover:scale-110 flex items-center justify-center"
                title="Start video call"
              >
                <Video size={18} className="sm:w-5 sm:h-5" />
              </button>
              
              {/* Voice Call Button */}
              <button
                onClick={handleVoiceCall}
                className="p-2 bg-white bg-opacity-20 border-none rounded-full text-white cursor-pointer transition-all duration-300 hover:bg-opacity-30 hover:scale-110 flex items-center justify-center"
                title="Start voice call"
              >
                <Phone size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          )}

          {/* Call History Button */}
          <button
            onClick={() => setShowCallHistory(true)}
            className="p-2 bg-white bg-opacity-20 border-none rounded-full text-white cursor-pointer transition-all duration-300 hover:bg-opacity-30 hover:scale-110 flex items-center justify-center"
            title="Call history"
          >
            <Clock size={18} className="sm:w-5 sm:h-5" />
          </button>

          {currentRoom && selectedUser && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white bg-opacity-20 rounded-2xl text-sm">
              <Lock size={16} />
              <span className="hidden lg:inline">Chat with {selectedUser.name}</span>
              <span className="lg:hidden">Chat</span>
            </div>
          )}
          
          {!selectedUser && (
            <div className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-white bg-opacity-20 rounded-2xl text-sm">
              <Users size={16} />
              <span>Select User</span>
            </div>
          )}
          
          <button
            className="p-1.5 sm:p-2 bg-white bg-opacity-20 border-none rounded-full text-white cursor-pointer transition-all duration-300 hover:bg-opacity-20 hover:text-red-400 hover:scale-110 flex items-center justify-center"
            onClick={onLogout}
            title="Logout"
          >
            <LogOut size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <div className={`flex flex-1 overflow-hidden relative`}>
        {/* User List Sidebar - Full screen on mobile, sidebar on desktop */}
        <div className={`w-full md:w-72 bg-gray-50 border-r border-gray-200 flex flex-col min-h-0 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 sm:p-5 border-b border-gray-200 bg-white flex justify-between items-center">
            <h4 className="m-0 flex items-center gap-2 text-gray-800 flex-1 text-sm sm:text-base">
              <Users size={18} className="sm:w-5 sm:h-5" /> Users
            </h4>
            <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-xl" title={`Online: ${onlineUsers.length}`}>
              {onlineUsers.length - 1} online
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 md:p-2">
            {usersList.map(u => (
              <div
                key={u.id}
                className={`flex items-center gap-3 p-4 md:p-3 rounded-xl cursor-pointer transition-all duration-300 mb-2 md:mb-1 ${
                  selectedUser?.id === u.id 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white transform translate-x-1 shadow-lg shadow-indigo-500/30' 
                    : 'hover:bg-white hover:shadow-lg bg-gray-100 md:bg-transparent'
                }`}
                onClick={() => handleUserSelect(u)}
              >
                <div className={`w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center font-semibold text-base md:text-sm ${
                  selectedUser?.id === u.id 
                    ? 'bg-white bg-opacity-20' 
                    : 'bg-indigo-500 text-white'
                }`}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                  <span className="font-semibold text-base md:text-sm truncate">{u.name}</span>
                  <span className="text-sm md:text-xs opacity-70 truncate">{u.phoneNumber}</span>
                </div>
                <div className={`${u.isOnline ? 'text-green-500' : 'text-gray-500'}`}>
                  <Circle size={10} className="md:w-2 md:h-2" fill="currentColor" />
                </div>
              </div>
            ))}
            
            {usersList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 md:py-10 px-5 text-center text-gray-500">
                <Users size={64} className="md:w-12 md:h-12 mb-4 md:mb-3 opacity-50" />
                <h3 className="text-lg md:text-base font-semibold mb-2 text-gray-700">No Users Available</h3>
                <p className="m-0 text-sm md:text-xs text-gray-500">No other users are currently online</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <MessagesContainer
          selectedUser={selectedUser}
          messages={currentRoomMessages}
          typingUsers={typingUsers}
          user={user}
          currentMessage={currentMessage}
          handleInputChange={handleInputChange}
          handleSendMessage={handleSendMessage}
          formatTime={formatTime}
          messagesEndRef={messagesEndRef}
          sending={sending}
        />
      </div>

      {/* Call History Modal */}
      <CallHistory 
        isOpen={showCallHistory} 
        onClose={() => setShowCallHistory(false)} 
      />
    </div>
  );
};

export default Chat;