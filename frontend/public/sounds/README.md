# Ringtone Instructions

## Current Setup

✅ **Ringtone file is installed**: `ringtone.mp3` is ready to use!

## Adding Custom Ringtone

To replace the current ringtone with your own:

1. **Replace the file** in `public/sounds/` directory
2. **Supported formats**: MP3, WAV, OGG
3. **Recommended filename**: `ringtone.mp3` or `ringtone.wav`

## File Requirements

- **Duration**: 2-5 seconds (will loop automatically)
- **Volume**: Medium volume (the app will adjust to 50%)
- **Format**: MP3 is recommended for broad browser support

## Default Behavior

The app will:
1. First try to load `/sounds/ringtone.mp3` ✅ **Currently working**
2. Fall back to a generated ringtone using Web Audio API if file fails
3. Create a pleasant ring-ring-pause pattern as backup

## Testing

The ringtone will automatically play when:
- An incoming call is received
- It stops when call is accepted/rejected
- Different sounds play for accept/reject/end actions

## Sound Effects Included

- **Ringtone**: Custom MP3 file for incoming calls ✅
- **Accept Sound**: Generated beep when call is accepted
- **Reject/End Sound**: Generated lower tone when call is rejected or ended
- **Connection Sound**: Generated beep when call connects successfully