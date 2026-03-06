import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes, FaEye, FaTrash } from 'react-icons/fa';
import formatTimestamp from '../../utils/formatTime';

const StatusPreview = ({ 
    contact, 
    currentIndex, 
    onClose, 
    onPrev, 
    onNext, 
    onDelete, 
    theme, 
    currentUser, 
    loading 
}) => {
    const [progress, setProgress] = useState(0);
    const [showViewers, setShowViewers] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const videoRef = useRef(null);

    const currentStatus = contact?.statuses[currentIndex];
    const isOwner = contact?.id === currentUser?._id;
    const isVideo = currentStatus?.contentType === 'video';

    // Reset progress and pause state when status changes
    useEffect(() => {
        setProgress(0);
        setIsPaused(false);
        setShowViewers(false);
    }, [currentIndex]);

    // Handle video progress
    useEffect(() => {
        if (!isVideo || !videoRef.current) return;

        const video = videoRef.current;

        const handleTimeUpdate = () => {
            if (video.duration) {
                const newProgress = (video.currentTime / video.duration) * 100;
                setProgress(newProgress);
            }
        };

        const handlePlay = () => {
            setIsPaused(false);
        };

        const handlePause = () => {
            setIsPaused(true);
        };

        const handleEnded = () => {
            onNext();
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handleEnded);
        };
    }, [isVideo, onNext]);

    // Handle progress for images and text (not videos)
    useEffect(() => {
        if (isVideo) return;
        
        setProgress(0);
        let current = 0;
        const duration = 5000; // 5 seconds for images/text
        const intervalTime = 100;
        const increment = (intervalTime / duration) * 100;

        const interval = setInterval(() => {
            if (!isPaused) {
                current += increment;
                setProgress(current);
                
                if (current >= 100) {
                    clearInterval(interval);
                    onNext();
                }
            }
        }, intervalTime);

        return () => clearInterval(interval);
    }, [currentIndex, isPaused, onNext, isVideo]);

    const handleViewersToggle = () => {
        setShowViewers(!showViewers);
    };

    const handleDeleteStatus = () => {
        if (onDelete && currentStatus?.id) {
            onDelete(currentStatus.id);
        }
    };

    const handleContentClick = (e) => {
        // Don't handle navigation clicks for videos - let video controls work
        if (isVideo) return;
        
        const clickX = e.clientX;
        const screenWidth = window.innerWidth;
        
        if (clickX < screenWidth / 2) {
            if (currentIndex > 0) {
                onPrev();
            }
        } else {
            onNext();
        }
    };

    const handleMouseDown = () => {
        // Only pause non-video content on mouse hold
        if (!isVideo) {
            setIsPaused(true);
        }
    };

    const handleMouseUp = () => {
        // Only unpause non-video content
        if (!isVideo) {
            setIsPaused(false);
        }
    };

    if (!currentStatus) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 w-full h-full bg-black bg-opacity-95 z-50 flex items-center justify-center"
            style={{ backdropFilter: "blur(5px)" }}
        >
            <div
                className="w-full h-full relative max-w-4xl mx-auto flex justify-center items-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Progress bars */}
                <div className="absolute top-0 left-0 right-0 flex gap-1 p-4 z-20">
                    {contact?.statuses.map((_, index) => (
                        <div
                            key={index}
                            className="h-1 bg-gray-400 bg-opacity-30 flex-1 rounded-full overflow-hidden"
                        >
                            <div
                                className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                                style={{
                                    width:
                                        index < currentIndex
                                            ? "100%"
                                            : index === currentIndex
                                            ? `${progress}%`
                                            : "0%",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 pt-8 z-20 bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex items-center space-x-3">
                        <img
                            src={contact?.avatar}
                            alt={contact?.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                        />
                        <div>
                            <p className="text-white font-semibold drop-shadow-lg">
                                {contact?.name}
                                {isOwner && (
                                    <span className="ml-2 text-xs bg-green-500 px-2 py-0.5 rounded-full">
                                        You
                                    </span>
                                )}
                            </p>
                            <p className="text-gray-200 text-sm drop-shadow-lg">
                                {formatTimestamp(currentStatus?.timestamp)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {isOwner && (
                            <>
                                <button
                                    onClick={handleViewersToggle}
                                    className="text-white hover:text-gray-300 transition p-2 rounded-full hover:bg-white/10 relative"
                                    aria-label="View viewers"
                                >
                                    <FaEye className="h-5 w-5 drop-shadow-lg" />
                                    {currentStatus?.viewers?.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                            {currentStatus.viewers.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={handleDeleteStatus}
                                    className="text-white hover:text-red-500 transition p-2 rounded-full hover:bg-white/10"
                                    aria-label="Delete status"
                                >
                                    <FaTrash className="h-5 w-5 drop-shadow-lg" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-300 transition p-2 rounded-full hover:bg-white/10"
                            aria-label="Close"
                        >
                            <FaTimes className="h-6 w-6 drop-shadow-lg" />
                        </button>
                    </div>
                </div>

                {/* Main content */}
                <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ cursor: isVideo ? 'default' : 'pointer' }}
                    onClick={handleContentClick}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {currentStatus?.contentType === 'image' && (
                        <img
                            src={currentStatus.media}
                            alt="Status"
                            className="max-w-full max-h-full object-contain select-none"
                            draggable={false}
                        />
                    )}
                    
                    {currentStatus?.contentType === 'video' && (
                        <video
                            ref={videoRef}
                            src={currentStatus.media}
                            className="max-w-full max-h-full object-contain"
                            controls
                            autoPlay
                            playsInline
                            controlsList="nodownload"
                        />
                    )}
                    
                    {currentStatus?.contentType === 'text' && (
                        <div className="text-white text-2xl text-center p-8 max-w-2xl select-none">
                            {currentStatus.media}
                        </div>
                    )}
                </div>

                {/* Navigation indicators - Only show for non-video content */}
                {!isVideo && (
                    <>
                        <div className="text-4xl absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-opacity-50 pointer-events-none drop-shadow-lg">
                            {currentIndex > 0 && "‹"}
                        </div>
                        <div className="text-4xl absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-opacity-50 pointer-events-none drop-shadow-lg">
                            {currentIndex < contact?.statuses.length - 1 && "›"}
                        </div>
                    </>
                )}

                {/* Viewers panel */}
                <AnimatePresence>
                {showViewers && isOwner && (
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={`absolute right-0 top-0 h-full w-80 ${
                            theme === 'dark' ? 'bg-[#202c33]' : 'bg-gray-800'
                        } shadow-2xl z-30 overflow-y-auto`}
                    >
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                                <h3 className="text-white font-semibold text-lg">
                                    Viewers ({currentStatus?.viewers?.length || 0})
                                </h3>
                                <button
                                    onClick={handleViewersToggle}
                                    className="text-white hover:text-gray-300 transition p-2 rounded-full hover:bg-gray-700"
                                    aria-label="Close viewers"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            
                            {currentStatus?.viewers && currentStatus.viewers.length > 0 ? (
                                <div className="space-y-3">
                                    {currentStatus.viewers
                                    .filter(viewer => viewer._id !== currentUser?._id) // Exclude owner from viewers list
                                    .map((viewer) => (
                                        <div
                                            key={viewer._id}
                                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition cursor-pointer"
                                        >
                                            <img
                                                src={viewer.profilePicture}
                                                alt={viewer.username}
                                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                                            />
                                            <span className="text-white font-medium">{viewer.username}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <FaEye className="text-gray-600 text-4xl mb-3" />
                                    <p className="text-gray-400 text-center">
                                        No viewers yet
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default StatusPreview;