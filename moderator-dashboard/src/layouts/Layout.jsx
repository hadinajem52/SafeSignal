import React from 'react'
import { useAuth } from '../context/AuthContext'
import Navigation from './Navigation'

function Layout({ children }) {
  const { user } = useAuth()

  return (
    <div className="flex h-screen bg-gray-50">
      <Navigation />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
