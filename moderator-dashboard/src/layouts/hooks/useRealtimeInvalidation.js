import { useEffect } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../../utils/network";
import { STORAGE_KEYS } from "../../constants/storageKeys";

export function useRealtimeInvalidation({ userId, queryClient, pushNotification }) {
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token || !userId) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token },
    });

    const refreshRealtimeQueries = () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["lei-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["lei-incident"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
    };

    socket.on("incident:new", () => {
      refreshRealtimeQueries();
    });

    socket.on("incident:update", () => {
      refreshRealtimeQueries();
    });

    socket.on("incident:duplicate", () => {
      refreshRealtimeQueries();
    });

    socket.on("lei_alert", () => {
      refreshRealtimeQueries();
    });

    socket.on("notification:report_alert", (payload) => {
      const severity = payload?.severity
        ? payload.severity.toUpperCase()
        : "HIGH";
      pushNotification(
        `[${severity}] ${payload?.title || "High-priority report received"}`,
        "alert",
      );
      refreshRealtimeQueries();
    });

    socket.on("notification:weekly_digest", (payload) => {
      const total = payload?.summary?.totalReports ?? 0;
      const highPriority = payload?.summary?.highPriorityReports ?? 0;
      pushNotification(
        `Weekly digest: ${total} reports, ${highPriority} high-priority.`,
        "digest",
      );
    });

    socket.on("staff_application:new", (payload) => {
      pushNotification(
        `New ${payload?.role === "law_enforcement" ? "LE" : "moderator"} application: ${payload?.username || "Unknown user"}`,
        "info",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [pushNotification, queryClient, userId]);
}
