import { api } from "./client";
import { requestData } from "./request";

export const adminAPI = {
  getPendingApplications: async () =>
    requestData(
      () => api.get("/admin/applications/pending"),
      "Failed to fetch pending applications",
    ),

  approveApplication: async (id) =>
    requestData(
      () => api.post(`/admin/applications/${id}/approve`),
      "Failed to approve application",
    ),

  rejectApplication: async (id) =>
    requestData(
      () => api.delete(`/admin/applications/${id}/reject`),
      "Failed to reject application",
    ),

  getDatabaseTables: async () =>
    requestData(() => api.get("/admin/database/tables"), "Failed to fetch database tables"),

  getTableRows: async (tableName, limit = 50) =>
    requestData(
      () =>
        api.get(`/admin/database/tables/${encodeURIComponent(tableName)}/rows`, {
          params: { limit },
        }),
      "Failed to fetch table rows",
    ),

  deleteTableRow: async (tableName, rowId) =>
    requestData(
      () =>
        api.delete(`/admin/database/tables/${encodeURIComponent(tableName)}/rows/${rowId}`),
      "Failed to delete row",
    ),

  clearTable: async (tableName) =>
    requestData(
      () => api.delete(`/admin/database/tables/${encodeURIComponent(tableName)}`),
      "Failed to clear table",
    ),

  clearAllData: async () =>
    requestData(() => api.delete("/admin/database/all"), "Failed to clear all data"),

  resetAllReports: async () =>
    requestData(() => api.post("/admin/reports/reset"), "Failed to reset reports"),
};
