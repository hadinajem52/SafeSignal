import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Home, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  Shield,
  ShieldCheck
} from 'lucide-react'

function Navigation() {
  const { logout, user } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
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
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Shield size={32} className="text-blue-400" />
          <h1 className="text-2xl font-bold">SafeSignal</h1>
        </div>
        <p className="text-xs text-gray-400 mt-2">Moderator Dashboard</p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(path)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

export default Navigation
