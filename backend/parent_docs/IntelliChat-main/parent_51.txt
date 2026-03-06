import React, { useEffect, useState } from "react";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import useStatusStore from "../../store/useStatusStore";
import Layout from "../../components/Layout";
import StatusPreview from "./StatusPreview";
import { motion } from 'framer-motion';
import { RxCross2 } from "react-icons/rx";
import { FaCamera, FaEllipsisH, FaPlus, FaTimes } from "react-icons/fa";
import formatTimestamp from "../../utils/formatTime";
import StatusList from "./StatusList";

const Status = () => {
    const [previewContact, setPreviewContact] = useState(null);
    const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
    const [showOption, setShowOption] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newStatus, setNewStatus] = useState("");
    const [filePreview, setFilePreview] = useState(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const { theme } = useThemeStore();
    const { user } = useUserStore();

    // status store
    const {
        statuses,
        loading,
        error,
        fetchStatuses,
        createStatus,
        viewStatus,
        deleteStatus,
        getStatusViewers,
        getUserStatus,
        getOtherStatus,
        clearError,
        reset,
        initializeSocket,
        cleanupSocket
    } = useStatusStore();

    const userStatuses = getUserStatus(user?._id);
    const otherStatuses = getOtherStatus(user?._id);

    console.log('Debug Info:', {
        totalStatuses: statuses.length,
        userStatuses,
        otherStatuses,
        userId: user?._id
    });

    useEffect(() => {
        fetchStatuses();
        initializeSocket();
        return () => {
            cleanupSocket();
        }
    }, []);

    // clear the error when page unmounts
    useEffect(() => {
        return () => clearError();
    }, []);

    const handlFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                alert('Please select an image or video file');
                return;
            }

            // Validate file size (max 50MB)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                alert('File size should be less than 50MB');
                return;
            }

            // For video files, check duration
            if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.preload = 'metadata';
                
                video.onloadedmetadata = function() {
                    window.URL.revokeObjectURL(video.src);
                    const duration = video.duration;
                    
                    if (duration > 40) {
                        alert('Video duration should be maximum 40 seconds');
                        return;
                    }
                    
                    // If duration is valid, set the file
                    setSelectedFile(file);
                    setFilePreview(URL.createObjectURL(file));
                };
                
                video.src = URL.createObjectURL(file);
            } else {
                // For images, set directly
                setSelectedFile(file);
                setFilePreview(URL.createObjectURL(file));
            }
        }
    };

    const handleCreateStatus = async () => {
        if (!newStatus.trim() && !selectedFile) return;

        try {
            await createStatus({
                content: newStatus,
                file: selectedFile
            });

            setNewStatus("");
            setSelectedFile(null);
            setFilePreview(null);
            setShowCreateModal(false);
        } catch (error) {
            console.error("Creating Status", error);
        }
    }

    const handleViewStatus = async (statusId) => {
        try {
            await viewStatus(statusId);
        } catch (error) {
            console.error("Error to view Status", error);
        }
    }

    const handleDeleteStatus = async (statusId) => {
        try {
            await deleteStatus(statusId);
            setShowOption(false);
            handlePreviewClose();
        } catch (error) {
            console.error("Error to delete Status", error);
        }
    }

    const handlePreviewClose = () => {
        setPreviewContact(null);
        setCurrentStatusIndex(0);
    };

    const handlePreviewNext = () => {
        if (currentStatusIndex < previewContact.statuses.length - 1) {
            setCurrentStatusIndex((prev) => prev + 1);
            // View next status
            const nextStatus = previewContact.statuses[currentStatusIndex + 1];
            if (nextStatus?.id) {
                handleViewStatus(nextStatus.id);
            }
        } else {
            handlePreviewClose();
        }
    }

    const handlePreviewPrev = () => {
        if (currentStatusIndex > 0) {
            setCurrentStatusIndex((prev) => prev - 1);
            // View previous status
            const prevStatus = previewContact.statuses[currentStatusIndex - 1];
            if (prevStatus?.id) {
                handleViewStatus(prevStatus.id);
            }
        }
    }

    const handleStatusPreview = (contact, statusIndex = 0) => {
        console.log('Opening status preview:', contact);
        
        if (!contact || !contact.statuses || contact.statuses.length === 0) {
            console.error('Invalid contact data for preview');
            return;
        }

        setPreviewContact(contact);
        setCurrentStatusIndex(statusIndex);
        
        // View the status
        if (contact.statuses[statusIndex]?.id) {
            handleViewStatus(contact.statuses[statusIndex].id);
        }
    }

    return (
        <Layout
            isStatusPreviewOpen={!!previewContact}
            statusPreviewContent={
                previewContact && (
                    <StatusPreview
                        contact={previewContact}
                        currentIndex={currentStatusIndex}
                        onClose={handlePreviewClose}
                        onNext={handlePreviewNext}
                        onPrev={handlePreviewPrev}
                        onDelete={handleDeleteStatus}
                        theme={theme}
                        currentUser={user}
                    />
                )
            }
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={`flex-1 h-screen border-r ${theme === 'dark' ? "bg-[rgb(12,19,24)] text-white border-gray-600" : "text-black bg-gray-100"}`}
            >
                <div className={`flex justify-between items-center shadow-md ${theme === 'dark' ? "bg-[rgb(17,27,33)]" : "bg-white"} p-4`}>
                    <h2 className="text-2xl font-bold">Status</h2>
                </div>
                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-2 relative">
                        <span className="block sm:inline">{error}</span>
                        <button 
                            onClick={() => clearError()} 
                            className="absolute top-0 right-0 px-4 py-3"
                        >
                            <RxCross2 className="h-5 w-5" />
                        </button>
                    </div>
                )}

                <div className="overflow-y-auto h-[calc(100vh-64px)]">
                    {/* My Status Section */}
                    <div className={`flex p-3 space-x-4 shadow-md ${theme === 'dark' ? "bg-[rgb(17,27,33)]" : "bg-white"}`}>
                        <div
                            className="relative cursor-pointer"
                            onClick={() => userStatuses ? handleStatusPreview(userStatuses) : setShowCreateModal(true)}
                        >
                            <img 
                                src={user?.profilePicture} 
                                alt={user?.username}
                                className="w-12 h-12 rounded-full object-cover"
                            />

                            {userStatuses ? (
                                <>
                                    <svg
                                        className="absolute top-0 left-0 w-12 h-12"
                                        viewBox="0 0 100 100"
                                    >
                                        {userStatuses.statuses.map((_, index) => {
                                            const circumference = 2 * Math.PI * 48;
                                            const segmentLength = circumference / userStatuses.statuses.length;
                                            const offset = index * segmentLength;
                                            return (
                                                <circle
                                                    key={index}
                                                    cx='50'
                                                    cy='50'
                                                    r='48'
                                                    fill="none"
                                                    stroke="#25D366"
                                                    strokeWidth='4'
                                                    strokeDasharray={`${segmentLength - 5} 5`}
                                                    strokeDashoffset={-offset}
                                                    transform="rotate(-90 50 50)"
                                                />
                                            )
                                        })}
                                    </svg>
                                    <button 
                                        className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowCreateModal(true)
                                        }}
                                    >
                                        <FaPlus className="h-2 w-2" />
                                    </button>
                                </>
                            ) : (
                                <button 
                                    className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCreateModal(true)
                                    }}
                                >
                                    <FaPlus className="h-2 w-2" />
                                </button>
                            )}
                        </div>
                        
                        <div className="flex flex-col items-start flex-1">
                            <p className="font-semibold">My Status</p>
                            <p className={`text-sm ${theme === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                                {userStatuses 
                                    ? `${userStatuses.statuses.length} status${userStatuses.statuses.length > 1 ? "es" : ""} ${formatTimestamp(userStatuses.statuses[userStatuses.statuses.length - 1].timestamp)}`
                                    : "Tap to add status update"}
                            </p>
                        </div>

                        {userStatuses && (
                            <button
                                className="ml-auto"
                                onClick={() => setShowOption(!showOption)}
                            >
                                <FaEllipsisH className={`h-5 w-5 ${theme === 'dark' ? "text-gray-400" : "text-gray-500"}`} />
                            </button>
                        )}
                    </div>

                    {/* Option menu */}
                    {showOption && userStatuses && (
                        <div className={`shadow-md p-2 ${theme === 'dark' ? "bg-[rgb(17,27,33)]" : "bg-white"}`}>
                            <button
                                className={`w-full text-left text-green-500 py-2 px-2 rounded flex items-center ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                onClick={() => {
                                    setShowCreateModal(true)
                                    setShowOption(false)
                                }}
                            >
                                <FaCamera className="inline-block mr-2" /> Add Status
                            </button>

                            <button
                                className={`w-full text-left text-green-500 py-2 px-2 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                onClick={() => {
                                    handleStatusPreview(userStatuses)
                                    setShowOption(false)
                                }}
                            >
                                View Status
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="flex justify-center items-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                        </div>
                    )}

                    {/* Recent Updates from Other Users */}
                    {!loading && otherStatuses && otherStatuses.length > 0 && (
                        <div className={`p-4 space-y-4 shadow-md mt-4 ${theme === 'dark' ? "bg-[rgb(17,27,33)]" : "bg-white"}`}>
                            <h3 className={`font-semibold ${theme === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                                Recent Update
                            </h3>
                            {otherStatuses.map((contact, index) => (
                                <React.Fragment key={contact?.id || index}>
                                    <StatusList
                                        contact={contact}
                                        onPreview={() => handleStatusPreview(contact)}
                                        theme={theme}
                                    />
                                    {index < otherStatuses.length - 1 && (
                                        <hr className={`${theme === 'dark' ? "border-gray-700" : "border-gray-200"}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && statuses.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <div className={`text-9xl mb-4 p-6 ${theme === 'dark' ? "text-gray-600" : "text-gray-300"}`}>
                                📱
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? "text-gray-400" : "text-gray-600"}`}>
                                No Status update yet
                            </h3>
                            <p className={`text-sm ${theme === 'dark' ? "text-gray-500" : "text-gray-600"}`}>
                                Be the first to share a status update
                            </p>
                        </div>
                    )}
                </div>

                {/* Create Status Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className={`p-6 rounded-lg max-w-md w-full mx-4 ${theme === 'dark' ? "bg-gray-800" : "bg-white"}`}>
                            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? "text-white" : "text-black"}`}>
                                Create Status
                            </h3>

                            {filePreview && (
                                <div className="mb-4 relative">
                                    {selectedFile?.type.startsWith("video/") ? (
                                        <video
                                            src={filePreview}
                                            controls
                                            className="w-full h-48 object-cover rounded"
                                            playsInline
                                            preload="metadata"
                                        />
                                    ) : (
                                        <img
                                            src={filePreview}
                                            alt="file-preview"
                                            className="w-full h-48 object-cover rounded"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setFilePreview(null);
                                        }}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            )}
                            
                            <textarea
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                placeholder="What's on your mind?"
                                className={`w-full p-3 border rounded-lg mb-4 ${theme === 'dark' ? "bg-gray-700 text-white border-gray-600" : "bg-white text-black border-gray-300"}`}
                                rows={3}
                            />
                            
                            <input 
                                type="file" 
                                accept="image/*,video/*"
                                onChange={handlFileChange}
                                className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                            />
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                                * Video duration should be maximum 40 seconds
                            </p>
                            
                            <div className="flex justify-center space-x-3">
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false)
                                        setNewStatus("")
                                        setSelectedFile(null)
                                        setFilePreview(null)
                                    }}
                                    disabled={loading}
                                    className="px-4 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={handleCreateStatus}
                                    disabled={loading || (!newStatus.trim() && !selectedFile)}
                                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                >
                                    {loading ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </Layout>
    );
}

export default Status;