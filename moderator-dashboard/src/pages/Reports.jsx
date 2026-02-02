import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsAPI } from '../services/api'
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle
} from 'lucide-react'
import { STATUS_COLORS, STATUS_LABELS, MODERATOR_STATUS_FILTERS } from '../constants/incident'

function Reports() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const result = await reportsAPI.getAll(params)
      return result.success ? result.data : []
    },
  })

  const queryClient = useQueryClient()

  const verifyMutation = useMutation({
    mutationFn: (id) => reportsAPI.verify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setSelectedReport(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id) => reportsAPI.reject(id, 'Rejected by moderator'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setSelectedReport(null)
    },
  })

  // Transform API data to match UI format and filter
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter
    return matchesSearch && matchesStatus
  }).map(report => ({
    ...report,
    id: report.incident_id,
    reporter: report.username || 'Anonymous',
    location: report.location_name ? `${report.latitude}, ${report.longitude}` : 'Unknown Location',
    createdAt: report.created_at || report.incident_date,
  }))

  const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.default

  const formatStatusLabel = (status) => {
    if (STATUS_LABELS[status]) {
      return STATUS_LABELS[status]
    }
    return status.replace('_', ' ').toUpperCase()
  }

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'low':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'high':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports Management</h1>
        <p className="text-gray-600 mt-2">Review and manage incident reports</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline mr-2" size={18} /> Search Reports
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or description..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="inline mr-2" size={18} /> Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {MODERATOR_STATUS_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map(report => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{report.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {formatStatusLabel(report.status)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{report.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>📍 {report.location}</span>
                    <span>👤 {report.reporter}</span>
                    <span>📅 {new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className={`text-3xl font-bold ml-4 ${getSeverityColor(report.severity)}`}>
                  {report.severity.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          ))}
          {filteredReports.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No reports found matching your criteria</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Report Details</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{selectedReport.title}</h3>
                <div className="flex gap-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedReport.status)}`}>
                    {formatStatusLabel(selectedReport.status)}
                  </span>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800`}>
                    {selectedReport.category.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedReport.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Reported By</p>
                  <p className="font-medium text-gray-900">{selectedReport.reporter}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium text-gray-900">{selectedReport.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date Reported</p>
                  <p className="font-medium text-gray-900">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Severity Level</p>
                  <p className={`font-medium capitalize ${getSeverityColor(selectedReport.severity)}`}>
                    {selectedReport.severity}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 flex gap-3">
                <button 
                  onClick={() => verifyMutation.mutate(selectedReport.id)}
                  disabled={verifyMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle size={20} />
                  {verifyMutation.isPending ? 'Verifying...' : 'Verify'}
                </button>
                <button 
                  onClick={() => rejectMutation.mutate(selectedReport.id)}
                  disabled={rejectMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle size={20} />
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
