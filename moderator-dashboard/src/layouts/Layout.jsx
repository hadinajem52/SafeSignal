import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { settingsAPI } from '../services/api'
import { SOCKET_URL } from '../utils/network'
import { applyDarkMode, persistDarkMode } from '../utils/theme'
import Navigation from './Navigation'

function Layout({ children }) {
  const location = useLocation()
  const isFullBleed = location.pathname === '/reports'
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [notifications, setNotifications] = useState([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  )

  const handleSidebarToggle = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }
  const { data: dashboardSettings } = useQuery({
    queryKey: ['dashboardSettings'],
    queryFn: async () => {
      const result = await settingsAPI.get()
      if (!result.success) return null
      return result.data
    },
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  })

  const activeNotifications = useMemo(() => notifications.slice(0, 4), [notifications])

  useEffect(() => {
    if (typeof dashboardSettings?.darkMode !== 'boolean') return
    applyDarkMode(dashboardSettings.darkMode)
    persistDarkMode(dashboardSettings.darkMode)
  }, [dashboardSettings?.darkMode])

  useEffect(() => {
    const token = localStorage.getItem('moderator_token')
    if (!token || !user) return undefined

    const socket = io(SOCKET_URL, {
      auth: { token },
    })

    const pushNotification = (message, type = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setNotifications((prev) => [{ id, message, type }, ...prev].slice(0, 8))
      setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== id))
      }, 6000)
    }

    const refreshRealtimeQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
      queryClient.invalidateQueries({ queryKey: ['lei-incident'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
    }

    socket.on('incident:new', () => {
      refreshRealtimeQueries()
    })

    socket.on('incident:update', () => {
      refreshRealtimeQueries()
    })

    socket.on('incident:duplicate', () => {
      refreshRealtimeQueries()
    })

    socket.on('lei_alert', () => {
      refreshRealtimeQueries()
    })

    socket.on('notification:report_alert', (payload) => {
      const severity = payload?.severity ? payload.severity.toUpperCase() : 'HIGH'
      pushNotification(`[${severity}] ${payload?.title || 'High-priority report received'}`, 'alert')
      refreshRealtimeQueries()
    })

    socket.on('notification:weekly_digest', (payload) => {
      const total = payload?.summary?.totalReports ?? 0
      const highPriority = payload?.summary?.highPriorityReports ?? 0
      pushNotification(`Weekly digest: ${total} reports, ${highPriority} high-priority.`, 'digest')
    })

    socket.on('staff_application:new', (payload) => {
      pushNotification(
        `New ${payload?.role === 'law_enforcement' ? 'LE' : 'moderator'} application: ${payload?.username || 'Unknown user'}`,
        'info'
      )
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient, user])

  return (
    <div className="flex h-dvh bg-bg">
      <Navigation collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
      <main className={`flex-1 ${isFullBleed ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
        <div
          className="fixed z-50 space-y-2"
          style={{
            right: 'calc(env(safe-area-inset-right, 0px) + 1.5rem)',
            top: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
          }}
        >
          {activeNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`min-w-[280px] max-w-[420px] rounded-lg border px-4 py-3 shadow-lg ${notification.type === 'alert'
                  ? 'border-error/30 bg-error/10 text-error'
                  : notification.type === 'digest'
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-card text-text'
                }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
        {isFullBleed ? children : (
          <div
            className="p-8"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)',
              paddingRight: 'calc(env(safe-area-inset-right, 0px) + 2rem)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
              paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 2rem)',
            }}
          >
            {children}
          </div>
        )}
      </main>
    </div>
  )
}

export default Layout
