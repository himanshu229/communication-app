import { useEffect, useRef } from 'react';
import { useAppDispatch, useCall, useAuth } from './redux';
import { useSocket } from './useSocket';
import {
  receiveIncomingCall,
  acceptCall,
  rejectCall,
  endCall as endCallAction,
  updateCallStatus,
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
    sendCallOffer,
    sendCallAnswer,
    sendIceCandidate
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
      if (webrtc && call.callStatus === 'connected') {
        webrtc.processSignal(offerData.signal);
      }
    };

    const handleAnswer = (event) => {
      const { detail: answerData } = event;
      if (webrtc && call.callStatus === 'calling') {
        webrtc.processSignal(answerData.signal);
        dispatch(updateCallStatus('connected'));
      }
    };

    const handleIceCandidate = (event) => {
      const { detail: candidateData } = event;
      if (webrtc) {
        webrtc.processSignal(candidateData.candidate);
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
  }, [call.callStatus, dispatch]);

  const handleAcceptCall = async () => {
    if (!call.incomingCall || !user?.id) return;

    try {
      // Accept the call in Redux
      dispatch(acceptCall());

      // Notify the caller via socket
      socketAnswerCall({
        to: call.incomingCall.callerId,
        from: user.id
      });

      // Initialize WebRTC for the callee
      const webrtc = webrtcRef.current;
      if (webrtc) {
        const constraints = {
          video: call.incomingCall.callType === 'video',
          audio: true
        };

        const localStream = await webrtc.initializeLocalStream(constraints);
        webrtc.createPeerAsReceiver(localStream);

        // Setup WebRTC callbacks
        webrtc.onSignal((signalData) => {
          sendCallAnswer({
            to: call.incomingCall.callerId,
            from: user.id,
            signal: signalData
          });
        });

        webrtc.onError((error) => {
          console.error('WebRTC error:', error);
          dispatch(setCallError(error.message));
        });
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      dispatch(setCallError('Failed to accept call'));
    }
  };

  const handleRejectCall = () => {
    if (!call.incomingCall || !user?.id) return;

    // Notify the caller via socket
    socketRejectCall({
      to: call.incomingCall.callerId,
      from: user.id
    });

    // Reject the call in Redux
    dispatch(rejectCall());
  };

  const handleEndCall = () => {
    if (!user?.id) return;

    // Clean up WebRTC
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }

    // Notify remote user if in call
    if (call.isInCall && call.remoteUserId) {
      socketEndCall({
        to: call.remoteUserId,
        from: user.id
      });
    }

    // End the call in Redux
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