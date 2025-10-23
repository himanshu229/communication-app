import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Lock, LogOut, Circle, ArrowLeft } from 'lucide-react';
import io from 'socket.io-client';
import { encryptMessage, decryptMessage } from '../utils/encryption';
import MessagesContainer from './MessagesContainer';

const Chat = ({ user, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentRoomRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5001/api/users');
      const userData = await response.json();
      setUsers(userData.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [user.id]);

  const fetchMessages = useCallback(async (roomId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/messages/${roomId}`);
      const messagesData = await response.json();
      const decryptedMessages = messagesData.map(msg => ({
        ...msg,
        message: decryptMessage(msg.message)
      }));
      setMessages(decryptedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  useEffect(() => {
    const newSocket = io('http://localhost:5001');
    setSocket(newSocket);

    // Notify server that user is online
    newSocket.emit('user_online', user.id);

    // Fetch all users
    fetchUsers();

    // Socket event listeners
    newSocket.on('receive_message', (messageData) => {
      // Only add message if it belongs to the current room
      if (currentRoomRef.current && messageData.roomId === currentRoomRef.current.id) {
        setMessages(prev => [...prev, {
          ...messageData,
          message: decryptMessage(messageData.message) // Decrypt the message
        }]);
      }
    });

    newSocket.on('user_status_changed', (data) => {
      setUsers(prev => prev.map(u => 
        u.id === data.userId 
          ? { ...u, isOnline: data.isOnline }
          : u
      ));
    });

    newSocket.on('room_created', (room) => {
      setCurrentRoom(room);
      currentRoomRef.current = room;
      newSocket.emit('join_room', room.id);
      // Clear messages and typing indicators first, then fetch new ones
      setMessages([]);
      setTypingUsers([]);
      // Use a small delay to ensure messages are cleared before fetching
      setTimeout(() => {
        fetchMessages(room.id);
      }, 50);
    });

    newSocket.on('user_typing', (data) => {
      // Only show typing indicator if it's for the current room and not from current user
      if (data.userId !== user.id && currentRoomRef.current && data.roomId === currentRoomRef.current.id) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.userId);
          if (data.isTyping) {
            return [...filtered, data];
          }
          return filtered;
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep currentRoomRef in sync with currentRoom state
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim() && socket && currentRoom) {
      const encryptedMessage = encryptMessage(currentMessage);
      
      socket.emit('send_message', {
        roomId: currentRoom.id,
        message: currentMessage, // Plain text for local display
        encryptedMessage: encryptedMessage, // Encrypted for transmission
        senderId: user.id
      });

      setCurrentMessage('');
      handleTyping(false);
    }
  };

  const handleTyping = (typing) => {
    if (socket && currentRoom) {
      socket.emit('typing', {
        roomId: currentRoom.id,
        userId: user.id,
        userName: user.name,
        isTyping: typing
      });
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
    if (socket) {
      try {
        // Clear messages and typing indicators immediately when switching users
        setMessages([]);
        setTypingUsers([]);
        
        // First check if a room already exists between these users
        const response = await fetch(`http://localhost:5001/api/room/${user.id}/${targetUser.id}`);
        const data = await response.json();

        if (data.success && data.room) {
          // Use existing room
          setCurrentRoom(data.room);
          currentRoomRef.current = data.room;
          setSelectedUser(targetUser);
          socket.emit('join_room', data.room.id);
          
          // Load existing messages
          const decryptedMessages = data.messages.map(msg => ({
            ...msg,
            message: decryptMessage(msg.message)
          }));
          setMessages(decryptedMessages);
          
          console.log(`Joined existing room: ${data.room.id}`);
        } else {
          // Create new room - messages will be loaded via room_created event
          const participants = [user.id, targetUser.id];
          const roomName = `Chat with ${targetUser.name}`;

          socket.emit('create_room', {
            participants,
            roomName
          });

          setSelectedUser(targetUser);
          console.log(`Creating new room for chat with ${targetUser.name}`);
        }
      } catch (error) {
        console.error('Error checking for existing room:', error);
        // Clear messages and typing indicators on error too
        setMessages([]);
        setTypingUsers([]);
        // Fallback to creating new room
        const participants = [user.id, targetUser.id];
        const roomName = `Chat with ${targetUser.name}`;

        socket.emit('create_room', {
          participants,
          roomName
        });

        setSelectedUser(targetUser);
      }
    }
  };

  const handleUserSelect = (targetUser) => {
    // Create or join direct chat with selected user
    createDirectChat(targetUser);
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setCurrentRoom(null);
    currentRoomRef.current = null;
    setMessages([]);
    setTypingUsers([]);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

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
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center font-semibold text-sm sm:text-base">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="m-0 text-sm sm:text-base font-semibold truncate">{user.name}</h3>
            <span className="text-xs opacity-80 block truncate">{user.phoneNumber}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-3">
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
            <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-xl">
              {users.length} online
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 md:p-2">
            {users.map(u => (
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
            
            {users.length === 0 && (
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
          messages={messages}
          typingUsers={typingUsers}
          user={user}
          currentMessage={currentMessage}
          handleInputChange={handleInputChange}
          handleSendMessage={handleSendMessage}
          formatTime={formatTime}
          messagesEndRef={messagesEndRef}
        />
      </div>
    </div>
  );
};

export default Chat;