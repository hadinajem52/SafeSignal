import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, MapPin, Radio, Shield } from 'lucide-react'
import { io } from 'socket.io-client'
import FilterDropdown from '../../components/FilterDropdown'
import GoogleMapPanel from '../../components/GoogleMapPanel'
import PageHeader from '../../components/PageHeader'
import SearchInput from '../../components/SearchInput'
import SeverityBadge from '../../components/SeverityBadge'
import StatusBadge from '../../components/StatusBadge'
import { LEI_STATUS_FILTERS } from '../../constants/incident'
import { useAuth } from '../../context/AuthContext'
import { leiAPI } from '../../services/api'
import { openMapsUrl, SEVERITY_VARIANTS } from '../../utils/incident'
import { SOCKET_URL } from '../../utils/network'

const WORKFLOW_STEPS = [
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'on_scene', label: 'On Scene' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'police_closed', label: 'Closed' },
]

const STATUS_TRANSITIONS = {
  verified: ['dispatched', 'investigating', 'police_closed'],
  dispatched: ['on_scene', 'investigating', 'police_closed'],
  on_scene: ['investigating', 'police_closed'],
  investigating: ['police_closed'],
  resolved: ['police_closed'],
  police_closed: [],
}

const ACTIVE_ALERT_STATUSES = new Set(['verified', 'dispatched', 'on_scene', 'investigating', 'resolved'])

function LawEnforcement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('verified')
  const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const [leiAlerts, setLeiAlerts] = useState([])
  const [lastRealtimeAlertAt, setLastRealtimeAlertAt] = useState(null)
  const [toasts, setToasts] = useState([])
  const toastTimeoutsRef = useRef([])

  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
      toastTimeoutsRef.current = []
    }
  }, [])

  const pushToast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3200)
    toastTimeoutsRef.current.push(timeoutId)
  }

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
  })

  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((incident) => {
        const title = incident.title || ''
        const description = incident.description || ''
        const q = searchTerm.toLowerCase()
        return title.toLowerCase().includes(q) || description.toLowerCase().includes(q)
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

  useEffect(() => {
    if (!selectedIncidentId && filteredIncidents.length) {
      setSelectedIncidentId(filteredIncidents[0].id)
    }
  }, [filteredIncidents, selectedIncidentId])

  const selectedIncident = incidentDetail?.incident || filteredIncidents.find((item) => item.id === selectedIncidentId)
  const actionLog = incidentDetail?.actions || []

  const displayAlerts = useMemo(() => {
    const derived = filteredIncidents
      .filter((incident) => ['critical', 'high'].includes(incident.severity))
      .filter((incident) => ACTIVE_ALERT_STATUSES.has(incident.status))
      .slice(0, 5)
      .map((incident) => ({
        incidentId: incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        latitude: incident.latitude,
        longitude: incident.longitude,
        source: 'derived',
      }))

    const all = [...leiAlerts, ...derived]
    const seen = new Set()
    return all.filter((alert) => {
      const key = String(alert.incidentId)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [filteredIncidents, leiAlerts])

  const hasFreshRealtimeAlert =
    typeof lastRealtimeAlertAt === 'number' && Date.now() - lastRealtimeAlertAt < 12000

  const toApiStatus = (uiStatus) => (uiStatus === 'resolved' ? 'investigating' : uiStatus)

  const canTransitionTo = (incident, uiStatus) => {
    if (!incident) return false
    const currentStatus = incident.status
    if (uiStatus === 'resolved') {
      return (STATUS_TRANSITIONS[currentStatus] || []).includes('investigating') || currentStatus === 'investigating'
    }
    return (STATUS_TRANSITIONS[currentStatus] || []).includes(toApiStatus(uiStatus))
  }

  const handleStatusUpdate = async (incident, status) => {
    if (!incident) return

    if (!canTransitionTo(incident, status) && incident.status !== toApiStatus(status)) {
      pushToast(`Invalid transition from ${incident.status} to ${status}.`, 'warning')
      return
    }

    const apiStatus = toApiStatus(status)

    const payload =
      apiStatus === 'police_closed'
        ? {
            status: apiStatus,
            closure_outcome: 'resolved_handled',
            closure_details: {
              case_id: null,
              officer_notes: 'Closed from LEI workflow',
            },
          }
        : { status: apiStatus }

    const result = await statusMutation.mutateAsync({
      id: incident.incident_id || incident.id,
      payload,
    })

    if (!result.success) {
      pushToast(result.error || `Failed to move incident to ${status}.`, 'error')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
    queryClient.invalidateQueries({ queryKey: ['lei-incident', incident.incident_id || incident.id] })
    pushToast(`Incident moved to ${status}.`)
  }

  useEffect(() => {
    if (user?.role !== 'law_enforcement' && user?.role !== 'admin') return

    const token = localStorage.getItem('moderator_token')
    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: { token },
    })

    socket.on('lei_alert', (payload) => {
      setLeiAlerts((prev) => [payload, ...prev].slice(0, 8))
      setLastRealtimeAlertAt(Date.now())
      queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
      pushToast(`New LE alert: ${payload?.title || 'Incident update received'}`, 'warning')
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient, user])

  if (user?.role !== 'law_enforcement' && user?.role !== 'admin') {
    return (
      <div className="bg-card border border-border rounded-lg shadow-soft p-8 text-center">
        <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-text">Access Restricted</h2>
        <p className="text-muted mt-2">You do not have permission to view the Law Enforcement Interface.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Law Enforcement Operations"
        description="Monitor active incidents, dispatch field response, and close cases with operational traceability."
      />

      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[280px] max-w-[420px] rounded-lg border px-4 py-3 shadow-soft ${
              toast.type === 'error'
                ? 'border-danger/40 bg-danger/10 text-danger'
                : toast.type === 'warning'
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-success/40 bg-success/10 text-success'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg shadow-soft p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className={`${hasFreshRealtimeAlert ? 'text-danger animate-pulse' : 'text-success'}`} size={18} />
          <p className="text-sm text-text font-semibold">Real-time feed {hasFreshRealtimeAlert ? 'active: new alert received' : 'connected'}</p>
        </div>
        <p className="text-sm text-muted tabular-nums">{displayAlerts.length} active alerts</p>
      </div>

      {displayAlerts.length ? (
        <div className="space-y-3">
          {displayAlerts.map((alert) => {
            const severityClass =
              alert.severity === 'critical'
                ? 'border-danger/40 bg-danger/10'
                : alert.severity === 'high'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-border bg-surface'

            return (
              <div
                key={`${alert.incidentId}-${alert.source || 'socket'}`}
                className={`rounded-lg border p-4 ${severityClass} cursor-pointer`}
                onClick={() => setSelectedIncidentId(alert.incidentId)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-text">{alert.title || `Incident #${alert.incidentId}`}</p>
                    <p className="text-sm text-muted mt-1">
                      Severity <span className="font-semibold uppercase">{alert.severity || 'unknown'}</span> · Status{' '}
                      <span className="font-semibold">{alert.status || 'N/A'}</span>
                    </p>
                  </div>
                  {Number.isFinite(Number(alert.latitude)) && Number.isFinite(Number(alert.longitude)) ? (
                    <div className="w-[320px]">
                      <a
                        href={openMapsUrl(alert.latitude, alert.longitude)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MapPin size={14} /> Open map
                      </a>
                      <div className="mt-2" onClick={(event) => event.stopPropagation()}>
                        <GoogleMapPanel
                          markers={[
                            {
                              id: `alert-${alert.incidentId}`,
                              lat: alert.latitude,
                              lng: alert.longitude,
                              title: alert.title || `Incident #${alert.incidentId}`,
                            },
                          ]}
                          center={{ lat: alert.latitude, lng: alert.longitude }}
                          zoom={14}
                          height={140}
                          autoFit={false}
                          emptyMessage="No coordinates available."
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="bg-card border border-border rounded-lg shadow-soft p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <SearchInput
              label="Search Incidents"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title or description..."
            />
          </div>
          <FilterDropdown
            label="Filter by Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={LEI_STATUS_FILTERS}
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-text">Incident</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-text">Status</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-text">Severity</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-text">Reporter</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-text">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={5}>Loading incidents...</td>
              </tr>
            ) : filteredIncidents.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={5}>No incidents found.</td>
              </tr>
            ) : (
              filteredIncidents.map((incident) => (
                <tr
                  key={incident.id}
                  className={`hover:bg-surface cursor-pointer ${selectedIncidentId === incident.id ? 'bg-surface' : ''}`}
                  onClick={() => setSelectedIncidentId(incident.id)}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-text">{incident.title}</p>
                    <p className="text-xs text-muted truncate max-w-[320px]">{incident.description}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={incident.status} /></td>
                  <td className="px-4 py-3">
                    <SeverityBadge
                      severity={incident.severity}
                      variant={SEVERITY_VARIANTS.LAW_ENFORCEMENT}
                      display="initial"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{incident.username || 'Unknown'}</td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleStatusUpdate(incident, 'dispatched')}
                        disabled={statusMutation.isPending || !canTransitionTo(incident, 'dispatched')}
                        className="px-2.5 py-1.5 rounded bg-primary text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Dispatch
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(incident, 'on_scene')}
                        disabled={statusMutation.isPending || !canTransitionTo(incident, 'on_scene')}
                        className="px-2.5 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        On Scene
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(incident, 'resolved')}
                        disabled={statusMutation.isPending || !canTransitionTo(incident, 'resolved')}
                        className="px-2.5 py-1.5 rounded bg-success text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedIncident ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg shadow-soft p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-text">Selected Incident</h3>
              <StatusBadge status={selectedIncident.status} size="sm" />
            </div>

            <p className="text-sm text-muted">{selectedIncident.title}</p>
            <p className="text-sm text-muted">{selectedIncident.description}</p>

            <GoogleMapPanel
              markers={[
                {
                  id: `lei-map-${selectedIncident.id || selectedIncident.incident_id}`,
                  lat: selectedIncident.latitude,
                  lng: selectedIncident.longitude,
                  title: selectedIncident.title || `Incident #${selectedIncident.id || selectedIncident.incident_id}`,
                },
              ]}
              center={{ lat: selectedIncident.latitude, lng: selectedIncident.longitude }}
              zoom={15}
              height={260}
              autoFit={false}
              emptyMessage="No coordinates available for this incident."
            />

            <div className="pt-4 border-t border-border">
              <p className="text-sm font-semibold text-text mb-3">Status Workflow</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {WORKFLOW_STEPS.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => handleStatusUpdate(selectedIncident, step.id)}
                    disabled={statusMutation.isPending || !canTransitionTo(selectedIncident, step.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                      selectedIncident.status === toApiStatus(step.id)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface text-text border-border hover:bg-bg'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-soft p-6">
            <h3 className="text-xl font-bold text-text mb-4">Recent LE Actions</h3>
            {actionLog.length ? (
              <ul className="space-y-3">
                {actionLog.map((entry) => (
                  <li key={entry.action_id} className="border border-border rounded-lg p-3 bg-surface">
                    <p className="text-sm text-text font-semibold">{entry.action_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted mt-1">{entry.moderator_name || 'System'} · {new Date(entry.timestamp).toLocaleString()}</p>
                    {entry.notes ? <p className="text-xs text-muted mt-1">{entry.notes}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No actions recorded for this incident.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="text-xs text-muted">
        Live status transitions supported: dispatched, on_scene, resolved, police_closed.
      </div>
    </div>
  )
}

export default LawEnforcement
