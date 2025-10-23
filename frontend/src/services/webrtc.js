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
  }

  // Initialize local media stream
  async initializeLocalStream(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
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
      console.log('Remote stream received');
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
    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    // Stop remote stream tracks
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => {
        track.stop();
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

export default WebRTCService;