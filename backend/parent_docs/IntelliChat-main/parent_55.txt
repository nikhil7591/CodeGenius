import React, { useCallback, useEffect } from 'react';
import useVideoCallStore from '../../store/videoCallStore';
import useUserStore from '../../store/useUserStore';
import VideoCallModal from './VideoCallModal';

const VideoCallManager = ({ socket }) => {
    const {
        setIncomingCall,
        setCurrentCall,
        setCallType,
        setCallModalOpen,
        endCall,
        setCallStatus,
        callStatus,
        isCallActive
    } = useVideoCallStore();

    const { user } = useUserStore();

    // Handle incoming call and call events
    useEffect(() => {
        if (!socket) return;

        // Handle incoming call
        const handleIncomingCall = ({ callerId, callerName, callerAvatar, callType, callId }) => {
            console.log('Incoming call received:', { callerId, callerName, callType, callId });
            setIncomingCall({
                callerId,
                callerName,
                callerAvatar,
                callId
            });
            setCallType(callType);
            setCallModalOpen(true);
            setCallStatus('ringing');
        };

        // Handle call ended/failed
        const handleCallEnded = ({ reason }) => {
            console.log('Call ended:', reason);
            
            // Ignore signaling_failed if we're already connected or connecting successfully
            if (reason === 'signaling_failed') {
                if (isCallActive || callStatus === 'connected' || callStatus === 'connecting') {
                    console.log('Ignoring signaling_failed - call is already active or connecting');
                    return;
                }
            }
            
            setCallStatus("failed");
            setTimeout(() => {
                endCall();
            }, 2000);
        };

        // Register socket event listeners
        socket.on('incoming_call', handleIncomingCall);
        socket.on('call_failed', handleCallEnded);

        // Cleanup socket listeners on unmount
        return () => {
            socket.off('incoming_call', handleIncomingCall);
            socket.off('call_failed', handleCallEnded);
        };
    }, [
        socket, 
        setIncomingCall, 
        setCallType, 
        setCallModalOpen, 
        endCall, 
        setCallStatus,
        isCallActive,
        callStatus
    ]);

    // Memoize function to initiate call
    const initiateCall = useCallback((receiverId, receiverName, receiverAvatar, callType="video") => {
        // Generate unique call ID
        const callId = `${user._id}-${receiverId}-${Date.now()}`;

        // Set up call data in store
        const callData = {
            callId,
            participantId: receiverId,
            participantName: receiverName,
            participantAvatar: receiverAvatar,
        };

        setCurrentCall(callData);
        setCallType(callType);
        setCallModalOpen(true);
        setCallStatus('calling');

        // Emit the call initiation to server
        socket.emit("initiate_call", {
            callerId: user?._id,
            receiverId,
            callType,
            callId, 
            callerInfo: {
                username: user.username,
                profilePicture: user.profilePicture
            }
        });
    }, [
        user,
        socket,
        setCurrentCall,
        setCallType,
        setCallModalOpen,
        setCallStatus
    ]);

    // Expose the initiateCall function to store for external access
    useEffect(() => {
        useVideoCallStore.getState().initiateCall = initiateCall;

        // // Cleanup on unmount
        // return () => {
        //     const store = useVideoCallStore.getState();
        //     if (store.initiateCall === initiateCall) {
        //         store.initiateCall = null;
        //     }
        // };
    }, [initiateCall]);

    return <VideoCallModal socket={socket} />;
};

export default VideoCallManager;