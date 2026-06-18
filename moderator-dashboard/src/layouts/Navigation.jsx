import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SUBNAV, subnavPath, isSubnavItemActive } from '../constants/subnav'
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
  ChevronDown,
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

// Expanded-sidebar parent with an accordion of sub-sections. The label area
// navigates to the base route; the chevron toggles the submenu independently.
function ExpandableNavItem({
  path,
  label,
  icon: Icon,
  active,
  open,
  onToggle,
  mobile,
  onNavigate,
  search,
}) {
  const config = SUBNAV[path]

  return (
    <div>
      <div className="relative">
        <Link
          to={path}
          onClick={onNavigate}
          className={`flex items-center gap-2.5 transition-colors w-full border-l-2 font-[500] ${
            mobile ? 'px-4 py-3 pr-10 text-sm' : 'px-[10px] py-2 pr-9 text-[13px]'
          } ${
            active
              ? 'border-l-primary bg-primary/[0.08] text-primary'
              : 'border-l-transparent text-muted/80 hover:bg-card hover:text-text'
          }`}
        >
          <Icon size={mobile ? 17 : 14} className="flex-shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${label} menu`}
          aria-expanded={open}
          className={`absolute right-0 top-0 h-full flex items-center justify-center transition-colors ${
            mobile ? 'w-10' : 'w-9'
          } ${active ? 'text-primary' : 'text-muted/70 hover:text-text'}`}
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
          />
        </button>
      </div>

      {open && (
        <div className={`mb-1 mt-0.5 border-l border-border/50 ${mobile ? 'ml-5' : 'ml-[18px]'}`}>
          {config.items.map((item) => {
            const itemActive = isSubnavItemActive(path, item.value, search)
            return (
              <Link
                key={item.value}
                to={subnavPath(path, config.paramKey, item.value)}
                onClick={onNavigate}
                className={`flex items-center -ml-px border-l-2 transition-colors ${
                  mobile ? 'pl-4 pr-3 py-2.5 text-[13px]' : 'pl-4 pr-2.5 py-[7px] text-[12px]'
                } ${
                  itemActive
                    ? 'border-l-primary text-primary bg-primary/[0.07]'
                    : 'border-l-transparent text-muted/70 hover:text-text hover:bg-card'
                }`}
              >
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Hover flyout shown for collapsed-rail items that have sub-sections. Fixed
// positioning escapes the nav's vertical scroll clipping.
function CollapsedFlyout({ item, top, left, search, onClose, onCloseAfterDelay, onCancelClose }) {
  const config = SUBNAV[item.path]
  const Icon = item.icon

  return (
    <div
      style={{ position: 'fixed', top, left, zIndex: 60, paddingLeft: 6 }}
      onMouseEnter={onCancelClose}
      onMouseLeave={onCloseAfterDelay}
    >
      <div className="min-w-[184px] bg-card border border-border shadow-soft py-1">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
          <Icon size={13} className="text-primary flex-shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-text">
            {item.label}
          </span>
        </div>
        {config.items.map((sub) => {
          const subActive = isSubnavItemActive(item.path, sub.value, search)
          return (
            <Link
              key={sub.value}
              to={subnavPath(item.path, config.paramKey, sub.value)}
              onClick={onClose}
              className={`block px-3 py-2 text-[12px] border-l-2 transition-colors ${
                subActive
                  ? 'border-l-primary text-primary bg-primary/[0.07]'
                  : 'border-l-transparent text-muted/80 hover:text-text hover:bg-surface'
              }`}
            >
              {sub.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Navigation({ collapsed, onToggle, mobile = false, onNavigate }) {
  const { logout, user } = useAuth()
  const location = useLocation()

  // The mobile drawer always shows the expanded layout regardless of the
  // desktop collapse preference.
  const isCollapsed = mobile ? false : collapsed
  const isActive = (path) => location.pathname === path

  // Per-parent expand overrides; when unset, a parent is open iff it's the
  // active route (so the current section's sub-items are visible by default).
  const [openOverrides, setOpenOverrides] = useState({})
  const isOpen = (path) => openOverrides[path] ?? isActive(path)
  const toggleOpen = (path) =>
    setOpenOverrides((prev) => ({ ...prev, [path]: !isOpen(path) }))

  // Collapsed-rail flyout state.
  const [flyout, setFlyout] = useState(null) // { path, top, left }
  const closeTimer = useRef(null)

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }
  const closeAfterDelay = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setFlyout(null), 120)
  }
  const openFlyout = (path, el) => {
    cancelClose()
    const rect = el.getBoundingClientRect()
    setFlyout({ path, top: rect.top, left: rect.right })
  }
  const closeFlyout = () => {
    cancelClose()
    setFlyout(null)
  }

  // Drop any open flyout when collapsing/expanding, and clear the timer on unmount.
  useEffect(() => {
    setFlyout(null)
  }, [isCollapsed])
  useEffect(() => () => cancelClose(), [])

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

  const renderOpsItem = (item) => {
    const hasSubnav = Boolean(SUBNAV[item.path])

    if (hasSubnav && isCollapsed) {
      return (
        <div
          key={item.path}
          onMouseEnter={(event) => openFlyout(item.path, event.currentTarget)}
          onMouseLeave={closeAfterDelay}
        >
          <NavItem
            path={item.path}
            label={item.label}
            icon={item.icon}
            active={isActive(item.path)}
            collapsed
            onNavigate={onNavigate}
          />
        </div>
      )
    }

    if (hasSubnav) {
      return (
        <ExpandableNavItem
          key={item.path}
          path={item.path}
          label={item.label}
          icon={item.icon}
          active={isActive(item.path)}
          open={isOpen(item.path)}
          onToggle={() => toggleOpen(item.path)}
          mobile={mobile}
          onNavigate={onNavigate}
          search={location.search}
        />
      )
    }

    return (
      <NavItem
        key={item.path}
        path={item.path}
        label={item.label}
        icon={item.icon}
        active={isActive(item.path)}
        collapsed={isCollapsed}
        mobile={mobile}
        onNavigate={onNavigate}
      />
    )
  }

  const flyoutItem = flyout ? opsGroup.find((item) => item.path === flyout.path) : null

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
        {opsGroup.map(renderOpsItem)}
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

      {flyoutItem && (
        <CollapsedFlyout
          item={flyoutItem}
          top={flyout.top}
          left={flyout.left}
          search={location.search}
          onClose={closeFlyout}
          onCloseAfterDelay={closeAfterDelay}
          onCancelClose={cancelClose}
        />
      )}
    </div>
  )
}

export default Navigation
