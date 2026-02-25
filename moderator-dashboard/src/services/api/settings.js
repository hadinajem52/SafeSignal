import { api } from "./client";
import { requestData } from "./request";

export const settingsAPI = {
  get: async () => requestData(() => api.get("/settings"), "Failed to fetch settings"),

  update: async (settings) =>
    requestData(() => api.put("/settings", settings), "Failed to save settings"),

  reset: async () =>
    requestData(() => api.post("/settings/reset"), "Failed to reset settings"),

  sendWeeklyDigestNow: async () =>
    requestData(
      () => api.post("/settings/weekly-digest/send"),
      "Failed to send weekly digest",
    ),
};
