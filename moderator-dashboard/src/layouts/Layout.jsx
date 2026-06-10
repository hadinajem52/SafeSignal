import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, Shield } from "lucide-react";
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
  const userId = user?.userId ?? user?.user_id;
  const queryClient = useQueryClient();
  const { notifications, pushNotification } = useToastQueue();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === "true",
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(next));
      return next;
    });
  };

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Prevent body scroll behind the open mobile drawer.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileNavOpen]);
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
      {/* Desktop sidebar (hidden below lg) */}
      <Navigation collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

      {/* Mobile drawer + backdrop (hidden at lg and up) */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Navigation
          mobile
          onToggle={() => setMobileNavOpen(false)}
          onNavigate={() => setMobileNavOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar with hamburger (hidden at lg and up) */}
        <header
          className="lg:hidden flex-shrink-0 flex items-center gap-3 h-14 px-3 bg-card border-b border-border"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-muted hover:text-text hover:bg-surface transition-colors"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Shield size={20} className="text-primary flex-shrink-0" />
            <span className="font-display font-bold text-text truncate">SafeSignal</span>
          </div>
        </header>

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
              className={`min-w-[280px] max-w-[420px] rounded-lg border border-l-4 bg-card px-4 py-3 shadow-lg ${
                notification.type === "alert"
                  ? "border-error/40 border-l-error text-error"
                  : notification.type === "digest"
                    ? "border-primary/40 border-l-primary text-primary"
                    : "border-border border-l-border text-text"
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>

        {isFullBleed ? (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {children}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}

export default Layout;
