import React, { createContext, useContext, useState, useEffect } from 'react'
import { applyDarkMode, readStoredDarkMode } from '../utils/theme'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applyDarkMode(readStoredDarkMode())

    // Check if user is logged in (check localStorage)
    const storedUser = localStorage.getItem('moderator_user')
    const token = localStorage.getItem('moderator_token')
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser))
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
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
