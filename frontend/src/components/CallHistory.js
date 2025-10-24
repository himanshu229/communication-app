import React, { useState, useEffect } from 'react';
import { Phone, Video, PhoneOff, Clock, User } from 'lucide-react';
import { useCallHistory } from '../hooks/redux';
import { useAppDispatch } from '../hooks/redux';
import { setCallHistory } from '../store/slices/callSlice';
import { apiService } from '../services/api';

const CallHistory = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const callHistory = useCallHistory();
  const [loading, setLoading] = useState(false);

  // Load call history when component opens
  useEffect(() => {
    if (isOpen && callHistory.length === 0) {
      loadCallHistory();
    }
  }, [isOpen]);

  const loadCallHistory = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCallHistory();
      if (response.success) {
        dispatch(setCallHistory(response.calls));
      }
    } catch (error) {
      console.error('Error loading call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCallIcon = (callType, status) => {
    if (status === 'rejected' || status === 'missed') {
      return <PhoneOff size={16} className="text-red-500" />;
    }
    return callType === 'video' ? 
      <Video size={16} className="text-blue-500" /> : 
      <Phone size={16} className="text-green-500" />;
  };

  const getCallStatusText = (status) => {
    switch (status) {
      case 'ended':
        return 'Call ended';
      case 'rejected':
        return 'Call rejected';
      case 'missed':
        return 'Missed call';
      default:
        return 'Unknown';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Clock size={24} className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Call History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-opacity-30 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading call history...</span>
            </div>
          ) : callHistory.length === 0 ? (
            <div className="text-center py-12">
              <Phone size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No call history</h3>
              <p className="text-gray-500">Your call history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {callHistory.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {/* Call Icon */}
                  <div className="flex-shrink-0">
                    {getCallIcon(call.callType, call.status)}
                  </div>

                  {/* Call Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={16} className="text-gray-500" />
                      <span className="font-medium text-gray-900 truncate">
                        {call.userName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{getCallStatusText(call.status)}</span>
                      <span>•</span>
                      <span>{formatDuration(call.duration)}</span>
                      <span>•</span>
                      <span>{formatDate(call.timestamp)}</span>
                    </div>
                  </div>

                  {/* Call Type Badge */}
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      call.callType === 'video' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {call.callType === 'video' ? 'Video' : 'Voice'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {callHistory.length} call{callHistory.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={loadCallHistory}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallHistory;
