import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../constants/routes";
import {
  Home,
  FileText,
  Users,
  Settings,
  LogOut,
  Shield,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
} from "lucide-react";

function NavSection({ label, collapsed }) {
  if (collapsed) return <div className="h-px bg-border mx-2 my-2" />;
  return (
    <div className="px-3 pt-4 pb-1.5">
      <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted/70 select-none">
        {label}
      </span>
    </div>
  );
}

function NavItem({ path, label, icon: Icon, active, collapsed }) {
  return (
    <Link
      to={path}
      title={collapsed ? label : undefined}
      className={`
        flex items-center gap-2.5 transition-colors w-full
        ${
          collapsed
            ? `justify-center h-10 w-10 mx-auto ${active ? "text-primary" : ""}`
            : `px-[10px] py-2 border-l-2 text-[13px] font-[500]
             ${
               active
                 ? "border-l-primary bg-primary/[0.08] text-primary"
                 : "border-l-transparent text-muted/80 hover:bg-card hover:text-text"
             }`
        }
      `}
    >
      <Icon size={14} className="flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
      {active && collapsed && <span className="sr-only">{label}</span>}
    </Link>
  );
}

function Navigation({ collapsed, onToggle }) {
  const { logout, user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navGroup = useMemo(
    () => [
      { path: ROUTES.HOME, label: "Dashboard", icon: Home },
      {
        path: ROUTES.DATA_ANALYSIS,
        label: "Data Analysis Center",
        icon: LayoutDashboard,
      },
    ],
    [],
  );

  const opsGroup = useMemo(
    () => [
      ...(user?.role !== "law_enforcement"
        ? [{ path: ROUTES.REPORTS, label: "Reports", icon: FileText }]
        : []),
      ...(user?.role === "law_enforcement" || user?.role === "admin"
        ? [{ path: ROUTES.LEI, label: "LE Interface", icon: Shield }]
        : []),
      ...(user?.role === "admin" || user?.role === "moderator"
        ? [{ path: ROUTES.USERS, label: "Users", icon: Users }]
        : []),
      ...(user?.role === "admin"
        ? [{ path: ROUTES.ADMIN, label: "Admin", icon: ShieldCheck }]
        : []),
      { path: ROUTES.SETTINGS, label: "Settings", icon: Settings },
    ],
    [user?.role],
  );

  return (
    <div
      className={`
        flex flex-col flex-shrink-0 bg-card border-r border-border
        transition-all duration-300 ease-in-out overflow-hidden
        ${collapsed ? "w-[60px]" : "w-56"}
      `}
    >
      {/* Logo + collapse button */}
      <div
        className={`flex items-center border-b border-border flex-shrink-0 h-[61px] ${collapsed ? "justify-center px-0" : "px-4 gap-2.5 justify-between"}`}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <Shield size={22} className="text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-text leading-tight truncate">
                SafeSignal
              </h1>
              <p className="text-[10px] text-muted leading-tight">
                Moderator Dashboard
              </p>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`
            flex items-center justify-center rounded-lg transition-colors flex-shrink-0
            text-muted hover:text-text hover:bg-surface
            ${collapsed ? "w-9 h-9" : "w-7 h-7"}
          `}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1">
        <NavSection label="Navigation" collapsed={collapsed} />
        {navGroup.map(({ path, label, icon }) => (
          <NavItem
            key={path}
            path={path}
            label={label}
            icon={icon}
            active={isActive(path)}
            collapsed={collapsed}
          />
        ))}

        <NavSection label="Operations" collapsed={collapsed} />
        {opsGroup.map(({ path, label, icon }) => (
          <NavItem
            key={path}
            path={path}
            label={label}
            icon={icon}
            active={isActive(path)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Logout */}
      <div
        className={`border-t border-border flex-shrink-0 ${collapsed ? "py-1" : "p-3"}`}
      >
        <button
          onClick={logout}
          title={collapsed ? "Logout" : undefined}
          className={`flex items-center gap-2.5 text-[13px] font-[500] text-muted/80
            hover:text-text transition-colors w-full
            ${collapsed ? "justify-center h-10 w-10 mx-auto" : "px-[10px] py-2 border-l-2 border-l-transparent hover:bg-card"}`}
        >
          <LogOut size={14} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

export default Navigation;
