import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BadgeCheck, MapPin, Search, Shield } from 'lucide-react'
import { io } from 'socket.io-client'
import { leiAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { STATUS_COLORS, STATUS_LABELS, LEI_STATUS_FILTERS, CLOSURE_OUTCOMES } from '../constants/incident'

const STATUS_TRANSITIONS = {
  verified: ['dispatched', 'investigating', 'police_closed'],
  dispatched: ['on_scene', 'investigating', 'police_closed'],
  on_scene: ['investigating', 'police_closed'],
  investigating: ['police_closed'],
  police_closed: [],
}

function LawEnforcement() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('verified')
  const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const [closeOutcome, setCloseOutcome] = useState('resolved_handled')
  const [closeNotes, setCloseNotes] = useState('')
  const [caseId, setCaseId] = useState('')
  const [leiAlerts, setLeiAlerts] = useState([])

  const queryClient = useQueryClient()

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['lei-incidents', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const result = await leiAPI.getAll(params)
      return result.success ? result.data : []
    },
  })

  const { data: incidentDetail } = useQuery({
    queryKey: ['lei-incident', selectedIncidentId],
    queryFn: async () => {
      const result = await leiAPI.getById(selectedIncidentId)
      return result.success ? result.data : null
    },
    enabled: Boolean(selectedIncidentId),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, payload }) => leiAPI.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
      queryClient.invalidateQueries({ queryKey: ['lei-incident', selectedIncidentId] })
    },
  })

  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((incident) => {
        const matchesSearch =
          incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          incident.description.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
      })
      .sort((a, b) => {
        const severityRank = { critical: 1, high: 2, medium: 3, low: 4 }
        const rankA = severityRank[a.severity] || 5
        const rankB = severityRank[b.severity] || 5
        if (rankA !== rankB) return rankA - rankB
        return new Date(b.incident_date || b.created_at) - new Date(a.incident_date || a.created_at)
      })
      .map((incident) => ({
        ...incident,
        id: incident.incident_id,
        createdAt: incident.incident_date || incident.created_at,
      }))
  }, [incidents, searchTerm])

  const selectedIncident = incidentDetail?.incident
  const actionLog = incidentDetail?.actions || []

  const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.default

  const formatStatusLabel = (status) => {
    if (STATUS_LABELS[status]) {
      return STATUS_LABELS[status]
    }
    return status.replace('_', ' ').toUpperCase()
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600'
      case 'high':
        return 'text-orange-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const openMapsUrl = (latitude, longitude) =>
    `https://www.google.com/maps?q=${latitude},${longitude}`

  const canTransitionTo = (currentStatus, nextStatus) =>
    (STATUS_TRANSITIONS[currentStatus] || []).includes(nextStatus)

  const handleStatusUpdate = (status) => {
    if (!selectedIncident) return
    statusMutation.mutate({
      id: selectedIncident.incident_id,
      payload: { status },
    })
  }

  const handleCloseCase = () => {
    if (!selectedIncident) return
    statusMutation.mutate({
      id: selectedIncident.incident_id,
      payload: {
        status: 'police_closed',
        closure_outcome: closeOutcome,
        closure_details: {
          case_id: caseId || null,
          officer_notes: closeNotes || null,
        },
      },
    })
  }

  useEffect(() => {
    if (user?.role !== 'law_enforcement' && user?.role !== 'admin') return

    const socket = io('http://localhost:3000')
    socket.emit('join_role', user.role)

    socket.on('lei_alert', (payload) => {
      setLeiAlerts((prev) => [payload, ...prev].slice(0, 5))
      queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient, user])

  if (user?.role !== 'law_enforcement' && user?.role !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-gray-600 mt-2">You do not have permission to view the Law Enforcement Interface.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-600" size={28} />
          <h1 className="text-3xl font-bold text-gray-900">Law Enforcement Interface</h1>
        </div>
        <p className="text-gray-600 mt-2">Operational response and case resolution</p>
      </div>

      {leiAlerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {leiAlerts.map((alert, index) => (
            <div
              key={`${alert.incidentId}-${index}`}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3"
            >
              <AlertTriangle size={20} />
              <div>
                <p className="font-semibold">Critical alert: {alert.title}</p>
                <p className="text-sm">Severity: {alert.severity?.toUpperCase()} · Status: {formatStatusLabel(alert.status)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline mr-2" size={18} /> Search Incidents
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title or description..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {LEI_STATUS_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
              onClick={() => setSelectedIncidentId(incident.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{incident.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                      {formatStatusLabel(incident.status)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{incident.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span>📍 {incident.location_name || `${incident.latitude}, ${incident.longitude}`}</span>
                    <span>👤 {incident.username}</span>
                    <span>📅 {new Date(incident.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className={`text-3xl font-bold ml-4 ${getSeverityColor(incident.severity)}`}>
                  {incident.severity.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          ))}
          {filteredIncidents.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No incidents found matching your criteria</p>
            </div>
          )}
        </div>
      )}

      {selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-700 to-blue-800 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Incident Detail</h2>
                <p className="text-sm text-blue-100">Operational view for responders</p>
              </div>
              <button
                onClick={() => setSelectedIncidentId(null)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{selectedIncident.title}</h3>
                <div className="flex flex-wrap gap-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedIncident.status)}`}>
                    {formatStatusLabel(selectedIncident.status)}
                  </span>
                  <span className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    {selectedIncident.category.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium bg-gray-50 ${getSeverityColor(selectedIncident.severity)}`}>
                    {selectedIncident.severity.toUpperCase()} SEVERITY
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedIncident.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Reporter Identity</p>
                  <p className="font-medium text-gray-900">{selectedIncident.username}</p>
                  <p className="text-sm text-gray-600">{selectedIncident.email}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Anonymous to public: {selectedIncident.is_anonymous ? 'Yes' : 'No'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium text-gray-900">{selectedIncident.location_name || 'Exact Coordinates'}</p>
                  <p className="text-sm text-gray-600">
                    {selectedIncident.latitude}, {selectedIncident.longitude}
                  </p>
                  <a
                    href={openMapsUrl(selectedIncident.latitude, selectedIncident.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-blue-600 text-sm hover:underline"
                  >
                    <MapPin size={14} /> Open in Maps
                  </a>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">Evidence Package</h4>
                {selectedIncident.photo_urls?.length ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedIncident.photo_urls.map((url, index) => (
                      <img
                        key={`${url}-${index}`}
                        src={url}
                        alt="Incident evidence"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No media attached.</p>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">Operational Map</h4>
                <div className="bg-gray-100 rounded-lg p-6 text-sm text-gray-600 flex items-center gap-3">
                  <MapPin className="text-blue-600" />
                  Tactical map view unavailable in this environment. Use the map link above for navigation.
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">Status Management</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(user?.role === 'law_enforcement' || user?.role === 'admin') && (
                    <button
                      onClick={() => handleStatusUpdate('dispatched')}
                      disabled={!canTransitionTo(selectedIncident.status, 'dispatched') || statusMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Dispatch Unit
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusUpdate('on_scene')}
                    disabled={!canTransitionTo(selectedIncident.status, 'on_scene') || statusMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    On Scene
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('investigating')}
                    disabled={!canTransitionTo(selectedIncident.status, 'investigating') || statusMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Investigating
                  </button>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Close Case</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={closeOutcome}
                      onChange={(event) => setCloseOutcome(event.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {CLOSURE_OUTCOMES.map((outcome) => (
                        <option key={outcome.value} value={outcome.value}>
                          {outcome.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={caseId}
                      onChange={(event) => setCaseId(event.target.value)}
                      placeholder="Case ID (required for Report Filed)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={handleCloseCase}
                      disabled={
                        !canTransitionTo(selectedIncident.status, 'police_closed') ||
                        statusMutation.isPending ||
                        (closeOutcome === 'report_filed' && !caseId)
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Close Case
                    </button>
                  </div>
                  <textarea
                    value={closeNotes}
                    onChange={(event) => setCloseNotes(event.target.value)}
                    placeholder="Officer notes"
                    className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                  {closeOutcome === 'report_filed' && !caseId && (
                    <p className="text-sm text-red-600 mt-2">Case ID is required for report filed.</p>
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">Chain of Custody</h4>
                {actionLog.length ? (
                  <ul className="space-y-3">
                    {actionLog.map((entry) => (
                      <li key={entry.action_id} className="flex items-start gap-3">
                        <BadgeCheck className="text-blue-600 mt-0.5" size={16} />
                        <div>
                          <p className="text-sm text-gray-800">
                            {entry.action_type.replace('_', ' ')}
                            {entry.moderator_name ? ` · ${entry.moderator_name}` : ''}
                          </p>
                          {entry.notes && <p className="text-xs text-gray-500">{entry.notes}</p>}
                          <p className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString()}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">No actions recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LawEnforcement
