import axios from "axios";
import { API_BASE_URL } from "../utils/network";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { ROUTES } from "../constants/routes";

const api = axios.create({
  baseURL: API_BASE_URL,
});
const rawApi = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== ROUTES.LOGIN
      ) {
        window.location.href = ROUTES.LOGIN;
      }
    }

    return Promise.reject(error);
  },
);

// Auth API
export const authAPI = {
  register: async ({ username, email, password, role = "citizen" }) => {
    try {
      const response = await api.post("/auth/register", {
        username,
        email,
        password,
        role,
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to submit application",
        status: error.response?.status ?? null,
      };
    }
  },

  login: async (email, password) => {
    try {
      const response = await rawApi.post("/auth/login", { email, password });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || "Login failed",
        status: error.response?.status ?? null,
      };
    }
  },

  me: async (token, signal) => {
    try {
      const response = await rawApi.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message || error.message || "Session expired",
        status: error.response?.status ?? null,
      };
    }
  },
};

// Reports API
export const reportsAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get("/incidents", { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch reports",
        status: error.response?.status ?? null,
      };
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/incidents/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch report",
        status: error.response?.status ?? null,
      };
    }
  },

  getDedup: async (id) => {
    try {
      const response = await api.get(`/incidents/${id}/dedup`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch dedup candidates",
        status: error.response?.status ?? null,
      };
    }
  },

  getMlSummary: async (id) => {
    try {
      const response = await api.get(`/incidents/${id}/ml`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch ML summary",
        status: error.response?.status ?? null,
      };
    }
  },

  updateCategory: async (id, category) => {
    try {
      const response = await api.patch(`/incidents/${id}/category`, {
        category,
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to update category",
        status: error.response?.status ?? null,
      };
    }
  },

  linkDuplicate: async (id, duplicateIncidentId) => {
    try {
      const response = await api.post(`/incidents/${id}/duplicates`, {
        duplicateIncidentId,
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to link duplicate",
        status: error.response?.status ?? null,
      };
    }
  },

  updateStatus: async (id, status) => {
    try {
      const response = await api.patch(`/incidents/${id}`, { status });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to update report",
        status: error.response?.status ?? null,
      };
    }
  },

  verify: async (id) => {
    try {
      const response = await api.post(`/incidents/${id}/verify`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to verify report",
        status: error.response?.status ?? null,
      };
    }
  },

  reject: async (id, reason) => {
    try {
      const response = await api.post(`/incidents/${id}/reject`, { reason });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to reject report",
        status: error.response?.status ?? null,
      };
    }
  },
};

// Users API
export const usersAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get("/users", { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch users",
        status: error.response?.status ?? null,
      };
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch user",
        status: error.response?.status ?? null,
      };
    }
  },

  suspend: async (id) => {
    try {
      const response = await api.patch(`/users/${id}`, { is_suspended: true });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to suspend user",
        status: error.response?.status ?? null,
      };
    }
  },

  unsuspend: async (id) => {
    try {
      const response = await api.patch(`/users/${id}`, { is_suspended: false });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to unsuspend user",
        status: error.response?.status ?? null,
      };
    }
  },

  updateRole: async (id, role) => {
    try {
      const response = await api.patch(`/users/${id}`, { role });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to update user role",
        status: error.response?.status ?? null,
      };
    }
  },
};

// Stats API
export const statsAPI = {
  getDashboardStats: async () => {
    try {
      const response = await api.get("/stats/moderator/dashboard");
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch stats",
        status: error.response?.status ?? null,
      };
    }
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    try {
      const response = await api.get("/settings");
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch settings",
        status: error.response?.status ?? null,
      };
    }
  },

  update: async (settings) => {
    try {
      const response = await api.put("/settings", settings);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to save settings",
        status: error.response?.status ?? null,
      };
    }
  },

  reset: async () => {
    try {
      const response = await api.post("/settings/reset");
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to reset settings",
        status: error.response?.status ?? null,
      };
    }
  },

  sendWeeklyDigestNow: async () => {
    try {
      const response = await api.post("/settings/weekly-digest/send");
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to send weekly digest",
        status: error.response?.status ?? null,
      };
    }
  },
};

// Law Enforcement Interface API
export const leiAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get("/incidents/lei", { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch LEI incidents",
        status: error.response?.status ?? null,
      };
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/incidents/lei/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch LEI incident",
        status: error.response?.status ?? null,
      };
    }
  },

  updateStatus: async (id, payload) => {
    try {
      const response = await api.patch(`/incidents/lei/${id}/status`, payload);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to update LEI status",
        status: error.response?.status ?? null,
      };
    }
  },
};

// Admin API
export const adminAPI = {
  getPendingApplications: async () => {
    try {
      const response = await api.get("/admin/applications/pending");
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch pending applications",
        status: error.response?.status ?? null,
      };
    }
  },

  approveApplication: async (id) => {
    try {
      const response = await api.post(`/admin/applications/${id}/approve`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to approve application",
        status: error.response?.status ?? null,
      };
    }
  },

  rejectApplication: async (id) => {
    try {
      const response = await api.delete(`/admin/applications/${id}/reject`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to reject application",
        status: error.response?.status ?? null,
      };
    }
  },

  getDatabaseTables: async () => {
    try {
      const response = await api.get("/admin/database/tables");
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch database tables",
        status: error.response?.status ?? null,
      };
    }
  },

  getTableRows: async (tableName, limit = 50) => {
    try {
      const response = await api.get(
        `/admin/database/tables/${encodeURIComponent(tableName)}/rows`,
        {
          params: { limit },
        },
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch table rows",
        status: error.response?.status ?? null,
      };
    }
  },

  deleteTableRow: async (tableName, rowId) => {
    try {
      const response = await api.delete(
        `/admin/database/tables/${encodeURIComponent(tableName)}/rows/${rowId}`,
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to delete row",
        status: error.response?.status ?? null,
      };
    }
  },

  clearTable: async (tableName) => {
    try {
      const response = await api.delete(
        `/admin/database/tables/${encodeURIComponent(tableName)}`,
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to clear table",
        status: error.response?.status ?? null,
      };
    }
  },

  clearAllData: async () => {
    try {
      const response = await api.delete("/admin/database/all");
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to clear all data",
        status: error.response?.status ?? null,
      };
    }
  },

  resetAllReports: async () => {
    try {
      const response = await api.post("/admin/reports/reset");
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to reset reports",
        status: error.response?.status ?? null,
      };
    }
  },
};

// Timeline/Comments API
export const timelineAPI = {
  getTimeline: async (incidentId) => {
    try {
      const response = await api.get(`/incidents/${incidentId}/timeline`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch timeline",
        status: error.response?.status ?? null,
      };
    }
  },

  postComment: async (
    incidentId,
    content,
    isInternal = false,
    attachments = null,
  ) => {
    try {
      const response = await api.post(`/incidents/${incidentId}/comments`, {
        content,
        isInternal,
        attachments,
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to post comment",
        status: error.response?.status ?? null,
      };
    }
  },
};

export default api;
