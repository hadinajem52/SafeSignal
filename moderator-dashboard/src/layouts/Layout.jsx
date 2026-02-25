import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { settingsAPI } from "../services/api";
import { applyDarkMode, persistDarkMode } from "../utils/theme";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { FULL_BLEED_ROUTES } from "../constants/routes";
import { useRealtimeInvalidation } from "./hooks/useRealtimeInvalidation";
import { useToastQueue } from "./hooks/useToastQueue";
import Navigation from "./Navigation";

function Layout({ children }) {
  const location = useLocation();
  const isFullBleed = FULL_BLEED_ROUTES.has(location.pathname);
  const { user } = useAuth();
  const userId = user?.user_id;
  const queryClient = useQueryClient();
  const { notifications, pushNotification } = useToastQueue();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === "true",
  );

  const handleSidebarToggle = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(next));
      return next;
    });
  };
  const { data: dashboardSettings } = useQuery({
    queryKey: ["dashboardSettings"],
    queryFn: async () => {
      const result = await settingsAPI.get();
      if (!result.success) return null;
      return result.data;
    },
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (typeof dashboardSettings?.darkMode !== "boolean") return;
    applyDarkMode(dashboardSettings.darkMode);
    persistDarkMode(dashboardSettings.darkMode);
  }, [dashboardSettings?.darkMode]);

  useRealtimeInvalidation({ userId, queryClient, pushNotification });

  return (
    <div className="flex h-dvh bg-bg">
      <Navigation collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
      <main
        className={`flex-1 ${isFullBleed ? "overflow-hidden flex flex-col" : "overflow-auto"}`}
      >
        <div
          className="fixed z-50 space-y-2"
          style={{
            right: "calc(env(safe-area-inset-right, 0px) + 1.5rem)",
            top: "calc(env(safe-area-inset-top, 0px) + 1.5rem)",
          }}
        >
          {notifications.slice(0, 4).map((notification) => (
            <div
              key={notification.id}
              className={`min-w-[280px] max-w-[420px] rounded-lg border px-4 py-3 shadow-lg ${
                notification.type === "alert"
                  ? "border-error/30 bg-error/10 text-error"
                  : notification.type === "digest"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-text"
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
        {isFullBleed ? (
          children
        ) : (
          <div
            className="p-8"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)",
              paddingRight: "calc(env(safe-area-inset-right, 0px) + 2rem)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)",
              paddingLeft: "calc(env(safe-area-inset-left, 0px) + 2rem)",
            }}
          >
            {children}
          </div>
        )}
      </main>
    </div>
  );
}

export default Layout;
