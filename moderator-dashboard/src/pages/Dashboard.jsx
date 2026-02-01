import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsAPI } from '../services/api'
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  BarChart3,
  Users,
  FileText
} from 'lucide-react'
import { getTimeAgo } from '../utils/dateUtils'

function StatCard({ icon: Icon, label, value, change, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p className="text-sm text-green-600 mt-2">↑ {change}% from last week</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={32} className="text-white" />
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const result = await statsAPI.getDashboardStats()
      if (result.success) return result.data
      throw new Error(result.error)
    },
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Use real stats from API
  const displayStats = stats || {
    totalIncidents: 0,
    pendingReports: 0,
    verifiedReports: 0,
    rejectedReports: 0,
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    recentIncidents: [],
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with SafeSignal.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={FileText}
          label="Total Reports"
          value={displayStats.totalIncidents}
          color="bg-blue-500"
        />
        <StatCard
          icon={Clock}
          label="Pending Review"
          value={displayStats.pendingReports}
          color="bg-yellow-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Verified Reports"
          value={displayStats.verifiedReports}
          color="bg-green-500"
        />
        <StatCard
          icon={AlertCircle}
          label="Rejected Reports"
          value={displayStats.rejectedReports}
          color="bg-red-500"
        />
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={displayStats.totalUsers}
          color="bg-purple-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Active Users"
          value={displayStats.activeUsers}
          color="bg-indigo-500"
        />
        <StatCard
          icon={AlertCircle}
          label="Suspended Users"
          value={displayStats.suspendedUsers}
          color="bg-orange-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={24} />
            Recent Reports
          </h2>
          <div className="space-y-4">
            {displayStats.recentIncidents && displayStats.recentIncidents.length > 0 ? (
              displayStats.recentIncidents.map((report) => (
                <div key={report.incident_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{report.title}</p>
                    <p className="text-sm text-gray-600">{getTimeAgo(report.created_at)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    report.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                    report.status === 'verified' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent reports</p>
            )}
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={24} />
            Activity Summary
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Total Reports</span>
                <span className="text-sm font-bold text-gray-900">{displayStats.totalIncidents}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, displayStats.totalIncidents / 10)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Active Users</span>
                <span className="text-sm font-bold text-gray-900">{displayStats.activeUsers}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${displayStats.totalUsers > 0 ? (displayStats.activeUsers / displayStats.totalUsers) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Verification Rate</span>
                <span className="text-sm font-bold text-gray-900">{displayStats.totalIncidents > 0 ? Math.round((displayStats.verifiedReports / displayStats.totalIncidents) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${displayStats.totalIncidents > 0 ? (displayStats.verifiedReports / displayStats.totalIncidents) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
