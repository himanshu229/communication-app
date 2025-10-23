import SimplePeer from 'simple-peer';

class WebRTCService {
  constructor() {
    this.peer = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isInitiator = false;
    this.onStreamCallback = null;
    this.onErrorCallback = null;
    this.onConnectCallback = null;
    this.onCloseCallback = null;
    this.onSignalCallback = null;
    this.iceCandidates = [];
    this.pendingCandidates = [];
    // Keep track of all created tracks for comprehensive cleanup
    this.allTracks = [];
  }

  // Initialize local media stream
  async initializeLocalStream(constraints = { video: true, audio: true }) {
    try {
      console.log('Requesting media with constraints:', constraints);
      
      // Ensure audio constraints are properly set for voice calls
      if (constraints.audio === true) {
        constraints.audio = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        };
      }
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Initialize global track registry if it doesn't exist
      if (!window.globalMediaTracks) {
        window.globalMediaTracks = [];
      }
      
      // Track all created tracks for comprehensive cleanup
      this.localStream.getTracks().forEach(track => {
        this.allTracks.push(track);
        window.globalMediaTracks.push(track); // Global registry
        console.log('Tracking media track:', track.kind, track.id, 'readyState:', track.readyState);
      });
      
      console.log('Media stream obtained:', {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
        totalTracked: this.allTracks.length,
        globalTracked: window.globalMediaTracks.length
      });
      
      // Ensure audio tracks are enabled
      this.localStream.getAudioTracks().forEach(track => {
        console.log('Audio track enabled:', track.enabled);
        track.enabled = true;
      });
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Unable to access camera/microphone. Please check permissions.');
    }
  }

  // Create peer connection as initiator (caller)
  createPeerAsInitiator(stream) {
    this.isInitiator = true;
    this.peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      }
    });
    
    this.setupPeerListeners();
    return this.peer;
  }

  // Create peer connection as receiver (callee)
  createPeerAsReceiver(stream) {
    this.isInitiator = false;
    this.peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
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

    // Handle data channel (for future text messaging during calls)
    this.peer.on('data', (data) => {
      console.log('Data received:', data.toString());
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

  // Send data through data channel
  sendData(data) {
    if (this.peer && this.peer.connected) {
      this.peer.send(data);
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
      
      // Toggle between user (front) and environment (back) camera
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

  // Clean up and close connection
  cleanup() {
    console.log('WebRTC cleanup started - stopping all media tracks');
    
    // Stop ALL tracked media tracks first
    console.log('Stopping', this.allTracks.length, 'tracked media tracks');
    this.allTracks.forEach(track => {
      if (track.readyState !== 'ended') {
        console.log('Stopping tracked track:', track.kind, track.id, 'readyState:', track.readyState);
        track.stop();
      }
    });
    this.allTracks = []; // Clear the tracking array
    
    // Stop local stream tracks (backup)
    if (this.localStream) {
      console.log('Stopping local stream tracks:', this.localStream.getTracks().length);
      this.localStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          console.log('Stopping local track (backup):', track.kind, track.id, 'readyState:', track.readyState);
          track.stop();
        }
      });
      this.localStream = null;
    }

    // Stop remote stream tracks (backup)
    if (this.remoteStream) {
      console.log('Stopping remote stream tracks:', this.remoteStream.getTracks().length);
      this.remoteStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          console.log('Stopping remote track (backup):', track.kind, track.id);
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
    
    // Clear candidates
    this.iceCandidates = [];
    this.pendingCandidates = [];
  }

  // Set event callbacks
  onRemoteStream(callback) {
    this.onStreamCallback = callback;
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

  // Get supported constraints
  static async getSupportedConstraints() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getSupportedConstraints) {
      return {};
    }
    return navigator.mediaDevices.getSupportedConstraints();
  }

  // Check if device has camera
  static async hasCamera() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error checking for camera:', error);
      return false;
    }
  }

  // Check if device has microphone
  static async hasMicrophone() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Error checking for microphone:', error);
      return false;
    }
  }
}

// Global utility to force stop all media tracks
export const forceStopAllMediaTracks = () => {
  console.log('🚨 FORCE STOPPING ALL MEDIA TRACKS');
  
  // Try to enumerate and stop all active media tracks
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      console.log('Available media devices:', devices.length);
      devices.forEach(device => {
        console.log('Device:', device.kind, device.label, device.deviceId);
      });
    }).catch(err => {
      console.log('Could not enumerate devices:', err);
    });
  }
  
  // Stop all tracks that might still be active
  if (window.globalMediaTracks) {
    window.globalMediaTracks.forEach(track => {
      if (track.readyState !== 'ended') {
        console.log('🚨 Force stopping global track:', track.kind, track.id);
        track.stop();
      }
    });
    window.globalMediaTracks = [];
  }
  
  return true;
};

export default WebRTCService;