import React from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  RotateCcw
} from 'lucide-react';

const CallControls = ({ 
  isVideoEnabled, 
  isAudioEnabled, 
  isSpeakerEnabled,
  callType,
  onToggleVideo, 
  onToggleAudio, 
  onToggleSpeaker,
  onSwitchCamera,
  onEndCall,
  variant = 'default', // 'default' | 'compact' | 'minimal'
  showCameraSwitch = false
}) => {
  const baseButtonClass = "rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50";
  
  const getButtonSize = () => {
    switch (variant) {
      case 'compact':
        return 'p-2';
      case 'minimal':
        return 'p-1.5';
      default:
        return 'p-3 md:p-4';
    }
  };

  const getIconSize = () => {
    switch (variant) {
      case 'compact':
        return 18;
      case 'minimal':
        return 16;
      default:
        return 24;
    }
  };

  const getSpacing = () => {
    switch (variant) {
      case 'compact':
        return 'space-x-2';
      case 'minimal':
        return 'space-x-1';
      default:
        return 'space-x-4 md:space-x-6';
    }
  };

  const buttonSize = getButtonSize();
  const iconSize = getIconSize();
  const spacing = getSpacing();

  return (
    <div className={`flex items-center justify-center ${spacing}`}>
      {/* Audio Toggle */}
      <button
        onClick={onToggleAudio}
        className={`
          ${baseButtonClass} ${buttonSize}
          ${isAudioEnabled 
            ? 'bg-white/20 hover:bg-white/30 text-white' 
            : 'bg-red-600 hover:bg-red-700 text-white'
          }
        `}
        aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isAudioEnabled ? <Mic size={iconSize} /> : <MicOff size={iconSize} />}
      </button>

      {/* Video Toggle (only for video calls) */}
      {callType === 'video' && (
        <button
          onClick={onToggleVideo}
          className={`
            ${baseButtonClass} ${buttonSize}
            ${isVideoEnabled 
              ? 'bg-white/20 hover:bg-white/30 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
            }
          `}
          aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? <Video size={iconSize} /> : <VideoOff size={iconSize} />}
        </button>
      )}

      {/* End Call */}
      <button
        onClick={onEndCall}
        className={`
          ${baseButtonClass} ${variant === 'minimal' ? 'p-2' : 'p-4 md:p-5'} 
          bg-red-600 hover:bg-red-700 text-white
        `}
        aria-label="End call"
      >
        <PhoneOff size={variant === 'minimal' ? 20 : 28} />
      </button>

      {/* Speaker Toggle */}
      <button
        onClick={onToggleSpeaker}
        className={`
          ${baseButtonClass} ${buttonSize}
          ${isSpeakerEnabled 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-white/20 hover:bg-white/30 text-white'
          }
        `}
        aria-label={isSpeakerEnabled ? 'Turn off speaker' : 'Turn on speaker'}
      >
        {isSpeakerEnabled ? <Volume2 size={iconSize} /> : <VolumeX size={iconSize} />}
      </button>

      {/* Camera Switch (only for video calls on mobile) */}
      {callType === 'video' && showCameraSwitch && (
        <button
          onClick={onSwitchCamera}
          className={`
            ${baseButtonClass} ${buttonSize}
            bg-white/20 hover:bg-white/30 text-white
          `}
          aria-label="Switch camera"
        >
          <RotateCcw size={iconSize} />
        </button>
      )}
    </div>
  );
};

// Compact version for use in chat interface
export const CompactCallControls = (props) => (
  <CallControls {...props} variant="compact" />
);

// Minimal version for small spaces
export const MinimalCallControls = (props) => (
  <CallControls {...props} variant="minimal" />
);

export default CallControls;