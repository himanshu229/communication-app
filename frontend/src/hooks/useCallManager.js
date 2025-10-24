import { useEffect, useRef } from 'react';
import { useAppDispatch, useCall, useAuth } from './redux';
import { useSocket } from './useSocket';
import {
  acceptCall,
  rejectCall,
  endCall as endCallAction,
  updateCallStatus,
  updateConnectionState,
  setCallError,
  setCallId,
  updateCallDuration,
  initiateCall as initiateCallAction
} from '../store/slices/callSlice';
import WebRTCService, { getGlobalWebRTCInstance, clearGlobalWebRTCInstance } from '../services/webrtc';

export const useCallManager = () => {
  const dispatch = useAppDispatch();
  const call = useCall();
  const { user } = useAuth();
  const { 
    answerCall: socketAnswerCall, 
    rejectCall: socketRejectCall, 
    endCall: socketEndCall,
    sendCallAnswer,
    initiateCall: socketInitiateCall
  } = useSocket();
  
  const webrtcRef = useRef(null);

  // Initialize WebRTC service using singleton
  useEffect(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = getGlobalWebRTCInstance();
    }

    // Setup WebRTC event listeners
    const webrtc = webrtcRef.current;
    
    const handleOffer = (event) => {
      const { detail: offerData } = event;
      console.log('Processing WebRTC offer:', offerData);
      
      if (webrtc && webrtc.peer && call.callStatus === 'connected') {
        webrtc.processSignal(offerData.signal);
      }
    };

    const handleAnswer = (event) => {
      const { detail: answerData } = event;
      console.log('Processing WebRTC answer:', answerData);
      
      if (webrtc && webrtc.peer) {
        webrtc.processSignal(answerData.signal);
        if (call.callStatus === 'calling') {
          dispatch(updateCallStatus('connected'));
        }
      }
    };

    const handleIceCandidate = (event) => {
      const { detail: candidateData } = event;
      if (webrtc && webrtc.peer) {
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
    };
  }, [call.callStatus]);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (call.callStatus === 'connected' && call.callStartTime) {
      interval = setInterval(() => {
        const duration = Math.floor((Date.now() - call.callStartTime) / 1000);
        dispatch(updateCallDuration(duration));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [call.callStatus, call.callStartTime]);

  const handleAcceptCall = async () => {
    if (!call.incomingCall || !user?.id) return;

    try {
      console.log('Accepting call:', call.incomingCall.callId);
      
      // Accept the call in Redux
      dispatch(acceptCall());

      // Initialize WebRTC for the callee
      if (webrtcRef.current && !webrtcRef.current.isInitializing) {
        webrtcRef.current.isInitializing = true;
        
        const constraints = {
          video: call.incomingCall.callType === 'video',
          audio: true
        };

        const localStream = await webrtcRef.current.initializeLocalStream(constraints);
        
        // Setup WebRTC callbacks
        webrtcRef.current.onSignal((signalData) => {
          sendCallAnswer({
            to: call.incomingCall.callerId,
            from: user.id,
            signal: signalData
          });
        });

        webrtcRef.current.onError((error) => {
          console.error('WebRTC error:', error);
          dispatch(setCallError(error.message));
        });

        webrtcRef.current.onConnect(() => {
          console.log('WebRTC connection established');
          dispatch(updateConnectionState('connected'));
        });
        
        webrtcRef.current.onRemoteStream((stream) => {
          console.log('Remote stream received:', stream);
          window.dispatchEvent(new CustomEvent('webrtc-remote-stream', { 
            detail: { stream, source: 'useCallManager' }
          }));
        });
        
        // Create peer as receiver
        webrtcRef.current.createPeerAsReceiver(localStream);
        webrtcRef.current.isInitializing = false;
      }

      // Notify the caller via socket
      socketAnswerCall({
        callId: call.incomingCall.callId,
        userId: user.id
      });

    } catch (error) {
      console.error('Error accepting call:', error);
      if (webrtcRef.current) {
        webrtcRef.current.isInitializing = false;
      }
      dispatch(setCallError('Failed to accept call'));
    }
  };

  const handleRejectCall = () => {
    if (!call.incomingCall || !user?.id) return;

    console.log('Rejecting call:', call.incomingCall.callId);

    // Notify the caller via socket
    socketRejectCall({
      callId: call.incomingCall.callId,
      userId: user.id
    });

    // Clean up any WebRTC state
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }

    // Reject the call in Redux
    dispatch(rejectCall());
  };

  const handleEndCall = () => {
    if (!user?.id) return;

    console.log('Ending call:', call.callId);

    // Clean up WebRTC
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }

    // Clear the global singleton
    clearGlobalWebRTCInstance();
    webrtcRef.current = null;

    // Notify remote user if we have a call ID
    if (call.callId) {
      socketEndCall({
        callId: call.callId,
        userId: user.id
      });
    }

    // End the call in Redux
    dispatch(endCallAction());
  };

  const initiateCall = async (targetUserId, targetUserName, callType, roomId) => {
    if (!user?.id) return;

    try {
      console.log('Initiating call to:', targetUserId);
      
      // Initialize call in Redux
      dispatch(initiateCallAction({
        userId: targetUserId,
        userName: targetUserName,
        callType,
        roomId
      }));

      // Send call initiation via socket
      const result = await socketInitiateCall({
        to: targetUserId,
        from: user.id,
        fromName: user.name,
        callType,
        roomId
      });

      if (result && result.callId) {
        dispatch(setCallId(result.callId));
      }

    } catch (error) {
      console.error('Error initiating call:', error);
      dispatch(setCallError('Failed to initiate call'));
    }
  };

  return {
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
    initiateCall,
    webrtcService: webrtcRef.current
  };
};

export default useCallManager;
