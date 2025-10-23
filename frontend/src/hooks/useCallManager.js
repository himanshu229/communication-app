import { useEffect, useRef } from 'react';
import { useAppDispatch, useCall, useAuth } from './redux';
import { useSocket } from './useSocket';
import {
  acceptCall,
  rejectCall,
  endCall as endCallAction,
  updateCallStatus,
  updateConnectionState,
  setCallError
} from '../store/slices/callSlice';
import WebRTCService from '../services/webrtc';

export const useCallManager = () => {
  const dispatch = useAppDispatch();
  const call = useCall();
  const { user } = useAuth();
  const { 
    answerCall: socketAnswerCall, 
    rejectCall: socketRejectCall, 
    endCall: socketEndCall,
    sendCallAnswer
  } = useSocket();
  
  const webrtcRef = useRef(null);

  // Initialize WebRTC service
  useEffect(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCService();
    }

    // Setup WebRTC event listeners
    const webrtc = webrtcRef.current;
    
    const handleOffer = (event) => {
      const { detail: offerData } = event;
      const webrtc = webrtcRef.current;
      if (webrtc && webrtc.peer && call.callStatus === 'connected') {
        console.log('Processing WebRTC offer');
        webrtc.processSignal(offerData.signal);
      } else {
        console.log('Cannot process offer - peer not ready or wrong call status');
      }
    };

    const handleAnswer = (event) => {
      const { detail: answerData } = event;
      const webrtc = webrtcRef.current;
      if (webrtc && webrtc.peer && call.callStatus === 'calling') {
        console.log('Processing WebRTC answer');
        webrtc.processSignal(answerData.signal);
        dispatch(updateCallStatus('connected'));
      } else {
        console.log('Cannot process answer - peer not ready or wrong call status');
      }
    };

    const handleIceCandidate = (event) => {
      const { detail: candidateData } = event;
      const webrtc = webrtcRef.current;
      if (webrtc && webrtc.peer) {
        console.log('Processing ICE candidate');
        webrtc.processSignal(candidateData.candidate);
      } else {
        console.log('Cannot process ICE candidate - peer not ready');
      }
    };

    // Listen for WebRTC events
    window.addEventListener('webrtc-offer', handleOffer);
    window.addEventListener('webrtc-answer', handleAnswer);
    window.addEventListener('webrtc-ice-candidate', handleIceCandidate);

    return () => {
      window.removeEventListener('webrtc-offer', handleOffer);
      window.removeEventListener('webrtc-answer', handleAnswer);
      window.removeEventListener('webrtc-ice-candidate', handleIceCandidate);
      
      if (webrtc) {
        webrtc.cleanup();
      }
    };
  }, [call.callStatus]);

  const handleAcceptCall = async () => {
    if (!call.incomingCall || !user?.id) return;

    try {
      console.log('Accepting call from:', call.incomingCall.callerId);
      
      // First accept the call in Redux to update state
      dispatch(acceptCall());

      // Initialize WebRTC for the callee immediately after accepting
      const webrtc = webrtcRef.current;
      if (webrtc) {
        const constraints = {
          video: call.incomingCall.callType === 'video',
          audio: true
        };

        console.log('Initializing media for receiver with constraints:', constraints);
        const localStream = await webrtc.initializeLocalStream(constraints);
        
        // Setup WebRTC callbacks BEFORE creating peer (important for receiving remote stream)
        webrtc.onSignal((signalData) => {
          console.log('Receiver sending signal:', signalData);
          sendCallAnswer({
            to: call.incomingCall.callerId,
            from: user.id,
            signal: signalData
          });
        });

        webrtc.onError((error) => {
          console.error('WebRTC error in receiver:', error);
          dispatch(setCallError(error.message));
        });

        webrtc.onConnect(() => {
          console.log('WebRTC connection established in receiver');
          dispatch(updateConnectionState('connected'));
        });
        
        // Note: onRemoteStream callback will be set by VideoCall component
        // to avoid callback conflicts
        
        // Create peer as receiver AFTER setting up callbacks
        webrtc.createPeerAsReceiver(localStream);
      }

      // Notify the caller via socket that call is accepted
      socketAnswerCall({
        to: call.incomingCall.callerId,
        from: user.id
      });

      console.log('Call accepted, WebRTC initialized, and socket notified');
    } catch (error) {
      console.error('Error accepting call:', error);
      dispatch(setCallError('Failed to accept call'));
    }
  };

  const handleRejectCall = () => {
    if (!call.incomingCall || !user?.id) return;

    console.log('Rejecting call from:', call.incomingCall.callerId);

    // Notify the caller via socket
    socketRejectCall({
      to: call.incomingCall.callerId,
      from: user.id
    });

    // Clean up any WebRTC state
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }

    // Reject the call in Redux (this clears incoming call state)
    dispatch(rejectCall());
  };

    const handleEndCall = () => {
    if (!user?.id) return;

    console.log('HandleEndCall called - cleaning up and notifying remote user');

    // Determine who to notify
    let targetUserId = null;
    if (call.isInCall && call.remoteUserId) {
      targetUserId = call.remoteUserId;
    } else if (call.incomingCall && call.incomingCall.callerId) {
      targetUserId = call.incomingCall.callerId;
    }

    // Clean up WebRTC (this should stop all tracks)
    if (webrtcRef.current) {
      console.log('Cleaning up WebRTC in useCallManager');
      webrtcRef.current.cleanup();
    }

    // Notify remote user if we have their ID
    if (targetUserId) {
      console.log('Notifying remote user about call end:', targetUserId);
      socketEndCall({
        to: targetUserId,
        from: user.id
      });
    }

    // End the call in Redux (this clears all call state)
    dispatch(endCallAction());
  };

  return {
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
    webrtcService: webrtcRef.current
  };
};

export default useCallManager;