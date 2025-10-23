import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video, Volume2 } from 'lucide-react';
import { useIncomingCall } from '../hooks/redux';
import { useCallManager } from '../hooks/useCallManager';

const IncomingCall = () => {
  const incomingCall = useIncomingCall();
  const { handleAcceptCall, handleRejectCall } = useCallManager();
  const [isVisible, setIsVisible] = useState(false);
  const [ringTone, setRingTone] = useState(null);

  // Show/hide modal based on incoming call
  useEffect(() => {
    if (incomingCall) {
      setIsVisible(true);
      startRingtone();
    } else {
      setIsVisible(false);
      stopRingtone();
    }

    return () => {
      stopRingtone();
    };
  }, [incomingCall]);

  const startRingtone = () => {
    // Create audio context for ringtone (you can replace with actual audio file)
    try {
      const audio = new Audio();
      // You can add a ringtone file here: audio.src = '/sounds/ringtone.mp3';
      audio.loop = true;
      audio.volume = 0.5;
      // audio.play(); // Uncomment when you have an audio file
      setRingTone(audio);
    } catch (error) {
      console.log('Could not play ringtone:', error);
    }
  };

  const stopRingtone = () => {
    if (ringTone) {
      ringTone.pause();
      ringTone.currentTime = 0;
      setRingTone(null);
    }
  };

  const handleAccept = () => {
    handleAcceptCall();
    stopRingtone();
  };

  const handleReject = () => {
    handleRejectCall();
    stopRingtone();
  };

  if (!incomingCall || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-pulse">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-6 text-center text-white">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              {incomingCall.callType === 'video' ? (
                <Video size={32} />
              ) : (
                <Volume2 size={32} />
              )}
            </div>
            <h2 className="text-xl font-semibold mb-1">
              Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call
            </h2>
            <p className="text-lg opacity-90">{incomingCall.callerName}</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">
                  {incomingCall.callerName?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-600 text-sm">
                {incomingCall.callType === 'video' ? 'Video call' : 'Voice call'} from {incomingCall.callerName}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-8">
              {/* Reject Button */}
              <button
                onClick={handleReject}
                className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors focus:outline-none focus:ring-4 focus:ring-red-300"
                aria-label="Reject call"
              >
                <PhoneOff size={24} />
              </button>

              {/* Accept Button */}
              <button
                onClick={handleAccept}
                className="w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center text-white transition-colors focus:outline-none focus:ring-4 focus:ring-green-300"
                aria-label="Accept call"
              >
                <Phone size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-specific fullscreen modal */}
      <div className="md:hidden fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 z-40 flex flex-col items-center justify-center p-6 text-white">
        {/* Caller Avatar */}
        <div className="mb-8">
          <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <span className="text-4xl font-bold">
              {incomingCall.callerName?.charAt(0)?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Call Info */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">{incomingCall.callerName}</h1>
          <p className="text-xl opacity-80">
            Incoming {incomingCall.callType === 'video' ? 'video' : 'voice'} call
          </p>
          <div className="mt-4 flex items-center justify-center">
            {incomingCall.callType === 'video' ? (
              <Video size={24} className="mr-2" />
            ) : (
              <Volume2 size={24} className="mr-2" />
            )}
            <span className="text-lg">{incomingCall.callType === 'video' ? 'Video Call' : 'Voice Call'}</span>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="flex justify-center items-center space-x-16">
          {/* Reject Button */}
          <button
            onClick={handleReject}
            className="w-20 h-20 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-all transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300"
            aria-label="Reject call"
          >
            <PhoneOff size={32} />
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="w-20 h-20 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center text-white transition-all transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300"
            aria-label="Accept call"
          >
            <Phone size={32} />
          </button>
        </div>

        {/* Additional Actions */}
        <div className="mt-8 text-center">
          <p className="text-sm opacity-60">Swipe up to decline</p>
        </div>
      </div>
    </>
  );
};

export default IncomingCall;