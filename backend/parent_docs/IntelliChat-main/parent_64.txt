import { create } from "zustand";
import { getSocket } from "../services/chat.service";
import axiosInstance from "../services/url.service";

const useStatusStore = create((set, get) => ({
  // state
  statuses: [],
  loading: false,
  error: null,

  // Actions
  setStatuses: (statuses) => set({ statuses }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Initialize the socket listeners
  initializeSocket: () => {
    const socket = getSocket();
    if (!socket) return;

    // real-time status updates
    socket.on("new_status", (newStatus) => {
      set((state) => ({
        statuses: state.statuses.some((s) => s._id === newStatus._id)
          ? state.statuses
          : [newStatus, ...state.statuses],
      }));
    });
    
    socket.on("status_deleted", (statusId) => {
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
      }));
    });
    
    socket.on("status_viewed", ({ statusId, viewers }) => {
      set((state) => ({
        statuses: state.statuses.map((status) =>
          status._id === statusId ? { ...status, viewers } : status
        ),
      }));
    });
  },
  
  cleanupSocket: () => {
    const socket = getSocket();
    if (socket) {
      socket.off("new_status");
      socket.off("status_deleted");
      socket.off("status_viewed");
    }
  },

  // fetch status
  fetchStatuses: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("/status");
      console.log('Fetched statuses:', data);
      set({ statuses: data.data || [], loading: false });
    } catch (error) {
      console.error("Error fetching status", error);
      set({ 
        error: error.response?.data?.message || error.message || "Failed to fetch statuses", 
        loading: false 
      });
    }
  },
  
  // create status
  createStatus: async (statusData) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      if (statusData.file) {
        formData.append("media", statusData.file);
      }
      if (statusData.content?.trim()) {
        formData.append("content", statusData.content);
      }
      
      const { data } = await axiosInstance.post("/status", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // add to status in local state
      if (data.data) {
        set((state) => ({
          statuses: state.statuses.some((s) => s._id === data.data._id)
            ? state.statuses
            : [data.data, ...state.statuses],
        }));
      }

      set({ loading: false });
      return data.data;
    } catch (error) {
      console.error("Error creating status", error);
      set({ 
        error: error.response?.data?.message || error.message || "Failed to create status", 
        loading: false 
      });
      throw error;
    }
  },
  
  // view status
  viewStatus: async (statusId) => {
    try {
      set({ loading: true, error: null });
      await axiosInstance.put(`/status/${statusId}/view`);
      
      // Update the status with new viewer data if returned
        set((state) => ({
          statuses: state.statuses.map((status) =>
            status._id === statusId 
              ? { ...status } 
              : status
          ),
        }));
      set({loading:false});
    } catch (error) {
      console.error("Error viewing status:", error);
      // Don't set error state for view failures as they're not critical
      return null;
    }
  },

  // delete status
  deleteStatus: async (statusId) => {
    try {
      set({ loading: true, error: null });
      await axiosInstance.delete(`/status/${statusId}`);
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
        loading: false,
      }));
      set({loading:false});
    } catch (error) {
      console.error("Error deleting status", error);
      set({ 
        error: error.response?.data?.message || error.message || "Failed to delete status", 
        loading: false 
      });
      throw error;
    }
  },

  // getStatus viewers
  getStatusViewers: async (statusId) => {
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.get(`/status/${statusId}/viewers`);
      set({ loading: false });
      return data;
    } catch (error) {
      console.error("Error getting status viewers", error);
      set({ 
        error: error.response?.data?.message || error.message || "Failed to get viewers", 
        loading: false 
      });
      throw error;
    }
  },
  
  // helper function for group status
  getGroupedStatus: () => {
    const { statuses } = get();
    console.log('Grouping statuses:', statuses);
    
    const grouped = statuses.reduce((acc, status) => {
      const statusUserId = status.user?._id;
      if (!statusUserId) {
        console.warn('Status without user ID:', status);
        return acc;
      }
      
      if (!acc[statusUserId]) {
        acc[statusUserId] = {
          id: statusUserId,
          name: status.user?.username || 'Unknown',
          avatar: status.user?.profilePicture || '',
          statuses: [],
        };
      }
      
      acc[statusUserId].statuses.push({
        id: status._id,
        media: status.content,
        contentType: status.contentType,
        timestamp: status.createdAt,
        viewers: status.viewers || [],
      });
      
      return acc;
    }, {});
    
    console.log('Grouped statuses:', grouped);
    return grouped;
  },

  getUserStatus: (userId) => {
    if (!userId) return null;
    const groupedStatus = get().getGroupedStatus();
    return groupedStatus[userId] || null;
  },
  
  getOtherStatus: (userId) => {
    if (!userId) return [];
    const groupedStatus = get().getGroupedStatus();
    const others = Object.values(groupedStatus).filter(
      (contact) => contact.id !== userId
    );
    console.log('Other statuses:', others);
    return others;
  },

  // clear error
  clearError: () => set({ error: null }),

  reset: () =>
    set({
      statuses: [],
      loading: false,
      error: null,
    }),
}));

export default useStatusStore;