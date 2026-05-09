import { api } from "./client";
import { requestData } from "./request";

export const statsAPI = {
  getDashboardStats: async () =>
    requestData(
      () => api.get("/stats/moderator/dashboard"),
      "Failed to fetch stats",
    ),

  getDacAnalytics: async (params = {}) =>
    requestData(
      () => api.get("/stats/dac", { params }),
      "Failed to fetch analytics",
    ),

  getAIInsights: async (payload) =>
    requestData(
      () => api.post("/stats/ai-insights", payload),
      "Failed to generate AI insights",
    ),
};
