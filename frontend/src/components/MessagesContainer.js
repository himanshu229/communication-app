import React from 'react';
import { Send, Users } from 'lucide-react';

const MessagesContainer = ({ 
  selectedUser, 
  messages, 
  typingUsers, 
  user, 
  currentMessage, 
  handleInputChange, 
  handleSendMessage, 
  formatTime, 
  messagesEndRef,
  sending = false
}) => {
  return (
    <div className="flex-1 flex flex-col h-full">
      {!selectedUser ? (
        <div className="hidden md:flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 p-4">
          <Users size={48} className="sm:w-16 sm:h-16 text-gray-400 mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-700 text-center">Select a User to Chat</h3>
          <p className="text-gray-500 text-center text-sm sm:text-base">Choose a user from the sidebar to start an encrypted conversation</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div className={`max-w-xs sm:max-w-sm lg:max-w-md px-3 sm:px-4 py-2 rounded-lg shadow-sm ${
                  msg.senderId === user.id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}>
                  <p className="text-xs sm:text-sm">{msg.message}</p>
                  <span className={`text-xs mt-1 block ${
                    msg.senderId === user.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-white border border-gray-200 rounded-lg px-3 sm:px-4 py-2 shadow-sm">
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-pulse"></span>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {typingUsers.map(u => u.userName).join(', ')} 
                      {typingUsers.length === 1 ? ' is' : ' are'} typing...
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form className="p-3 sm:p-4 bg-white border-t border-gray-200" onSubmit={handleSendMessage}>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={currentMessage}
                onChange={handleInputChange}
                placeholder={`Send encrypted message to ${selectedUser.name}...`}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <button
                type="submit"
                disabled={!currentMessage.trim() || sending}
                className={`p-2 rounded-lg transition-colors ${
                  currentMessage.trim() && !sending
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send size={18} className="sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default MessagesContainer;