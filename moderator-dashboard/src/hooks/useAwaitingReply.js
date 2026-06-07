import { useQuery } from "@tanstack/react-query";
import { timelineAPI } from "../services/api";

/**
 * Returns a Set of incident IDs (as strings) whose latest public comment is from
 * the reporter — i.e. a citizen message awaiting a staff reply. Drives the
 * unread-message dot in the moderator and law-enforcement queues. Polls so new
 * citizen messages surface without a manual refresh.
 */
export default function useAwaitingReply() {
  return useQuery({
    queryKey: ["awaiting-reply"],
    queryFn: async () => {
      const res = await timelineAPI.getAwaitingReply();
      if (!res.success) {
        throw new Error(res.error || "Failed to fetch awaiting-reply incidents");
      }
      const ids = res.data?.incidentIds || [];
      return new Set(ids.map((id) => String(id)));
    },
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });
}
