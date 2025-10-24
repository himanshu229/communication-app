import React, { useEffect, useRef, useState } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  RotateCcw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useAppDispatch, useCall, useRemoteUser, useMediaState, useCallDuration } from '../hooks/redux';
import { useCallManager } from '../hooks/useCallManager';
import { ringtoneService } from '../services/ringtone';
import { 
  toggleVideo, 
  toggleAudio, 
  toggleSpeaker,
  setCallError,
  updateConnectionState 
} from '../store/slices/callSlice';
import WebRTCService, { getGlobalWebRTCInstance, clearGlobalWebRTCInstance } from '../services/webrtc';

const VideoCall = () => {
  const dispatch = useAppDispatch();
  const call = useCall();
  const remoteUser = useRemoteUser();
  const mediaState = useMediaState();
  const callDuration = useCallDuration();
  const { handleEndCall } = useCallManager();
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const webrtcRef = useRef(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Initialize WebRTC service
  useEffect(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = getGlobalWebRTCInstance();
    }
    
    return () => {
      // Don't cleanup the global instance here - let it persist for the call
    };
  }, []);

  // Setup call when component mounts
  useEffect(() => {
    if (!call.isInCall || !webrtcRef.current) return;
    
    setupCall();
  }, [call.isInCall, call.callStatus]);

  // Listen for remote stream events
  useEffect(() => {
    const handleRemoteStreamEvent = (event) => {
      const { stream } = event.detail;
      console.log('Remote stream event received:', stream);
      displayRemoteStream(stream);
    };

    window.addEventListener('webrtc-remote-stream', handleRemoteStreamEvent);
    
    return () => {
      window.removeEventListener('webrtc-remote-stream', handleRemoteStreamEvent);
    };
  }, []);

  // Auto-hide controls on mobile
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    const timeout = setTimeout(() => {
      if (window.innerWidth <= 768) {
        setShowControls(false);
      }
    }, 3000);
    
    controlsTimeoutRef.current = timeout;
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [showControls]);

  const setupCall = async () => {
    try {
      const webrtc = webrtcRef.current;
      if (!webrtc) return;

      console.log('Setting up call with status:', call.callStatus, 'type:', call.callType);

      // If this is a receiver (connected status), WebRTC should already be initialized
      if (call.callStatus === 'connected') {
        console.log('Call connected - setting up video display for existing WebRTC connection');
        
        // Setup local video display
        if (webrtc.localStream && call.callType === 'video' && localVideoRef.current) {
          localVideoRef.current.srcObject = webrtc.localStream;
          localVideoRef.current.play().catch(error => {
            console.log('Local video autoplay prevented:', error);
          });
        }

        // Display remote stream if available
        if (webrtc.remoteStream) {
          displayRemoteStream(webrtc.remoteStream);
        }

        return;
      }

      // For callers (calling status), initialize WebRTC
      if (call.callStatus === 'calling') {
        console.log('Caller - initializing WebRTC');
        
        if (webrtc.peer) {
          console.log('WebRTC peer already exists for caller - skipping initialization');
          return;
        }

        if (webrtc.isInitializing) {
          console.log('WebRTC already initializing - skipping duplicate');
          return;
        }

        webrtc.isInitializing = true;

        // Initialize local media stream for caller
        const constraints = {
          video: call.callType === 'video',
          audio: true
        };

        const localStream = await webrtc.initializeLocalStream(constraints);
        
        if (localVideoRef.current && call.callType === 'video') {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(error => {
            console.log('Local video autoplay prevented:', error);
          });
        }

        // Setup WebRTC callbacks
        webrtc.onSignal((signalData) => {
          console.log('WebRTC signal generated:', signalData);
          // This will be handled by useCallManager
        });

        webrtc.onError((error) => {
          console.error('WebRTC error:', error);
          dispatch(setCallError(error.message));
        });

        webrtc.onConnect(() => {
          console.log('WebRTC connection established');
          dispatch(updateConnectionState('connected'));
        });

        webrtc.onClose(() => {
          console.log('WebRTC connection closed');
          handleEndCall();
        });

        webrtc.onRemoteStream((stream) => {
          console.log('Remote stream received:', stream);
          displayRemoteStream(stream);
        });
        
        // Create peer as initiator
        webrtc.createPeerAsInitiator(localStream);
        webrtc.isInitializing = false;
      }

    } catch (error) {
      console.error('Error setting up call:', error);
      if (webrtcRef.current) {
        webrtcRef.current.isInitializing = false;
      }
      dispatch(setCallError('Failed to access camera/microphone'));
    }
  };

  const displayRemoteStream = (stream) => {
    console.log('Displaying remote stream:', stream);

    if (call.callType === 'video' && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(error => {
        console.log('Remote video autoplay prevented:', error);
      });
    } else if (call.callType === 'voice') {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch(error => {
        console.error('Error playing remote audio:', error);
      });
    }
  };

  const handleLocalEndCall = () => {
    console.log('Ending call - comprehensive cleanup');
    
    // Play call end sound
    ringtoneService.playCallEndSound();
    
    // Stop all media tracks
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }
    
    // Clear the global WebRTC instance
    clearGlobalWebRTCInstance();
    webrtcRef.current = null;
    
    // Clean up audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    
    // Clear video element sources
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // End call through manager
    handleEndCall();
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

  // Only show component when actually in a call
  if (!call.isInCall || (call.callStatus !== 'calling' && call.callStatus !== 'connected')) {
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
            className="w-full h-full object-cover bg-gray-900"
          />
        )}
        
        {/* Remote Video Placeholder */}
        {call.callType === 'video' && (!remoteVideoRef.current?.srcObject && !webrtcRef.current?.remoteStream) && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl font-bold">
                  {remoteUser.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <p className="text-lg">Waiting for video...</p>
            </div>
          </div>
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
              className="w-full h-full object-cover scale-x-[-1] bg-gray-800"
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
            onClick={handleLocalEndCall}
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
