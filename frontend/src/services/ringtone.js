// Ringtone service for generating and playing call sounds
class RingtoneService {
  constructor() {
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.audioElement = null;
    this.ringInterval = null;
  }

  // Initialize audio context
  initAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.error('Error creating audio context:', error);
        return false;
      }
    }
    return true;
  }

  // Generate ringtone using Web Audio API
  generateRingtone() {
    if (!this.initAudioContext()) {
      return;
    }

    try {
      // Create oscillator for the ringtone
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();

      // Connect nodes
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Set ringtone parameters
      this.oscillator.type = 'sine';
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      this.gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);

      // Start the oscillator
      this.oscillator.start();

      // Create ringtone pattern (ring-ring-pause)
      let time = this.audioContext.currentTime;
      const ringDuration = 0.5;
      const pauseDuration = 0.3;
      const totalRingDuration = 2;

      for (let i = 0; i < totalRingDuration / (ringDuration + pauseDuration); i++) {
        // Ring
        this.gainNode.gain.setValueAtTime(0.3, time);
        time += ringDuration;
        
        // Pause
        this.gainNode.gain.setValueAtTime(0, time);
        time += pauseDuration;
      }

      // Stop after pattern
      this.oscillator.stop(time);
      
      return true;
    } catch (error) {
      console.error('Error generating ringtone:', error);
      return false;
    }
  }

  // Play ringtone with file (if available)
  async playRingtoneFile(filePath = '/sounds/ringtone.mp3') {
    try {
      this.audioElement = new Audio(filePath);
      this.audioElement.loop = true;
      this.audioElement.volume = 0.5;
      
      // Try to play the audio file
      await this.audioElement.play();
      this.isPlaying = true;
      return true;
    } catch (error) {
      console.log('Audio file not available or error playing:', error);
      return false;
    }
  }

  // Start ringtone (try file first, fallback to generated)
  async startRingtone() {
    if (this.isPlaying) {
      return;
    }

    // Try to play audio file first
    const fileSuccess = await this.playRingtoneFile();
    
    if (!fileSuccess) {
      // Fallback to generated ringtone with repeating pattern
      this.playGeneratedRingtone();
    }

    this.isPlaying = true;
  }

  // Play generated ringtone with repeating pattern
  playGeneratedRingtone() {
    if (this.ringInterval) {
      return;
    }

    // Play initial ringtone
    this.generateRingtone();

    // Repeat every 3 seconds
    this.ringInterval = setInterval(() => {
      if (this.isPlaying) {
        this.generateRingtone();
      }
    }, 3000);
  }

  // Stop ringtone
  stopRingtone() {
    this.isPlaying = false;

    // Stop audio file
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }

    // Stop generated ringtone
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch (error) {
        // Oscillator might already be stopped
      }
      this.oscillator = null;
      this.gainNode = null;
    }

    // Clear interval
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  // Play notification beep
  playNotificationBeep() {
    if (!this.initAudioContext()) {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error playing notification beep:', error);
    }
  }

  // Play call end sound
  playCallEndSound() {
    if (!this.initAudioContext()) {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing call end sound:', error);
    }
  }

  // Check if audio is supported
  static isAudioSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  // Cleanup
  cleanup() {
    this.stopRingtone();
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (error) {
        // Context might already be closed
      }
      this.audioContext = null;
    }
  }
}

// Export singleton instance
export const ringtoneService = new RingtoneService();
export default ringtoneService;