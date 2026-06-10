import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
  X,
} from 'lucide-react'

function NavSection({ label, collapsed }) {
  if (collapsed) return <div className="h-px bg-border mx-2 my-2" />
  return (
    <div className="px-3 pt-4 pb-1.5">
      <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted/70 select-none">
        {label}
      </span>
    </div>
  )
}

function NavItem({ path, label, icon: Icon, active, collapsed, mobile, onNavigate }) {
  if (collapsed) {
    return (
      <Link
        to={path}
        onClick={onNavigate}
        title={label}
        className={`flex items-center justify-center h-10 w-10 mx-auto transition-colors w-full ${
          active ? 'text-primary' : 'text-muted/80 hover:bg-card hover:text-text'
        }`}
      >
        <Icon size={14} className="flex-shrink-0" />
        <span className="sr-only">{label}</span>
      </Link>
    )
  }

  return (
    <Link
      to={path}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 transition-colors w-full border-l-2 font-[500] ${
        mobile ? 'px-4 py-3 text-sm' : 'px-[10px] py-2 text-[13px]'
      } ${
        active
          ? 'border-l-primary bg-primary/[0.08] text-primary'
          : 'border-l-transparent text-muted/80 hover:bg-card hover:text-text'
      }`}
    >
      <Icon size={mobile ? 17 : 14} className="flex-shrink-0" />
      <span>{label}</span>
    </Link>
  )
}

function Navigation({ collapsed, onToggle, mobile = false, onNavigate }) {
  const { logout, user } = useAuth()
  const location = useLocation()

  // The mobile drawer always shows the expanded layout regardless of the
  // desktop collapse preference.
  const isCollapsed = mobile ? false : collapsed
  const isActive = (path) => location.pathname === path

  const navGroup = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/data-analysis-center', label: 'Data Analysis Center', icon: LayoutDashboard },
  ]

  const opsGroup = [
    ...(user?.role !== 'law_enforcement'
      ? [{ path: '/reports', label: 'Reports', icon: FileText }]
      : []),
    ...(user?.role === 'law_enforcement' || user?.role === 'admin'
      ? [{ path: '/lei', label: 'LE Interface', icon: Shield }]
      : []),
    ...(user?.role === 'admin' || user?.role === 'moderator'
      ? [{ path: '/users', label: 'Users', icon: Users }]
      : []),
    ...(user?.role === 'admin'
      ? [{ path: '/admin', label: 'Admin', icon: ShieldCheck }]
      : []),
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div
      className={`flex flex-col bg-card border-r border-border font-display overflow-hidden ${
        mobile
          ? 'h-full w-[264px] max-w-[82vw]'
          : `hidden lg:flex flex-shrink-0 ${isCollapsed ? 'w-[60px]' : 'w-56'}`
      }`}
    >
      {/* Logo + collapse/close button */}
      <div className={`flex items-center border-b border-border flex-shrink-0 h-[61px] ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-2.5 justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <Shield size={22} className="text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-text leading-tight truncate">SafeSignal</h1>
              <p className="text-[10px] text-muted leading-tight">Moderator Dashboard</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={mobile ? 'Close menu' : isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={mobile ? 'Close menu' : isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex items-center justify-center rounded-lg transition-colors flex-shrink-0 text-muted hover:text-text hover:bg-surface ${
            isCollapsed ? 'w-9 h-9' : mobile ? 'w-9 h-9' : 'w-7 h-7'
          }`}
        >
          {mobile ? <X size={18} /> : isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1">
        <NavSection label="Navigation" collapsed={isCollapsed} />
        {navGroup.map(({ path, label, icon }) => (
          <NavItem key={path} path={path} label={label} icon={icon}
            active={isActive(path)} collapsed={isCollapsed} mobile={mobile} onNavigate={onNavigate} />
        ))}

        <NavSection label="Operations" collapsed={isCollapsed} />
        {opsGroup.map(({ path, label, icon }) => (
          <NavItem key={path} path={path} label={label} icon={icon}
            active={isActive(path)} collapsed={isCollapsed} mobile={mobile} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Logout */}
      <div className={`border-t border-border flex-shrink-0 ${isCollapsed ? 'py-1' : 'p-3'}`}>
        <button
          onClick={() => { onNavigate?.(); logout() }}
          title={isCollapsed ? 'Logout' : undefined}
          className={`flex items-center gap-2.5 font-[500] text-muted/80 hover:text-text transition-colors w-full ${
            isCollapsed
              ? 'justify-center h-10 w-10 mx-auto'
              : `border-l-2 border-l-transparent hover:bg-card ${mobile ? 'px-4 py-3 text-sm' : 'px-[10px] py-2 text-[13px]'}`
          }`}
        >
          <LogOut size={mobile ? 17 : 14} className="flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}

export default Navigation
