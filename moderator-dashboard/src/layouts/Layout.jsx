import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { settingsAPI } from '../services/api'
import { applyDarkMode, persistDarkMode } from '../utils/theme'
import Navigation from './Navigation'

function Layout({ children }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [notifications, setNotifications] = useState([])
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

    const socket = io('http://localhost:3000', {
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
    <div className="flex h-screen bg-gray-50">
      <Navigation />
      <main className="flex-1 overflow-auto">
        <div className="fixed right-6 top-6 z-50 space-y-2">
          {activeNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`min-w-[280px] max-w-[420px] rounded-lg border px-4 py-3 shadow-lg ${
                notification.type === 'alert'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : notification.type === 'digest'
                    ? 'border-blue-200 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white text-gray-900'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
