import React, { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsAPI } from '../services/api'
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  AlertTriangle
} from 'lucide-react'
import { io } from 'socket.io-client'
import { MODERATOR_STATUS_FILTERS } from '../constants/incident'
import DetailPanel from '../components/DetailPanel'
import IncidentTimeline from '../components/IncidentTimeline'
import DedupCandidatesPanel from '../components/DedupCandidatesPanel'
import EmptyState from '../components/EmptyState'
import FilterDropdown from '../components/FilterDropdown'
import GoogleMapPanel from '../components/GoogleMapPanel'
import LoadingState from '../components/LoadingState'
import PageHeader from '../components/PageHeader'
import SearchInput from '../components/SearchInput'
import SeverityBadge from '../components/SeverityBadge'
import StatusBadge from '../components/StatusBadge'
import {
  openMapsUrl,
} from '../utils/incident'

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

  const { data: dedupData, isLoading: isDedupLoading } = useQuery({
    queryKey: ['report-dedup', selectedReport?.id],
    queryFn: async () => {
      if (!selectedReport?.id) return null
      const result = await reportsAPI.getDedup(selectedReport.id)
      return result.success ? result.data : null
    },
    enabled: Boolean(selectedReport?.id),
  })

  const { data: mlSummary, isLoading: isMlLoading } = useQuery({
    queryKey: ['report-ml', selectedReport?.id],
    queryFn: async () => {
      if (!selectedReport?.id) return null
      const result = await reportsAPI.getMlSummary(selectedReport.id)
      return result.success ? result.data : null
    },
    enabled: Boolean(selectedReport?.id),
  })

  const queryClient = useQueryClient()

  useEffect(() => {
    const token = localStorage.getItem('moderator_token')
    if (!token) return

    const socket = io('http://localhost:3000', {
      auth: { token },
    })

    socket.on('incident:new', () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    })

    socket.on('incident:update', () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient])

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

  const linkDuplicateMutation = useMutation({
    mutationFn: (duplicateIncidentId) => reportsAPI.linkDuplicate(selectedReport.id, duplicateIncidentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['report-dedup', selectedReport?.id] })
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: (category) => reportsAPI.updateCategory(selectedReport.id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['report-ml', selectedReport?.id] })
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
    location: report.location_name || `${report.latitude}, ${report.longitude}`,
    createdAt: report.created_at || report.incident_date,
  }))

  return (
    <div>
      {/* Header */}
      <PageHeader title="Reports Management" description="Review and manage incident reports" />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2">
            <SearchInput
              label="Search Reports"
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or description..."
            />
          </div>
          <FilterDropdown
            label={<><Filter className="inline mr-2" size={18} /> Filter by Status</>}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={MODERATOR_STATUS_FILTERS}
          />
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <LoadingState />
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
                    <StatusBadge status={report.status} />
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{report.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>📍 {report.location}</span>
                    <span>👤 {report.reporter}</span>
                    <span>📅 {new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <SeverityBadge severity={report.severity} display="initial" />
              </div>
            </div>
          ))}
          {filteredReports.length === 0 && (
            <EmptyState icon={AlertTriangle} message="No reports found matching your criteria" />
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <DetailPanel
          visible={!!selectedReport}
          title="Report Details"
          onClose={() => setSelectedReport(null)}
          maxWidthClass="max-w-6xl"
        >

            <div className="flex-1 overflow-hidden flex">
              {/* Left side - Report details */}
              <div className="w-1/2 p-6 space-y-6 overflow-y-auto border-r">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{selectedReport.title}</h3>
                  <div className="flex gap-3">
                    <StatusBadge status={selectedReport.status} size="sm" />
                    <span className={`px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800`}>
                      {selectedReport.category.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700">{selectedReport.description}</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900">Location Context</h4>
                    <a
                      href={openMapsUrl(selectedReport.latitude, selectedReport.longitude)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                  <GoogleMapPanel
                    markers={[
                      {
                        id: `report-${selectedReport.id}`,
                        lat: selectedReport.latitude,
                        lng: selectedReport.longitude,
                        title: selectedReport.title || `Incident #${selectedReport.id}`,
                      },
                    ]}
                    center={{ lat: selectedReport.latitude, lng: selectedReport.longitude }}
                    height={220}
                    zoom={15}
                    autoFit={false}
                    emptyMessage="No coordinates available for this report."
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900">ML Insights</h4>
                    {isMlLoading && <span className="text-xs text-gray-500">Loading...</span>}
                  </div>

                  {!isMlLoading && !mlSummary && (
                    <p className="text-sm text-gray-600">No ML data available.</p>
                  )}

                  {mlSummary && (
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-center justify-between">
                        <span>Suggested category</span>
                        <span className="font-semibold text-gray-900">
                          {mlSummary.predictedCategory || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Category confidence</span>
                        <span className="font-semibold text-gray-900">{mlSummary.categoryConfidence}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Risk score</span>
                        <span className={`font-semibold ${mlSummary.riskScore >= 0.8 ? 'text-red-600' : mlSummary.riskScore >= 0.5 ? 'text-amber-600' : 'text-gray-900'}`}>
                          {mlSummary.riskScore}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Toxicity</span>
                        <span className={`font-semibold ${mlSummary.isToxic ? 'text-red-600' : 'text-gray-900'}`}>
                          {mlSummary.isToxic ? `Flagged (${mlSummary.toxicityScore})` : mlSummary.toxicityScore}
                        </span>
                      </div>

                      {mlSummary.predictedCategory && mlSummary.predictedCategory !== selectedReport.category && (
                        <button
                          onClick={() => updateCategoryMutation.mutate(mlSummary.predictedCategory)}
                          disabled={updateCategoryMutation.isPending}
                          className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                        >
                          {updateCategoryMutation.isPending ? 'Updating...' : 'Apply Suggested Category'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <DedupCandidatesPanel
                  dedup={dedupData}
                  isLoading={isDedupLoading}
                  isMerging={linkDuplicateMutation.isPending}
                  sourceIncident={{
                    incidentId: selectedReport.id,
                    title: selectedReport.title,
                    description: selectedReport.description,
                    latitude: selectedReport.latitude,
                    longitude: selectedReport.longitude,
                  }}
                  onMerge={(duplicateIncidentId) => linkDuplicateMutation.mutate(duplicateIncidentId)}
                />

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
                    <SeverityBadge severity={selectedReport.severity} display="text" />
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

              {/* Right side - Timeline */}
              <div className="w-1/2 flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-900">Timeline & Communication</h3>
                  <p className="text-sm text-gray-600 mt-1">Communicate with the reporter or add internal notes</p>
                </div>
                <div className="flex-1">
                  <IncidentTimeline incidentId={selectedReport.id} />
                </div>
              </div>
            </div>
        </DetailPanel>
      )}
    </div>
  )
}

export default Reports
