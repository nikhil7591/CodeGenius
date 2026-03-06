const response = require("../utils/responseHandler");
const { uploadFileToCloundinary } = require("../config/CloudinaryConfig");
const Status = require("../models/Status");
const Message = require("../models/Message");

exports.createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    // Validate input
    if (!content && !file) {
      return response(res, 400, "Either content or media file is required");
    }

    let mediaUrl = null;
    let finalContentType = contentType || "text";
    
    // handle file upload
    if (file) {
      const uploadFile = await uploadFileToCloundinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload file");
      }
      mediaUrl = uploadFile.secure_url;
      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Invalid file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Message content is required");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiresAt,
    });
    await status.save();

    const populatedStatus = await Status.findById(status._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    // Emit socket event
    if (req.io && req.socketUserMap) {
      // Broadcast to all connected users except the creator
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("new_status", populatedStatus);
        }
      }
    }

    return response(res, 201, "Status created successfully", populatedStatus);
  } catch (error) {
    console.error("Error creating status:", error);
    return response(res, 500, "Internal server error");
  }
};

exports.getStatus = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 });
    
    return response(res, 200, "Status retrieved successfully", statuses);
  } catch (error) {
    console.error("Error fetching statuses:", error);
    return response(res, 500, "Internal server error");
  }
};

exports.viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  
  try {
    const status = await Status.findById(statusId).populate("user", "_id");
    
    if (!status) {
      return response(res, 404, "Status not found");
    }

    // CRITICAL FIX: Don't add owner to viewers list
    const statusOwnerId = status.user._id.toString();
    if (statusOwnerId === userId) {
      return response(res, 200, "Owner cannot be added to viewers list", {
        statusId,
        viewers: status.viewers,
      });
    }

    // Check if user already viewed the status
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      // Fetch updated status with populated fields
      const updatedStatus = await Status.findById(statusId)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture");

      // Emit socket event to status owner
      if (req.io && req.socketUserMap) {
        const statusOwnerSocketId = req.socketUserMap.get(statusOwnerId);
        
        if (statusOwnerSocketId) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewers: updatedStatus.viewers.length,
            viewers: updatedStatus.viewers,
          };
          req.io.to(statusOwnerSocketId).emit("status_viewed", viewData);
        } else {
          console.log("Status owner not connected");
        }
      }

      return response(res, 200, "Status viewed successfully", {
        statusId,
        viewers: status.viewers,
      });
    } else {
      console.log("User already viewed the status");
      return response(res, 200, "Status already viewed", {
        statusId,
        viewers: status.viewers,
      });
    }
  } catch (error) {
    console.error("Error viewing status:", error);
    return response(res, 500, "Internal server error", null, error.message);
  }
};

exports.deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  
  try {
    const status = await Status.findById(statusId);
    
    if (!status) {
      return response(res, 404, "Status not found");
    }
    
    if (status.user.toString() !== userId) {
      return response(res, 403, "Not authorized to delete this status");
    }

    await status.deleteOne();

    // Emit socket event to all connected users
    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }

    return response(res, 200, "Status deleted successfully");
  } catch (error) {
    console.error("Error deleting status:", error);
    return response(res, 500, "Internal server error");
  }
};

// Optional: Add this endpoint to get viewers of a specific status
exports.getStatusViewers = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  
  try {
    const status = await Status.findById(statusId)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");
    
    if (!status) {
      return response(res, 404, "Status not found");
    }

    // Only allow status owner to see viewers
    if (status.user._id.toString() !== userId) {
      return response(res, 403, "Not authorized to view this information");
    }

    return response(res, 200, "Viewers retrieved successfully", {
      statusId,
      viewers: status.viewers,
      totalViewers: status.viewers.length,
    });
  } catch (error) {
    console.error("Error getting status viewers:", error);
    return response(res, 500, "Internal server error");
  }
};