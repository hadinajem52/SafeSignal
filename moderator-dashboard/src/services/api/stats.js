import { api } from "./client";
import { requestData } from "./request";

export const statsAPI = {
  getDashboardStats: async () =>
    requestData(
      () => api.get("/stats/moderator/dashboard"),
      "Failed to fetch stats",
    ),
};
