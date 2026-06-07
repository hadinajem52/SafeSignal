import { api } from "./client";
import { requestData } from "./request";

export const timelineAPI = {
  getTimeline: async (incidentId) =>
    requestData(
      () => api.get(`/incidents/${incidentId}/timeline`),
      "Failed to fetch timeline",
    ),

  postComment: async (
    incidentId,
    content,
    isInternal = false,
    attachments = null,
  ) =>
    requestData(
      () =>
        api.post(`/incidents/${incidentId}/comments`, {
          content,
          isInternal,
          attachments,
        }),
      "Failed to post comment",
    ),

  getAwaitingReply: async () =>
    requestData(
      () => api.get(`/incidents/comments/awaiting-reply`),
      "Failed to fetch awaiting-reply incidents",
    ),
};
