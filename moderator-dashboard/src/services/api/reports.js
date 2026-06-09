import { api } from "./client";
import { requestData } from "./request";

export const reportsAPI = {
  getAll: async (params = {}) =>
    requestData(() => api.get("/incidents", { params }), "Failed to fetch reports"),

  getById: async (id) =>
    requestData(() => api.get(`/incidents/${id}`), "Failed to fetch report"),

  getDedup: async (id) =>
    requestData(
      () => api.get(`/incidents/${id}/dedup`),
      "Failed to fetch dedup candidates",
    ),

  getMlSummary: async (id) =>
    requestData(() => api.get(`/incidents/${id}/ml`), "Failed to fetch ML summary"),

  retryMediaJudgment: async (id) =>
    requestData(
      () => api.post(`/incidents/${id}/ml/media/retry`),
      "Failed to retry media judgment",
    ),

  updateCategory: async (id, category) =>
    requestData(
      () => api.patch(`/incidents/${id}/category`, { category }),
      "Failed to update category",
    ),

  linkDuplicate: async (id, duplicateIncidentId) =>
    requestData(
      () => api.post(`/incidents/${id}/duplicates`, { duplicateIncidentId }),
      "Failed to link duplicate",
    ),

  updateStatus: async (id, status) =>
    requestData(() => api.patch(`/incidents/${id}`, { status }), "Failed to update report"),

  verify: async (id) =>
    requestData(() => api.post(`/incidents/${id}/verify`), "Failed to verify report"),

  reject: async (id, reason) =>
    requestData(
      () => api.post(`/incidents/${id}/reject`, { reason }),
      "Failed to reject report",
    ),

  activateConstellation: async (id) =>
    requestData(
      () => api.post(`/incidents/${id}/constellation`),
      "Failed to activate witness constellation",
    ),
};
