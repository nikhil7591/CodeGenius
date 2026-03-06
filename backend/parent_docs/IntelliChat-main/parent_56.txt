import React, { useEffect, useMemo, useRef } from 'react';
import useVideoCallStore from '../../store/videoCallStore';
import useUserStore from '../../store/useUserStore';
import useThemeStore from '../../store/themeStore';
import { FaPhoneSlash, FaVideoSlash, FaMicrophoneSlash, FaViadeo, FaVideo, FaMicrophone, FaTimes } from 'react-icons/fa';

const VideoCallModal = ({ socket }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const {
        currentCall,
        callType,
        incomingCall,
        isCallActive,
        localStream,
        remoteStream,
        isVideoEnabled,
        isAudioEnabled,
        peerConnection,
        iceCandidatesQueue,
        isCallModalOpen,
        callStatus,
        setIncomingCall,
        setCurrentCall,
        setCallType,
        setCallModalOpen,
        endCall,
        setCallStatus,
        setCallActive,
        setLocalStream,
        setRemoteStream,
        setPeerConnection,
        setIceCandidate,
        processQueuedIceCandidates,
        toggleVideo,
        toggleAudio,
        clearIncomingCall,
    } = useVideoCallStore();

    const { user } = useUserStore();
    const { theme } = useThemeStore();

    // WebRTC configuration peer to peer connection 
    const rtcConfiguration = {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            },
            {
                urls: "stun:stun1.l.google.com:19302"
            },
            {
                urls: "stun:stun2.l.google.com:19302"
            },
        ],
    };

    // Memorize display the user info to prevent unnecessary re-renders
    const displayInfo = useMemo(() => {
        // If there's an incoming call and the call isn't active yet, prefer incomingCall
        if (incomingCall && !isCallActive) {
            return {
                name: incomingCall?.callerName ,
                avatar: incomingCall?.callerAvatar ,
            };
        }else if (currentCall) {
            return {
                name: currentCall?.participantName,
                avatar: currentCall?.participantAvatar,
            };
        }

        // Fallback to empty data
        return null;
    }, [incomingCall, isCallActive, currentCall]);

    // connection detection
    useEffect(() => {
        if (peerConnection && remoteStream) {
            console.log("Both Peer Connection and remote Stream established");
            setCallStatus("connected");
            setCallActive(true);
        }
    }, [peerConnection, remoteStream, setCallActive, setCallStatus])


    // setup local video stream when localStream changes
    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // setup remote video stream when remoteStream changes
    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Initilize media stream
    const initialzeMedia = async (video = true) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: video ? { width: 640, height: 480 } : false,
                audio: true,
            })
            console.log("Local media stream", stream.getTracks())
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error("Media error", error);
            throw error;
        }
    }

    // create peer connection
    const createPeerConnection = (stream, role) => {
        const pc = new RTCPeerConnection(rtcConfiguration);

        // add local tracks immediately
        if (stream) {
            stream.getTracks().forEach((track) => {
                console.log(`${role} adding ${track.kind} track`, track.id.slice(0, 8));
                pc.addTrack(track, stream);
            });
        }

        // handle ice candidate
        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                const participantId = currentCall?.participantId || incomingCall?.callerId;
                const callId = currentCall?.callId || incomingCall?.callId;

                if (participantId && callId) {
                    socket.emit("webrtc_ice_candidate", {
                        candidate: event.candidate,
                        receiverId: participantId,
                        callId: callId,
                    });
                }
            }
        };

        // handle remote stream
        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0])
            } else {
                const stream = new MediaStream([event.track]);
                setRemoteStream(stream);
            }
        }

        // 
        pc.onconnectionstatechange = () => {
            console.log(`role ${role} : connection state`, pc.connectionState)
            if (pc.connectionState === 'failed') {
                setCallStatus("failed");
                setTimeout(handleEndCall, 2000)
            }
        }

        pc.oniceconnectionstatechange = () => {
            console.log(`role ${role} : ice connection state`, pc.iceConnectionState);
        }

        pc.onsignalingstatechange = () => {
            console.log(`role ${role} : Signaling state`, pc.signalingState);
        }

        setPeerConnection(pc);
        return pc;
    }

    // caller : initalize call after acceptance 
    const initialzeCallerCall = async () => {
        try {
            setCallStatus("connecting");
            // get media
            const stream = await initialzeMedia(callType === "video");
            // create peer connection with offer 
            const pc = createPeerConnection(stream, "CALLER");

            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: callType === "video"
            })

            await pc.setLocalDescription(offer);

            socket.emit("webrtc_offer", {
                offer,
                receiverId: currentCall?.participantId,
                callId: currentCall?.callId,
            });

        } catch (error) {
            console.error("Caller error", error);
            setCallStatus("failed");
            setTimeout(handleEndCall, 2000);
        }
    }

    // Reciver: Answer the call
    const handleAnswerCall = async () => {
        try {
            setCallStatus("connecting");
            // get media
            const stream = await initialzeMedia(callType === "video");
            createPeerConnection(stream, "RECEIVER");
            socket.emit("accept_call", {
                callerId: incomingCall?.callerId,
                callId: incomingCall?.callId,
                receiverInfo: {
                    username: user?.username,
                    profilePicture: user?.profilePicture,
                }
            })

            setCurrentCall({
                callId: incomingCall?.callId,
                participantId: incomingCall?.callerId,
                participantName: incomingCall?.callerName,
                participantAvatar: incomingCall?.callerAvatar,
            });
            clearIncomingCall();
        } catch (error) {
            console.error("Reciver error", error);
            handleEndCall();
        }
    }

    const handleRejectCall = () => {
        if (incomingCall) {
            socket.emit("reject_call", {
                callerId: incomingCall?.callerId,
                callId: incomingCall?.callId,
            })
        }
        endCall();
    }

    const handleEndCall = () => {
        const participantId = currentCall?.participantId || incomingCall?.callerId;
        const callId = currentCall?.callId || incomingCall?.callId;

        if (socket && participantId && callId) {
            socket.emit("end_call", {
                callId: callId,
                participantId: participantId
            });
        }
        endCall();
    }

    // socket event listeners
    useEffect(() => {
        if (!socket) {
            return;
        }

        // call accepted start caller flow
        const handleCallAccepted = ({receiverName}) => {
            if (currentCall) {
                setTimeout(() => {
                    initialzeCallerCall();
                }, 500)
            }
        }
        const handleCallRejected = () => {
            setCallStatus("rejected");
            setTimeout(endCall, 2000);
        }
        const handleCallEnded = () => {
            endCall();
        }
        const handleWebRTCOffer = async ({ offer, senderId, callId }) => {
            if (!peerConnection) return;
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                // process queued ICE candidates
                await processQueuedIceCandidates();

                // create answer
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                socket.emit("webrtc_answer", {
                    answer,
                    receiverId: senderId,
                    callId
                })

                console.log("Reciver:Answer send waiting for ice candidates");
            } catch (error) {
                console.error("Error handling WebRTC offer", error);
            }
        }

        // reciever answer (caller)
        const handleWebRTCAnswer = async ({ answer, senderId, callId }) => {
            if (!peerConnection) return;
            if (peerConnection.signalingState === 'closed') {
                console.log("Caller: Peer connection closed, ignoring answer");
                return;
            }

            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

                await processQueuedIceCandidates();

                const receivers = peerConnection.getReceivers();
                console.log("Reciever", receivers)

            } catch (error) {
                console.error("caller answer erro", error)
            }
        }

        // Reciver ICE candidates
        const handleWebRTCIceCandidate = async ({ candidate, senderId }) => {
            if (peerConnection && peerConnection.signalingState !== 'closed') {
                if (peerConnection.remoteDescription) {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                        console.log("ICE candidate added")
                    } catch (error) {
                        console.error("Ice candidate error", error)
                    }
                }
                else {
                    console.log("Queueing ICE candidate");
                    if (!iceCandidatesQueue.includes(candidate)) {
                        iceCandidatesQueue.push(candidate);
                    }
                }
            }
        }

        // register all event listeners
        socket.on("call_accepted", handleCallAccepted);
        socket.on("call_rejected", handleCallRejected);
        socket.on("call_ended", handleCallEnded);
        socket.on("webrtc_offer", handleWebRTCOffer);
        socket.on("webrtc_answer", handleWebRTCAnswer);
        socket.on("webrtc_ice_candidate", handleWebRTCIceCandidate);
        
        
        console.log("Socket event listeners registered");

        // cleanup on unmount
        return () => {
            socket.off("call_accepted", handleCallAccepted);
            socket.off("call_rejected", handleCallRejected);
            socket.off("call_ended", handleCallEnded);
            socket.off("webrtc_offer", handleWebRTCOffer);
            socket.off("webrtc_answer", handleWebRTCAnswer);
            socket.off("webrtc_ice_candidate", handleWebRTCIceCandidate);
        }

    }, [socket, peerConnection, currentCall, incomingCall, user?._id, endCall, processQueuedIceCandidates, iceCandidatesQueue])

    if (!isCallModalOpen && !incomingCall) {
        return null;
    }

    const shouldShowActiveCall = isCallActive || (callStatus === "connecting") || (callStatus === "calling");

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75'>
            <div className={`relative w-full h-full max-w-4xl max-h-3xl rounded-lg overflow-hidden
                 ${theme === 'dark' ? "bg-gray-900" : "bg-white"}`}>

                {/* // incoming ui/ */}
                {incomingCall && !isCallActive && (
                    <div className='h-full flex flex-col items-center justify-center p-8'>
                        <div className='text-center mb-8'>
                            <div className='w-32 h-32 rounded-full bg-gray-300 mx-auto mb-4 overflow-hidden'>
                                <img src={displayInfo?.avatar} alt={displayInfo?.name}
                                    className='w-full h-full object-cover'
                                />

                            </div>
                            <h2 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? "text-white" : "text-gray-900"}`}>
                                {displayInfo?.name}
                            </h2>
                            <p className={`text-lg ${theme === 'dark' ? "text-gray-300" : "text-gray-600"}`}>
                                Incoming {callType} call...
                            </p>

                        </div>
                        <div className='flex space-x-6'>
                            <button
                                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                                onClick={handleRejectCall}

                            >
                                <FaPhoneSlash className='w-6 h-6' />

                            </button>
                            <button
                                className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors"
                                onClick={handleAnswerCall}

                            >
                                <FaVideo className='w-6 h-6' />

                            </button>
                        </div>
                    </div>


                )}
                {/* active call ui */}
                {shouldShowActiveCall && (
                    <div className='relative w-full h-full'>
                        {callType === "video" && (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className={`w-full h-full object-cover bg-gray-800 ${remoteStream ? "block" : "hidden"}`}
                            />
                        )}

                        {/* avatar / status display */}
                        {(!remoteStream || callType !== 'video') && (
                            <div className='w-full h-full bg-gray-800 flrx items-center justify-center'>
                                <div className='text-center'>
                                    <div
                                        className='w-32 h-32 rounded-full bg-gray-600 mx-auto mb-4 overflow-hidden'
                                    >
                                        <img
                                            src={displayInfo?.avatar}
                                            alt={displayInfo?.name}
                                            className='w-full h-full object-cover'
                                        />
                                    </div>

                                    <p className='text-white text-xl'>
                                        {callStatus === 'calling' ? `Calling ${displayInfo?.name}...` : callStatus === 'connecting' ? 'Connecting...' : callStatus === 'connected' ? displayInfo?.name : callStatus === 'failed' ? "Connection failed" : displayInfo?.name}
                                    </p>
                                </div>
                            </div>
                        )}


                        {/* local video picture in picture  */}
                        {callType === 'video' && localStream && (
                            <div className='absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white'>
                                <video ref={localVideoRef} autoPlay playsInline muted className='w-full h-full object-cover'></video>
                            </div>
                        )}

                        {/* call status  */}
                        <div className='absolute top-4 left-4'>
                            <div className={`px-4 py-2 rounded-full ${theme === 'dark' ? "bg-gray-800" : "bg-white"} bg-opacity-75`}>
                                <p
                                    className={` test-sm ${theme === 'dark' ? "text-white" : "text-gray-900"}`}
                                >
                                    {callStatus === 'connected' ? "Connected" : callStatus}
                                </p>
                            </div>
                        </div>

                        {/* call controls */}
                        <div className='absolute bottom-8 left-1/2 transform -translate-x-1/2'>
                            <div className='flex space-x-4'>
                                {callType === 'video' && (
                                    <button
                                    onClick={toggleVideo}
                                     className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoEnabled ? "bd-gray-600 hover:bg-gray-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}>
                                        {isVideoEnabled ? <FaVideo className='w-5 h-5' /> : <FaVideoSlash className='w-5 h-5' />}
                                    </button>
                                )}
                                <button 
                                onClick={toggleAudio}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isAudioEnabled ? "bd-gray-600 hover:bg-gray-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}>
                                    {isAudioEnabled ? <FaMicrophone className='w-5 h-5' /> : <FaMicrophoneSlash className='w-5 h-5' />}
                                </button>
                                <button
                                    className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                                    onClick={handleEndCall}

                                >
                                    <FaPhoneSlash className='w-5 h-5' />

                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {callStatus === 'calling' && (
                    <button
                        className="absolute top-4 right-4  w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center text-white transition-colors"
                        onClick={handleEndCall}

                    >
                        <FaTimes className='w-6 h-6' />

                    </button>
                )}

            </div>
        </div>
    )
}

export default VideoCallModal;