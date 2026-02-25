import { api } from "./client";
import { requestData } from "./request";

export const usersAPI = {
  getAll: async (params = {}) =>
    requestData(() => api.get("/users", { params }), "Failed to fetch users"),

  getById: async (id) =>
    requestData(() => api.get(`/users/${id}`), "Failed to fetch user"),

  suspend: async (id) =>
    requestData(
      () => api.patch(`/users/${id}`, { is_suspended: true }),
      "Failed to suspend user",
    ),

  unsuspend: async (id) =>
    requestData(
      () => api.patch(`/users/${id}`, { is_suspended: false }),
      "Failed to unsuspend user",
    ),

  updateRole: async (id, role) =>
    requestData(() => api.patch(`/users/${id}`, { role }), "Failed to update user role"),
};
