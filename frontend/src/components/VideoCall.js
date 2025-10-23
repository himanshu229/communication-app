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
import { useAppDispatch, useCall, useRemoteUser, useMediaState } from '../hooks/redux';
import { useCallManager } from '../hooks/useCallManager';
import { ringtoneService } from '../services/ringtone';
import { 
  toggleVideo, 
  toggleAudio, 
  toggleSpeaker,
  setCallError,
  updateConnectionState 
} from '../store/slices/callSlice';
import WebRTCService, { forceStopAllMediaTracks } from '../services/webrtc';
import { socketService } from '../services/socket';

const VideoCall = () => {
  const dispatch = useAppDispatch();
  const call = useCall();
  const remoteUser = useRemoteUser();
  const mediaState = useMediaState();
  const { handleEndCall: endCallFromManager } = useCallManager();
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const webrtcRef = useRef(null);
  const callStartTimeRef = useRef(null);
  
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Helper function to display remote stream
  const displayRemoteStream = (stream) => {
    if (call.callType === 'video' && remoteVideoRef.current) {
      console.log('Displaying remote video stream');
      remoteVideoRef.current.srcObject = stream;
      setTimeout(() => {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.play().catch(error => {
            console.log('Remote video autoplay prevented:', error);
          });
        }
      }, 100);
    } else if (call.callType === 'voice') {
      console.log('Setting up remote audio stream');
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.volume = 1.0;
      }
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.autoplay = true;
      remoteAudioRef.current.play().catch(error => {
        console.error('Error playing remote audio:', error);
      });
    }
  };

  // Helper function to setup WebRTC callbacks
  const setupWebRTCCallbacks = (webrtc) => {
    console.log('Setting up WebRTC callbacks');
    
    webrtc.onRemoteStream((stream) => {
      console.log('Remote stream received via callback:', stream);
      displayRemoteStream(stream);
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

    webrtc.onSignal((signalData) => {
      console.log('WebRTC signal generated:', signalData);
      if (call.callType && remoteUser.id) {
        if (signalData.type === 'offer') {
          console.log('Sending call offer');
          socketService.sendCallOffer({
            to: remoteUser.id,
            from: call.localUserId,
            signal: signalData,
            callType: call.callType
          });
        } else if (signalData.type === 'answer') {
          console.log('Sending call answer');
          socketService.sendCallAnswer({
            to: remoteUser.id,
            from: call.localUserId,
            signal: signalData
          });
        }
      }
    });
  };

  // Initialize WebRTC service and set up callbacks
  useEffect(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCService();
    }
    
    // Set up callbacks immediately when WebRTC service is available
    if (webrtcRef.current) {
      setupWebRTCCallbacks(webrtcRef.current);
    }
    
    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
        webrtcRef.current = null;
      }
    };
  }, []);

  // Setup call when component mounts or call status changes
  useEffect(() => {
    if (call.isInCall && call.callStatus === 'connected') {
      console.log('Setting up call - status connected');
      setupCall();
      if (!callStartTimeRef.current) {
        callStartTimeRef.current = Date.now();
        // Play connection sound
        ringtoneService.playNotificationBeep();
      }
    } else if (call.isInCall && call.callStatus === 'calling') {
      console.log('Setting up call - status calling (initiator)');
      setupCall();
    }
  }, [call.isInCall, call.callStatus]);

  // Continuously check for streams and display them
  useEffect(() => {
    if (!call.isInCall || !webrtcRef.current) return;

    const interval = setInterval(() => {
      const webrtc = webrtcRef.current;
      if (!webrtc) return;

      // Check and display local stream (from WebRTC service only)
      if (webrtc.localStream && call.callType === 'video' && localVideoRef.current) {
        if (localVideoRef.current.srcObject !== webrtc.localStream) {
          console.log('Setting local video stream from WebRTC');
          localVideoRef.current.srcObject = webrtc.localStream;
        }
      }

      // Check and display remote stream (from WebRTC service only)
      if (webrtc.remoteStream && remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
        console.log('Setting remote video stream from WebRTC');
        displayRemoteStream(webrtc.remoteStream);
      }
    }, 500); // Check every 500ms

    return () => clearInterval(interval);
  }, [call.isInCall, call.callType]);

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
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    const timeout = setTimeout(() => {
      if (window.innerWidth <= 768) { // Mobile breakpoint
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
      if (!webrtc) {
        console.error('WebRTC service not available');
        return;
      }

      console.log('Setting up call with status:', call.callStatus, 'type:', call.callType);

      // If this is a receiver (connected status), WebRTC should already be initialized by useCallManager
      if (call.callStatus === 'connected') {
        console.log('Call connected - setting up video display for existing WebRTC connection');
        
        // Callbacks are already set up in useEffect, just set up video display

        // Helper function to setup local video for receiver
        const setupLocalVideoForReceiver = () => {
          // Only use WebRTC service stream
          const localStream = webrtc.localStream;
          
          if (localStream && call.callType === 'video' && localVideoRef.current) {
            console.log('Setting up local video display for receiver');
            localVideoRef.current.srcObject = localStream;
            setTimeout(() => {
              if (localVideoRef.current && localVideoRef.current.srcObject) {
                localVideoRef.current.play().catch(error => {
                  console.log('Local video autoplay prevented:', error);
                });
              }
            }, 100);
            return true;
          }
          return false;
        };

        // Try to setup local video immediately
        const localVideoSetup = setupLocalVideoForReceiver();
        
        // If local video not ready yet, monitor for it
        if (!localVideoSetup) {
          console.log('Local stream not ready yet for receiver, monitoring...');
          const checkLocalStream = setInterval(() => {
            if (setupLocalVideoForReceiver()) {
              console.log('Local video setup successful for receiver');
              clearInterval(checkLocalStream);
            }
          }, 200);
          
          // Clear interval after 10 seconds to prevent infinite checking
          setTimeout(() => clearInterval(checkLocalStream), 10000);
        }

        // If remote stream already exists, display it
        const existingRemoteStream = webrtc.remoteStream;
        if (existingRemoteStream) {
          console.log('Remote stream already available, displaying');
          displayRemoteStream(existingRemoteStream);
        }

        return;
      }

      // For callers (calling status), initialize WebRTC
      if (call.callStatus === 'calling') {
        console.log('Caller - initializing WebRTC');
        
        // Check if peer is already created to avoid duplicate initialization
        if (webrtc.peer) {
          console.log('WebRTC peer already exists for caller');
          return;
        }

        // Callbacks are already set up in useEffect

        // Initialize local media stream for caller
        const constraints = {
          video: call.callType === 'video',
          audio: true
        };

        console.log('Getting user media for caller with constraints:', constraints);
        const localStream = await webrtc.initializeLocalStream(constraints);
        
        if (localVideoRef.current && call.callType === 'video') {
          localVideoRef.current.srcObject = localStream;
          setTimeout(() => {
            if (localVideoRef.current && localVideoRef.current.srcObject) {
              localVideoRef.current.play().catch(error => {
                console.log('Local video autoplay prevented:', error);
              });
            }
          }, 100);
        }

        console.log('Creating peer as initiator');
        webrtc.createPeerAsInitiator(localStream);
      }

    } catch (error) {
      console.error('Error setting up call:', error);
      dispatch(setCallError('Failed to access camera/microphone'));
    }
  };

  const handleEndCall = () => {
    console.log('🚨 ENDING CALL - COMPREHENSIVE CLEANUP STARTING');
    
    // Play call end sound
    ringtoneService.playCallEndSound();
    
    // STEP 1: Force stop all media tracks using comprehensive cleanup
    forceStopAllMediaTracks();
    
    // STEP 2: Stop all media tracks immediately to turn off camera/microphone
    const stopAllMediaTracks = () => {
      console.log('🔧 Stopping all media tracks from all sources');
      
      // Stop tracks from WebRTC service
      if (webrtcRef.current && webrtcRef.current.localStream) {
        webrtcRef.current.localStream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            console.log('🎥 Stopping WebRTC local track:', track.kind, track.id, 'readyState:', track.readyState);
            track.stop();
          }
        });
      }
      
      // Stop tracks from video elements
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          if (track.readyState !== 'ended') {
            console.log('🎥 Stopping local video element track:', track.kind, track.id, 'readyState:', track.readyState);
            track.stop();
          }
        });
      }
      
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
        const tracks = remoteVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          if (track.readyState !== 'ended') {
            console.log('🎥 Stopping remote video element track:', track.kind, track.id, 'readyState:', track.readyState);
            track.stop();
          }
        });
      }
    };
    
    // STEP 3: Execute comprehensive track stopping
    stopAllMediaTracks();
    
    // STEP 4: Clean up WebRTC service (this should also stop tracks)
    if (webrtcRef.current) {
      console.log('🔧 Cleaning up WebRTC service');
      webrtcRef.current.cleanup();
    }
    
    // STEP 5: Clean up audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    
    // STEP 6: Clear video element sources
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // STEP 7: Final verification - check if any tracks are still active
    setTimeout(() => {
      if (window.globalMediaTracks && window.globalMediaTracks.length > 0) {
        console.log('⚠️  Still have active global tracks, force stopping:', window.globalMediaTracks.length);
        window.globalMediaTracks.forEach(track => {
          if (track.readyState !== 'ended') {
            console.log('🚨 Final cleanup - stopping track:', track.kind, track.id);
            track.stop();
          }
        });
        window.globalMediaTracks = [];
      }
      console.log('✅ Camera cleanup verification complete');
    }, 1000);
    
    // STEP 8: End call through manager (this will notify remote user)
    endCallFromManager();
    
    console.log('🏁 Call cleanup sequence completed');
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

  // Cleanup effect when component unmounts or call ends
  useEffect(() => {
    return () => {
      console.log('🧹 VideoCall component cleanup');
      
      // Clean up timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      // Force stop all media tracks using global utility
      forceStopAllMediaTracks();
      
      // Stop all media tracks
      const stopAllTracks = () => {
        // From WebRTC service
        if (webrtcRef.current && webrtcRef.current.localStream) {
          webrtcRef.current.localStream.getTracks().forEach(track => {
            if (track.readyState !== 'ended') {
              console.log('🎥 Component cleanup - stopping WebRTC track:', track.kind, track.id, 'readyState:', track.readyState);
              track.stop();
            }
          });
        }
        
        // From video elements
        if (localVideoRef.current && localVideoRef.current.srcObject) {
          const tracks = localVideoRef.current.srcObject.getTracks();
          tracks.forEach(track => {
            if (track.readyState !== 'ended') {
              console.log('🎥 Component cleanup - stopping local video track:', track.kind, track.id, 'readyState:', track.readyState);
              track.stop();
            }
          });
        }
        
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          const tracks = remoteVideoRef.current.srcObject.getTracks();
          tracks.forEach(track => {
            if (track.readyState !== 'ended') {
              console.log('🎥 Component cleanup - stopping remote video track:', track.kind, track.id, 'readyState:', track.readyState);
              track.stop();
            }
          });
        }
      };
      
      stopAllTracks();
      
      // Clean up video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      
      // Clean up audio
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      }
      
      // Clean up WebRTC
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
      
      // Final global track cleanup verification
      setTimeout(() => {
        if (window.globalMediaTracks && window.globalMediaTracks.length > 0) {
          console.log('🚨 Component cleanup - still have tracks, force stopping:', window.globalMediaTracks.length);
          window.globalMediaTracks.forEach(track => {
            if (track.readyState !== 'ended') {
              console.log('🎥 Final component cleanup - stopping track:', track.kind, track.id);
              track.stop();
            }
          });
          window.globalMediaTracks = [];
        }
        console.log('✅ Component cleanup verification complete');
      }, 500);
    };
  }, []);

  if (!call.isInCall && call.callStatus !== 'calling') {
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
            onLoadedMetadata={() => console.log('Remote video metadata loaded')}
            onPlay={() => console.log('Remote video started playing')}
            onError={(e) => console.error('Remote video error:', e)}
          />
        )}
        
        {/* Remote Video Placeholder */}
        {call.callType === 'video' && !remoteVideoRef.current?.srcObject && (
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
              className="w-full h-full object-cover scale-x-[-1] bg-gray-800" // Mirror local video
              onLoadedMetadata={() => console.log('Local video metadata loaded')}
              onPlay={() => console.log('Local video started playing')}
              onError={(e) => console.error('Local video error:', e)}
            />
            {!mediaState.isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff size={20} className="text-white" />
              </div>
            )}
            {!localVideoRef.current?.srcObject && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <span className="text-white text-xs">No Video</span>
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