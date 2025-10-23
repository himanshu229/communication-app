import React, { useEffect, useRef, useState } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  RotateCcw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useAppDispatch, useCall, useRemoteUser, useMediaState } from '../hooks/redux';
import { useCallManager } from '../hooks/useCallManager';
import { 
  toggleVideo, 
  toggleAudio, 
  toggleSpeaker,
  setCallError,
  updateConnectionState 
} from '../store/slices/callSlice';
import WebRTCService from '../services/webrtc';
import { socketService } from '../services/socket';

const VideoCall = () => {
  const dispatch = useAppDispatch();
  const call = useCall();
  const remoteUser = useRemoteUser();
  const mediaState = useMediaState();
  const { handleEndCall: endCallFromManager } = useCallManager();
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const webrtcRef = useRef(null);
  const callStartTimeRef = useRef(null);
  
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);

  // Initialize WebRTC service
  useEffect(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCService();
    }
    
    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
        webrtcRef.current = null;
      }
    };
  }, []);

  // Setup call when component mounts
  useEffect(() => {
    if (call.isInCall && call.callStatus === 'connected') {
      setupCall();
      callStartTimeRef.current = Date.now();
    }
  }, [call.isInCall, call.callStatus]);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (call.callStatus === 'connected' && callStartTimeRef.current) {
      interval = setInterval(() => {
        const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallDuration(duration);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [call.callStatus]);

  // Auto-hide controls on mobile
  useEffect(() => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (window.innerWidth <= 768) { // Mobile breakpoint
        setShowControls(false);
      }
    }, 3000);
    
    setControlsTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [showControls]);

  const setupCall = async () => {
    try {
      const webrtc = webrtcRef.current;
      if (!webrtc) return;

      // Setup WebRTC callbacks
      webrtc.onRemoteStream((stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });

      webrtc.onError((error) => {
        console.error('WebRTC error:', error);
        dispatch(setCallError(error.message));
      });

      webrtc.onConnect(() => {
        dispatch(updateConnectionState('connected'));
      });

      webrtc.onClose(() => {
        handleEndCall();
      });

      webrtc.onSignal((signalData) => {
        // Send signal to remote peer via socket
        if (call.callType && remoteUser.id) {
          if (signalData.type === 'offer') {
            socketService.sendCallOffer({
              to: remoteUser.id,
              from: call.localUserId,
              signal: signalData,
              callType: call.callType
            });
          } else if (signalData.type === 'answer') {
            socketService.sendCallAnswer({
              to: remoteUser.id,
              from: call.localUserId,
              signal: signalData
            });
          }
        }
      });

      // Initialize local media stream
      const constraints = {
        video: call.callType === 'video',
        audio: true
      };

      const localStream = await webrtc.initializeLocalStream(constraints);
      
      if (localVideoRef.current && call.callType === 'video') {
        localVideoRef.current.srcObject = localStream;
      }

      // Create peer connection based on call status
      if (call.callStatus === 'calling') {
        webrtc.createPeerAsInitiator(localStream);
      } else if (call.callStatus === 'connected') {
        webrtc.createPeerAsReceiver(localStream);
      }

    } catch (error) {
      console.error('Error setting up call:', error);
      dispatch(setCallError('Failed to access camera/microphone'));
    }
  };

  const handleEndCall = () => {
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }
    
    endCallFromManager();
  };

  const handleToggleVideo = () => {
    if (webrtcRef.current) {
      const enabled = !mediaState.isVideoEnabled;
      webrtcRef.current.toggleVideo(enabled);
      dispatch(toggleVideo());
    }
  };

  const handleToggleAudio = () => {
    if (webrtcRef.current) {
      const enabled = !mediaState.isAudioEnabled;
      webrtcRef.current.toggleAudio(enabled);
      dispatch(toggleAudio());
    }
  };

  const handleToggleSpeaker = () => {
    dispatch(toggleSpeaker());
    // Speaker toggle is handled by the browser/device
  };

  const handleSwitchCamera = async () => {
    if (webrtcRef.current && call.callType === 'video') {
      try {
        await webrtcRef.current.switchCamera();
      } catch (error) {
        console.error('Error switching camera:', error);
      }
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleScreenTap = () => {
    if (window.innerWidth <= 768) {
      setShowControls(true);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!call.isInCall) {
    return null;
  }

  return (
    <div 
      className={`
        fixed inset-0 bg-black z-50 flex flex-col
        ${isFullscreen ? 'w-screen h-screen' : ''}
      `}
      onClick={handleScreenTap}
    >
      {/* Header */}
      <div className={`
        absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent
        transition-opacity duration-300
        ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 className="text-lg font-semibold">{remoteUser.name}</h2>
            <p className="text-sm opacity-80">
              {call.callStatus === 'connected' ? formatDuration(callDuration) : call.callStatus}
            </p>
          </div>
          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative">
        {/* Remote Video */}
        {call.callType === 'video' && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Voice Call Avatar */}
        {call.callType === 'voice' && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
            <div className="text-center text-white">
              <div className="w-32 h-32 md:w-48 md:h-48 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl md:text-6xl font-bold">
                  {remoteUser.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-2">{remoteUser.name}</h2>
              <p className="text-lg opacity-80">{formatDuration(callDuration)}</p>
            </div>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        {call.callType === 'video' && (
          <div className="absolute top-4 right-4 w-24 h-32 md:w-32 md:h-40 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/30">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]" // Mirror local video
            />
            {!mediaState.isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff size={20} className="text-white" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={`
        absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/80 to-transparent
        transition-opacity duration-300
        ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        <div className="flex items-center justify-center space-x-4 md:space-x-6">
          {/* Audio Toggle */}
          <button
            onClick={handleToggleAudio}
            className={`
              p-3 md:p-4 rounded-full transition-colors
              ${mediaState.isAudioEnabled 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
              }
            `}
          >
            {mediaState.isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          {/* Video Toggle (only for video calls) */}
          {call.callType === 'video' && (
            <button
              onClick={handleToggleVideo}
              className={`
                p-3 md:p-4 rounded-full transition-colors
                ${mediaState.isVideoEnabled 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
                }
              `}
            >
              {mediaState.isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          )}

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="p-4 md:p-5 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <PhoneOff size={28} />
          </button>

          {/* Speaker Toggle */}
          <button
            onClick={handleToggleSpeaker}
            className={`
              p-3 md:p-4 rounded-full transition-colors
              ${mediaState.isSpeakerEnabled 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
              }
            `}
          >
            {mediaState.isSpeakerEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>

          {/* Camera Switch (only for video calls on mobile) */}
          {call.callType === 'video' && window.innerWidth <= 768 && (
            <button
              onClick={handleSwitchCamera}
              className="p-3 md:p-4 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <RotateCcw size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;