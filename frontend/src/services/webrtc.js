import SimplePeer from 'simple-peer';

// Global WebRTC instance manager to prevent multiple instances
let globalWebRTCInstance = null;

export const getGlobalWebRTCInstance = () => {
  if (!globalWebRTCInstance) {
    console.log('Creating new global WebRTC instance');
    globalWebRTCInstance = new WebRTCService();
  } else {
    console.log('Reusing existing global WebRTC instance');
  }
  return globalWebRTCInstance;
};

export const clearGlobalWebRTCInstance = () => {
  if (globalWebRTCInstance) {
    console.log('Clearing global WebRTC instance');
    globalWebRTCInstance.cleanup();
    globalWebRTCInstance = null;
  }
};

class WebRTCService {
  constructor() {
    this.peer = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isInitiator = false;
    this.isInitializing = false;
    this.onStreamCallback = null;
    this.onErrorCallback = null;
    this.onConnectCallback = null;
    this.onCloseCallback = null;
    this.onSignalCallback = null;
    this.allTracks = [];
  }

  // Initialize local media stream
  async initializeLocalStream(constraints = { video: true, audio: true }) {
    try {
      console.log('Requesting media with constraints:', constraints);
      
      // Ensure audio constraints are properly set
      if (constraints.audio === true) {
        constraints.audio = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        };
      }
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Track all created tracks for cleanup
      this.allTracks = [];
      this.localStream.getTracks().forEach(track => {
        this.allTracks.push(track);
        console.log('Tracking media track:', track.kind, track.id);
      });
      
      console.log('Media stream obtained:', {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length
      });
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Unable to access camera/microphone. Please check permissions.');
    }
  }

  // Create peer connection as initiator (caller)
  createPeerAsInitiator(stream) {
    if (this.peer) {
      console.log('Peer already exists, destroying old one');
      this.peer.destroy();
    }
    
    this.isInitiator = true;
    this.peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });
    
    this.setupPeerListeners();
    return this.peer;
  }

  // Create peer connection as receiver (callee)
  createPeerAsReceiver(stream) {
    if (this.peer) {
      console.log('Peer already exists, destroying old one');
      this.peer.destroy();
    }
    
    this.isInitiator = false;
    this.peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });
    
    this.setupPeerListeners();
    return this.peer;
  }

  // Setup peer event listeners
  setupPeerListeners() {
    if (!this.peer) return;

    // Handle signaling data (offer/answer)
    this.peer.on('signal', (data) => {
      console.log('WebRTC signal generated:', data);
      if (this.onSignalCallback) {
        this.onSignalCallback(data);
      }
    });

    // Handle incoming stream
    this.peer.on('stream', (stream) => {
      console.log('Remote stream received:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });
      
      this.remoteStream = stream;
      
      if (this.onStreamCallback) {
        this.onStreamCallback(stream);
      }
    });

    // Handle connection established
    this.peer.on('connect', () => {
      console.log('WebRTC connection established');
      if (this.onConnectCallback) {
        this.onConnectCallback();
      }
    });

    // Handle connection closed
    this.peer.on('close', () => {
      console.log('WebRTC connection closed');
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    });

    // Handle errors
    this.peer.on('error', (error) => {
      console.error('WebRTC error:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    });
  }

  // Process incoming signal (offer/answer)
  processSignal(signalData) {
    if (!this.peer) {
      console.error('No peer connection available to process signal');
      return;
    }

    try {
      this.peer.signal(signalData);
    } catch (error) {
      console.error('Error processing signal:', error);
    }
  }

  // Toggle video track
  toggleVideo(enabled) {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = enabled;
      });
      return enabled;
    }
    return false;
  }

  // Toggle audio track
  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = enabled;
      });
      return enabled;
    }
    return false;
  }

  // Switch camera (front/back on mobile)
  async switchCamera() {
    if (!this.localStream) return false;

    try {
      const videoTrack = this.localStream.getVideoTracks()[0];
      const currentConstraints = videoTrack.getConstraints();
      
      const facingMode = currentConstraints.facingMode === 'user' ? 'environment' : 'user';
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true
      });

      // Replace the video track in the peer connection
      if (this.peer) {
        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = this.peer._pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      // Stop old video track
      videoTrack.stop();
      
      // Update local stream
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newStream.getVideoTracks()[0]);
      
      return true;
    } catch (error) {
      console.error('Error switching camera:', error);
      return false;
    }
  }

  // Get connection state
  getConnectionState() {
    if (!this.peer) return 'new';
    
    if (this.peer.connected) return 'connected';
    if (this.peer.connecting) return 'connecting';
    if (this.peer.destroyed) return 'closed';
    
    return 'new';
  }

  // Get remote stream status
  getRemoteStreamStatus() {
    if (!this.remoteStream) {
      return { hasStream: false, reason: 'No remote stream' };
    }
    
    const videoTracks = this.remoteStream.getVideoTracks();
    const audioTracks = this.remoteStream.getAudioTracks();
    
    return {
      hasStream: true,
      videoTracks: videoTracks.length,
      audioTracks: audioTracks.length,
      videoEnabled: videoTracks.some(track => track.enabled),
      audioEnabled: audioTracks.some(track => track.enabled),
      streamId: this.remoteStream.id,
      active: this.remoteStream.active
    };
  }

  // Clean up and close connection
  cleanup() {
    console.log('WebRTC cleanup started');
    
    // Stop all tracked media tracks
    this.allTracks.forEach(track => {
      if (track.readyState !== 'ended') {
        console.log('Stopping tracked track:', track.kind, track.id);
        track.stop();
      }
    });
    this.allTracks = [];
    
    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      });
      this.localStream = null;
    }

    // Stop remote stream tracks
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      });
      this.remoteStream = null;
    }

    // Destroy peer connection
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    // Clear callbacks
    this.onStreamCallback = null;
    this.onErrorCallback = null;
    this.onConnectCallback = null;
    this.onCloseCallback = null;
    this.onSignalCallback = null;
  }

  // Set event callbacks
  onRemoteStream(callback) {
    this.onStreamCallback = callback;
    if (this.remoteStream) {
      callback(this.remoteStream);
    }
  }

  onError(callback) {
    this.onErrorCallback = callback;
  }

  onConnect(callback) {
    this.onConnectCallback = callback;
  }

  onClose(callback) {
    this.onCloseCallback = callback;
  }

  onSignal(callback) {
    this.onSignalCallback = callback;
  }

  // Get local stream
  getLocalStream() {
    return this.localStream;
  }

  // Get remote stream
  getRemoteStream() {
    return this.remoteStream;
  }

  // Check if peer is connected
  isConnected() {
    return this.peer && this.peer.connected;
  }

  // Check browser support
  static isSupported() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.RTCPeerConnection);
  }
}

export default WebRTCService;
