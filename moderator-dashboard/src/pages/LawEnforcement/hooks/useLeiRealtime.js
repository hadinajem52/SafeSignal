import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../../../utils/network";

export default function useLeiRealtime({
  user,
  queryClient,
  pushToast,
  setLeiAlerts,
  setLastRealtimeAlertAt,
}) {
  const notificationPermissionRequestedRef = useRef(false);

  useEffect(() => {
    if (user?.role !== "law_enforcement" && user?.role !== "admin") return;
    const token = localStorage.getItem("moderator_token");
    if (!token) return;

    const notifyCriticalAlert = async (payload) => {
      if (
        typeof Notification === "undefined" ||
        payload?.severity !== "critical"
      ) {
        return;
      }

      const show = () => {
        const n = new Notification("Critical LE Alert", {
          body: payload?.title || "Immediate dispatch required.",
        });
        n.onclick = () => window.focus();
      };

      if (Notification.permission === "granted") {
        show();
        return;
      }

      if (
        Notification.permission === "default" &&
        !notificationPermissionRequestedRef.current
      ) {
        notificationPermissionRequestedRef.current = true;
        const perm = await Notification.requestPermission();
        if (perm === "granted") show();
      }
    };

    const socket = io(SOCKET_URL, { auth: { token } });

    socket.on("lei_alert", (payload) => {
      if (payload?.status === "verified") {
        setLeiAlerts((prev) => [payload, ...prev].slice(0, 8));
      }

      setLastRealtimeAlertAt(Date.now());
      queryClient.invalidateQueries({ queryKey: ["lei-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["lei-incidents-snapshot"] });
      pushToast(
        `New LE alert: ${payload?.title || "Incident update received"}`,
        "warning",
      );
      notifyCriticalAlert(payload);
    });

    socket.on("incident:update", (payload) => {
      const incidentId = payload?.incidentId;
      const nextStatus = payload?.status;
      if (!incidentId || nextStatus === "verified") return;
      setLeiAlerts((prev) =>
        prev.filter((a) => String(a.incidentId) !== String(incidentId)),
      );
      queryClient.invalidateQueries({ queryKey: ["lei-incidents-snapshot"] });
    });

    return () => socket.disconnect();
  }, [queryClient, pushToast, setLastRealtimeAlertAt, setLeiAlerts, user]);
}
