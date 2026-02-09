import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import Navigation from './Navigation'

function Layout({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])

  const activeNotifications = useMemo(() => notifications.slice(0, 4), [notifications])

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

    socket.on('notification:report_alert', (payload) => {
      const severity = payload?.severity ? payload.severity.toUpperCase() : 'HIGH'
      pushNotification(`[${severity}] ${payload?.title || 'High-priority report received'}`, 'alert')
    })

    socket.on('notification:weekly_digest', (payload) => {
      const total = payload?.summary?.totalReports ?? 0
      const highPriority = payload?.summary?.highPriorityReports ?? 0
      pushNotification(`Weekly digest: ${total} reports, ${highPriority} high-priority.`, 'digest')
    })

    return () => {
      socket.disconnect()
    }
  }, [user])

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
