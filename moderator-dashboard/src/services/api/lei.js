import { api } from "./client";
import { requestData } from "./request";

export const leiAPI = {
  getAll: async (params = {}) =>
    requestData(() => api.get("/incidents/lei", { params }), "Failed to fetch LEI incidents"),

  getById: async (id) =>
    requestData(() => api.get(`/incidents/lei/${id}`), "Failed to fetch LEI incident"),

  updateStatus: async (id, payload) =>
    requestData(
      () => api.patch(`/incidents/lei/${id}/status`, payload),
      "Failed to update LEI status",
    ),
};
