import React, { createContext, useContext, useState, useEffect } from 'react'
import { applyDarkMode, readStoredDarkMode } from '../utils/theme'
import { API_BASE_URL } from '../utils/network'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applyDarkMode(readStoredDarkMode())

    const token = localStorage.getItem('moderator_token')

    const bootstrapAuth = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Session expired')
        }

        const data = await response.json()
        const userData = data?.data?.user
        if (!userData) {
          throw new Error('Invalid session')
        }

        localStorage.setItem('moderator_user', JSON.stringify(userData))
        setUser(userData)
        setIsAuthenticated(true)
      } catch (_error) {
        localStorage.removeItem('moderator_user')
        localStorage.removeItem('moderator_token')
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    bootstrapAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || 'Login failed')
      }

      const data = await response.json()
      const userData = data.data.user
      const token = data.data.token

      localStorage.setItem('moderator_user', JSON.stringify(userData))
      localStorage.setItem('moderator_token', token)
      setUser(userData)
      setIsAuthenticated(true)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('moderator_user')
    localStorage.removeItem('moderator_token')
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
