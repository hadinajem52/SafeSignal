import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle } from 'lucide-react'
import { authAPI } from '../services/api'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [requestedRole, setRequestedRole] = useState('moderator')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      const result = await login(email, password)

      if (result.success) {
        navigate('/')
      } else {
        setError(result.error)
      }
    } catch (_error) {
      setError('Unable to login right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApplicationSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      const result = await authAPI.register({
        username,
        email,
        password,
        role: requestedRole,
      })

      if (result.success) {
        setSuccessMessage('Application submitted. An admin must approve your account before login.')
        setUsername('')
        setEmail('')
        setPassword('')
      } else {
        setError(result.error)
      }
    } catch (_error) {
      setError('Unable to submit application right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-soft p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">SafeSignal</h1>
          <p className="text-muted">Moderator Dashboard</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 bg-surface p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
              setSuccessMessage('')
            }}
            className={`py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'login' ? 'bg-card text-primary shadow-soft' : 'text-muted hover:text-text'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('apply')
              setError('')
              setSuccessMessage('')
            }}
            className={`py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'apply' ? 'bg-card text-primary shadow-soft' : 'text-muted hover:text-text'
            }`}
          >
            Apply Access
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}

        {mode === 'login' ? (
          <>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-card text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="moderator@safesignal.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-card text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:opacity-90 disabled:bg-muted text-white font-medium py-2 rounded-lg transition-colors"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-surface border border-border rounded-lg text-sm text-muted">
              <p className="font-semibold text-text mb-2">Demo Credentials:</p>
              <p>Email: moderator@safesignal.com</p>
              <p>Password: password123</p>
            </div>
          </>
        ) : (
          <form onSubmit={handleApplicationSubmit} className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-text mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                 className="w-full px-4 py-2 border border-border bg-card text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your_username"
                minLength={3}
                required
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-text mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                 className="w-full px-4 py-2 border border-border bg-card text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="name@example.com"
                required
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-text mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                 className="w-full px-4 py-2 border border-border bg-card text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-text mb-2">
                Request Role
              </label>
              <select
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value)}
                 className="w-full px-4 py-2 border border-border bg-card text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="moderator">Moderator</option>
                <option value="law_enforcement">Law Enforcement</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
               className="w-full bg-primary hover:opacity-90 disabled:bg-muted text-white font-medium py-2 rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
            <p className="text-sm text-muted">
              Your account stays pending until an admin approves your request in the Admin tab.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login
