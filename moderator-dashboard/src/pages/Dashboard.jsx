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

  // Use mock data if query fails or as fallback
  const displayStats = stats || {
    totalIncidents: 1247,
    pendingReports: 34,
    verifiedReports: 892,
    rejectedReports: 145,
    totalUsers: 5643,
    activeUsers: 3821,
    suspendedUsers: 156,
  }

  const mockStats = {
    totalReports: displayStats.totalIncidents,
    pendingReports: displayStats.pendingReports,
    verifiedReports: displayStats.verifiedReports,
    rejectedReports: displayStats.rejectedReports,
    totalUsers: displayStats.totalUsers,
    activeUsers: displayStats.activeUsers,
    suspendedUsers: displayStats.suspendedUsers,
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
          value={mockStats.totalReports}
          change={12}
          color="bg-blue-500"
        />
        <StatCard
          icon={Clock}
          label="Pending Review"
          value={mockStats.pendingReports}
          change={-8}
          color="bg-yellow-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Verified Reports"
          value={mockStats.verifiedReports}
          change={15}
          color="bg-green-500"
        />
        <StatCard
          icon={AlertCircle}
          label="Rejected Reports"
          value={mockStats.rejectedReports}
          change={3}
          color="bg-red-500"
        />
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={mockStats.totalUsers}
          color="bg-purple-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Active Users"
          value={mockStats.activeUsers}
          color="bg-indigo-500"
        />
        <StatCard
          icon={AlertCircle}
          label="Suspended Users"
          value={mockStats.suspendedUsers}
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
            {[
              { title: 'Suspicious Activity Near Park', status: 'pending', time: '2 hours ago' },
              { title: 'Vandalism Reported', status: 'verified', time: '4 hours ago' },
              { title: 'Traffic Incident', status: 'rejected', time: '1 day ago' },
              { title: 'Assault Report', status: 'pending', time: '2 days ago' },
            ].map((report, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{report.title}</p>
                  <p className="text-sm text-gray-600">{report.time}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  report.status === 'verified' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </span>
              </div>
            ))}
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
                <span className="text-sm font-medium text-gray-700">Reports Processed</span>
                <span className="text-sm font-bold text-gray-900">287</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '72%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Users Moderated</span>
                <span className="text-sm font-bold text-gray-900">156</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Verification Accuracy</span>
                <span className="text-sm font-bold text-gray-900">94.2%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
