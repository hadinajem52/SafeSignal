import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './layouts/Layout'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Login from './pages/Login'
import LawEnforcement from './pages/LawEnforcement'
import AdminPanel from './pages/AdminPanel'
import DataAnalysisCenter from './pages/DataAnalysisCenter'
import { AuthProvider, useAuth } from './context/AuthContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function FullPageLoading() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-muted">Loading...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <FullPageLoading />
  }

  return isAuthenticated ? children : <Navigate to="/login" />
}

function RoleProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <FullPageLoading />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/data-analysis-center" element={<DataAnalysisCenter />} />
                <Route
                  path="/reports"
                  element={
                    <RoleProtectedRoute allowedRoles={['moderator', 'admin']}>
                      <Reports />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="/lei"
                  element={
                    <RoleProtectedRoute allowedRoles={['law_enforcement', 'admin']}>
                      <LawEnforcement />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RoleProtectedRoute allowedRoles={['admin', 'moderator']}>
                      <Users />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RoleProtectedRoute allowedRoles={['admin']}>
                      <AdminPanel />
                    </RoleProtectedRoute>
                  }
                />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
