import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Map as MapIcon, Radio, Shield, Zap } from 'lucide-react'
import { io } from 'socket.io-client'
import ConfirmDialog from '../../components/ConfirmDialog'
import FilterDropdown from '../../components/FilterDropdown'
import GoogleMapPanel from '../../components/GoogleMapPanel'
import PageHeader from '../../components/PageHeader'
import SearchInput from '../../components/SearchInput'
import SeverityBadge from '../../components/SeverityBadge'
import StatusBadge from '../../components/StatusBadge' // used in IncidentDetailPane only
import { LEI_STATUS_FILTERS } from '../../constants/incident'
import { useAuth } from '../../context/AuthContext'
import { leiAPI } from '../../services/api'
import { getTimeAgo } from '../../utils/dateUtils'
import { formatStatusLabel, openMapsUrl, SEVERITY_VARIANTS } from '../../utils/incident'
import { SOCKET_URL } from '../../utils/network'

// ─── Workflow config ───────────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  { id: 'verified', label: 'Verified' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'on_scene', label: 'On Scene' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'police_closed', label: 'Closed' },
]

// Strict linear chain — each status has exactly one valid next step
const STATUS_TRANSITIONS = {
  verified: ['dispatched'],
  dispatched: ['on_scene'],
  on_scene: ['investigating'],
  investigating: ['police_closed'],
  police_closed: [],
}

const STATUS_ACTION_CONFIG = {
  dispatched: {
    label: 'Dispatch',
    buttonClass: 'bg-primary text-white',
    confirmTitle: 'Dispatch unit?',
    confirmMessage: 'This marks the incident as dispatched and notifies responders.',
    confirmClassName: 'bg-primary hover:bg-primary/90',
  },
  on_scene: {
    label: 'Mark On Scene',
    buttonClass: 'bg-indigo-600 text-white',
    confirmTitle: 'Mark unit on scene?',
    confirmMessage: 'Use this only when a responding unit has arrived at the location.',
    confirmClassName: 'bg-indigo-600 hover:bg-indigo-700',
  },
  investigating: {
    label: 'Mark Investigating',
    buttonClass: 'bg-violet-600 text-white',
    confirmTitle: 'Move to investigating?',
    confirmMessage: 'This marks active scene handling as complete and starts investigation.',
    confirmClassName: 'bg-violet-600 hover:bg-violet-700',
  },
  police_closed: {
    label: 'Close Case',
    buttonClass: 'bg-emerald-600 text-white',
    confirmTitle: 'Close this case?',
    confirmMessage: 'Closing is recorded in the audit log and ends the active LE workflow.',
    confirmClassName: 'bg-emerald-600 hover:bg-emerald-700',
  },
}

const STATUS_ROW_CLASS = {
  verified: 'bg-amber-500/10',
  dispatched: 'bg-blue-500/10',
  on_scene: 'bg-indigo-500/10',
  investigating: 'bg-violet-500/10',
  police_closed: 'bg-emerald-500/10',
}

const UNACTIONED_AGE_THRESHOLD_MINUTES = 30

// ─── Sub-nav tabs ─────────────────────────────────────────────────────────────

const VIEWS = [
  { id: 'queue', label: 'Incident Queue', icon: Shield },
  { id: 'map', label: 'Operations Map', icon: MapIcon },
  { id: 'closed', label: 'Closed Cases', icon: AlertTriangle },
]

// ─── Small pure helpers ────────────────────────────────────────────────────────

function getIncidentAgeMinutes(incident) {
  const reportedAt = incident?.reportedAt || incident?.incident_date || incident?.created_at
  if (!reportedAt) return 0
  const diffMs = Date.now() - new Date(reportedAt).getTime()
  return Number.isFinite(diffMs) && diffMs > 0 ? Math.floor(diffMs / 60000) : 0
}

function isUnactionedAged(incident) {
  return incident?.status === 'verified' && getIncidentAgeMinutes(incident) >= UNACTIONED_AGE_THRESHOLD_MINUTES
}

function getNextWorkflowStatus(currentStatus) {
  return STATUS_TRANSITIONS[currentStatus]?.[0] || null
}

function canTransitionTo(incident, status) {
  if (!incident) return false
  return (STATUS_TRANSITIONS[incident.status] || []).includes(status)
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/**
 * Collapsible alert banner — shown at the top of the Queue view.
 * Replaces the old always-expanded alert card list.
 */
function AlertBanner({ alerts, onDispatch, statusMutationPending, onSelectIncident }) {
  const [expanded, setExpanded] = useState(true)

  if (!alerts.length) return null

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length

  return (
    <div className="bg-card border border-danger/30 rounded-lg shadow-soft overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-danger" />
          <span className="text-sm font-semibold text-danger">
            {alerts.length} Unactioned Alert{alerts.length !== 1 ? 's' : ''}
            {criticalCount > 0 && (
              <span className="ml-2 rounded-full bg-danger/20 px-2 py-0.5 text-[11px]">
                {criticalCount} critical
              </span>
            )}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {expanded && (
        <div className="divide-y divide-border border-t border-danger/20">
          {alerts.map((alert) => (
            <div
              key={alert.incidentId}
                className={`flex items-center justify-between gap-4 px-4 py-3 cursor-pointer bg-card hover:bg-surface`}
                onClick={() => onSelectIncident(alert.incidentId)}
              >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text truncate">
                  {alert.title || `Incident #${alert.incidentId}`}
                </p>
                <p className="text-xs text-muted mt-0.5 uppercase tracking-wide">
                  {alert.severity} · {alert.status}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {Number.isFinite(Number(alert.latitude)) && Number.isFinite(Number(alert.longitude)) && (
                  <a
                    href={openMapsUrl(alert.latitude, alert.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Open map
                  </a>
                )}
                <button
                  onClick={() => onDispatch(alert)}
                  disabled={statusMutationPending || alert.status !== 'verified'}
                  className="px-3 py-1.5 rounded bg-primary text-white text-xs font-semibold disabled:opacity-50"
                >
                  Dispatch Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Left panel of the split-pane: the incident table.
 */
function IncidentQueueTable({
  isLoading,
  incidents,
  selectedIncidentId,
  onSelectIncident,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortMode,
  onSortModeChange,
  statusMutationPending,
  onRequestAction,
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Filters */}
      <div className="p-3 border-b border-border flex-shrink-0 space-y-2">
        <SearchInput
          label="Search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Title or description..."
        />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          options={LEI_STATUS_FILTERS}
        />
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <button
            onClick={() => onSortModeChange('urgency')}
            title="Sort by urgency"
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              sortMode === 'urgency'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-text hover:bg-surface'
            }`}
          >
            <Zap size={13} />
            Urgency
          </button>
          <span className="inline-block h-5 w-px bg-border align-middle" />
          <button
            onClick={() => onSortModeChange('time')}
            title="Sort by newest reports"
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              sortMode === 'time'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-text hover:bg-surface'
            }`}
          >
            <Clock size={13} />
            Newest
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full">
          <thead className="bg-surface border-b border-border sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-text">Incident</th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-text">Severity</th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-text">Age</th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-text">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td className="px-3 py-5 text-sm text-muted" colSpan={4}>Loading…</td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-sm text-muted" colSpan={4}>No incidents found.</td>
              </tr>
            ) : (
              incidents.map((incident) => {
                const aged = isUnactionedAged(incident)
                const rowBg = aged ? 'bg-danger/10' : (STATUS_ROW_CLASS[incident.status] || '')
                const isSelected = selectedIncidentId === incident.id
                const nextStatus = getNextWorkflowStatus(incident.status)
                const nextAction = nextStatus ? STATUS_ACTION_CONFIG[nextStatus] : null

                return (
                  <tr
                    key={incident.id}
                    className={`cursor-pointer transition-colors ${rowBg} ${isSelected ? 'ring-1 ring-inset ring-primary/60 brightness-110' : 'hover:brightness-95 hover:bg-black/5'}`}
                    onClick={() => onSelectIncident(incident.id)}
                  >
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-text leading-snug">{incident.title}</p>
                      <p className="text-xs text-muted mt-0.5 truncate max-w-[160px]">{incident.description}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <SeverityBadge
                        severity={incident.severity}
                        variant={SEVERITY_VARIANTS.LAW_ENFORCEMENT}
                        display="initial"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-text tabular-nums">{getTimeAgo(incident.reportedAt)}</span>
                      {aged && (
                        <span className="block mt-0.5 rounded-full bg-danger/20 px-1.5 py-0.5 text-[10px] font-semibold text-danger w-fit">
                          &gt;{UNACTIONED_AGE_THRESHOLD_MINUTES}m
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {nextAction ? (
                        <button
                          onClick={() => onRequestAction(incident, nextStatus)}
                          disabled={statusMutationPending || !canTransitionTo(incident, nextStatus)}
                          className={`px-2 py-1 rounded text-xs font-semibold disabled:opacity-50 ${nextAction.buttonClass}`}
                        >
                          {nextAction.label}
                        </button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Right panel of the split-pane: the selected incident detail.
 */
function IncidentDetailPane({ incident, actionLog, statusMutationPending, onRequestAction }) {
  if (!incident) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted p-8 text-center">
        Select an incident from the queue to view its details.
      </div>
    )
  }

  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.id === incident.status)
  const nextStatus = getNextWorkflowStatus(incident.status)
  const nextAction = nextStatus ? STATUS_ACTION_CONFIG[nextStatus] : null

  return (
    <div className="overflow-y-auto h-full p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-text leading-snug">{incident.title}</h3>
          <p className="text-sm text-muted mt-1">{incident.description}</p>
        </div>
        <StatusBadge status={incident.status} size="sm" />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
        <span>Reporter: <strong className="text-text">{incident.username || 'Unknown'}</strong></span>
        <span>Reported: <strong className="text-text">{getTimeAgo(incident.reportedAt)}</strong></span>
        {incident.location_name && (
          <span>Location: <strong className="text-text">{incident.location_name}</strong></span>
        )}
        {Number.isFinite(Number(incident.latitude)) && (
          <a
            href={openMapsUrl(incident.latitude, incident.longitude)}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Open in Maps
          </a>
        )}
      </div>

      {/* Workflow stepper */}
      <div>
        <p className="text-xs font-semibold text-text mb-2">Status Workflow</p>
        <div className="grid grid-cols-5 gap-1">
          {WORKFLOW_STEPS.map((step, index) => {
            const isDone = currentStepIndex > index
            const isCurrent = currentStepIndex === index
            return (
              <div
                key={step.id}
                className={`rounded px-1.5 py-1.5 text-[11px] font-semibold text-center border ${isCurrent
                  ? 'bg-primary text-white border-primary'
                  : isDone
                    ? 'bg-success/10 text-success border-success/30'
                    : 'bg-surface text-muted border-border'
                  }`}
              >
                {step.label}
              </div>
            )
          })}
        </div>
        <div className="mt-2">
          {nextAction ? (
            <button
              onClick={() => onRequestAction(incident, nextStatus)}
              disabled={statusMutationPending || !canTransitionTo(incident, nextStatus)}
              className={`px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-50 ${nextAction.buttonClass}`}
            >
              {nextAction.label}
            </button>
          ) : (
            <p className="text-xs text-muted">Workflow complete.</p>
          )}
        </div>
      </div>

      {/* Map */}
      <GoogleMapPanel
        markers={[{
          id: `lei-detail-${incident.id || incident.incident_id}`,
          lat: incident.latitude,
          lng: incident.longitude,
          title: incident.title,
        }]}
        center={{ lat: incident.latitude, lng: incident.longitude }}
        zoom={15}
        height={220}
        autoFit={false}
        emptyMessage="No coordinates available."
      />

      {/* Evidence photos */}
      {incident.photo_urls?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text mb-2">Evidence</p>
          <div className="grid grid-cols-3 gap-2">
            {incident.photo_urls.map((url, i) => (
              <img
                key={`${url}-${i}`}
                src={url}
                alt="Evidence"
                className="w-full h-24 object-cover rounded border border-border"
              />
            ))}
          </div>
        </div>
      )}

      {/* Action log */}
      <div>
        <p className="text-xs font-semibold text-text mb-2">Chain of Custody</p>
        {actionLog.length ? (
          <ul className="space-y-2">
            {actionLog.map((entry) => (
              <li key={entry.action_id} className="border border-border rounded p-2.5 bg-surface">
                <p className="text-xs font-semibold text-text">{entry.action_type.replace(/_/g, ' ')}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {entry.moderator_name || 'System'} · {new Date(entry.timestamp).toLocaleString()}
                </p>
                {entry.notes && <p className="text-[11px] text-muted mt-0.5">{entry.notes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">No actions recorded.</p>
        )}
      </div>
    </div>
  )
}

/**
 * Operations Map view — all active incidents as markers.
 */
function OpsMapView({ incidents, onSelectIncident }) {
  const markers = incidents
    .filter((inc) => Number.isFinite(Number(inc.latitude)) && Number.isFinite(Number(inc.longitude)))
    .map((inc) => ({
      id: `ops-${inc.incident_id || inc.id}`,
      lat: inc.latitude,
      lng: inc.longitude,
      title: inc.title || `Incident #${inc.incident_id}`,
    }))

  return (
    <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-text">
          All Active Incidents — {markers.length} with coordinates
        </p>
        <p className="text-xs text-muted mt-0.5">Click a marker to select an incident in the Queue.</p>
      </div>
      <GoogleMapPanel
        markers={markers}
        height={580}
        autoFit
        showClusters={markers.length > 10}
        emptyMessage="No active incidents with coordinates."
      />
    </div>
  )
}

/**
 * Closed Cases view — read-only table of police_closed incidents.
 */
function ClosedCasesView() {
  const { data: closedIncidents = [], isLoading } = useQuery({
    queryKey: ['lei-incidents', 'police_closed'],
    queryFn: async () => {
      const result = await leiAPI.getAll({ status: 'police_closed' })
      return result.success ? result.data : []
    },
  })

  return (
    <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-text">Closed Cases ({closedIncidents.length})</p>
      </div>
      <table className="w-full">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-text">Incident</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-text">Severity</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-text">Reporter</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-text">Closed At</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-text">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading ? (
            <tr>
              <td className="px-4 py-5 text-sm text-muted" colSpan={5}>Loading…</td>
            </tr>
          ) : closedIncidents.length === 0 ? (
            <tr>
              <td className="px-4 py-5 text-sm text-muted" colSpan={5}>No closed cases.</td>
            </tr>
          ) : (
            closedIncidents.map((inc) => (
              <tr key={inc.incident_id} className="hover:bg-surface">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-text">{inc.title}</p>
                  <p className="text-xs text-muted truncate max-w-[280px]">{inc.description}</p>
                </td>
                <td className="px-4 py-3">
                  <SeverityBadge
                    severity={inc.severity}
                    variant={SEVERITY_VARIANTS.LAW_ENFORCEMENT}
                    display="initial"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-muted">{inc.username || 'Unknown'}</td>
                <td className="px-4 py-3 text-sm text-muted tabular-nums">
                  {inc.updated_at ? new Date(inc.updated_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-muted capitalize">
                  {inc.closure_outcome?.replace(/_/g, ' ') || '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Root component ────────────────────────────────────────────────────────────

function LawEnforcement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [activeView, setActiveView] = useState('queue')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('verified')
  const [sortMode, setSortMode] = useState('urgency')
  const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const [leiAlerts, setLeiAlerts] = useState([])
  const [lastRealtimeAlertAt, setLastRealtimeAlertAt] = useState(null)
  const [toasts, setToasts] = useState([])
  const [pendingTransition, setPendingTransition] = useState(null)
  const notificationPermissionRequestedRef = useRef(false)
  const toastTimeoutsRef = useRef([])

  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach(clearTimeout)
      toastTimeoutsRef.current = []
    }
  }, [])

  const pushToast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
    const duration = type === 'error' ? 5000 : 3200
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
    toastTimeoutsRef.current.push(timeoutId)
  }

  // Primary filtered list (respects status filter + search)
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['lei-incidents', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const result = await leiAPI.getAll(params)
      return result.success ? result.data : []
    },
  })

  // Unfiltered snapshot — used for alerts and the ops map
  const { data: allLeiIncidents = [] } = useQuery({
    queryKey: ['lei-incidents-snapshot'],
    queryFn: async () => {
      const result = await leiAPI.getAll({})
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
    const q = searchTerm.toLowerCase()
    return incidents
      .filter((inc) => {
        const title = inc.title || ''
        const desc = inc.description || ''
        return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        if (sortMode === 'time') {
          return new Date(b.incident_date || b.created_at) - new Date(a.incident_date || a.created_at)
        }

        const rank = { critical: 1, high: 2, medium: 3, low: 4 }
        const diff = (rank[a.severity] || 5) - (rank[b.severity] || 5)
        if (diff !== 0) return diff
        return new Date(b.incident_date || b.created_at) - new Date(a.incident_date || a.created_at)
      })
      .map((inc) => ({
        ...inc,
        id: inc.incident_id,
        reportedAt: inc.incident_date || inc.created_at,
      }))
  }, [incidents, searchTerm, sortMode])

  // Auto-select first incident when list loads
  useEffect(() => {
    if (!selectedIncidentId && filteredIncidents.length) {
      setSelectedIncidentId(filteredIncidents[0].id)
    }
  }, [filteredIncidents, selectedIncidentId])

  const selectedIncident =
    incidentDetail?.incident || filteredIncidents.find((inc) => inc.id === selectedIncidentId)
  const actionLog = incidentDetail?.actions || []

  // Alerts: socket alerts + derived unactioned high/critical from snapshot
  const displayAlerts = useMemo(() => {
    const derived = allLeiIncidents
      .filter((inc) => ['critical', 'high'].includes(inc.severity) && inc.status === 'verified')
      .map((inc) => ({
        incidentId: inc.incident_id,
        title: inc.title,
        severity: inc.severity,
        status: inc.status,
        latitude: inc.latitude,
        longitude: inc.longitude,
        source: 'derived',
      }))

    const combined = [...leiAlerts, ...derived]
    const seen = new Set()
    return combined
      .filter((alert) => {
        const key = String(alert.incidentId)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 8)
  }, [allLeiIncidents, leiAlerts])

  // Prune resolved alerts when snapshot updates
  useEffect(() => {
    const statusById = new Map(allLeiIncidents.map((inc) => [String(inc.incident_id), inc.status]))
    setLeiAlerts((prev) =>
      prev.filter((alert) => {
        const status = statusById.get(String(alert.incidentId))
        return !status || status === 'verified'
      })
    )
  }, [allLeiIncidents])

  const hasFreshRealtimeAlert =
    typeof lastRealtimeAlertAt === 'number' && Date.now() - lastRealtimeAlertAt < 12000

  // ── Status update flow ──────────────────────────────────────────────────────

  const runStatusUpdate = async (incident, status) => {
    if (!incident || !canTransitionTo(incident, status)) {
      pushToast(`Invalid transition from ${incident?.status} to ${status}.`, 'warning')
      return
    }

    const payload =
      status === 'police_closed'
        ? { status, closure_outcome: 'resolved_handled', closure_details: { case_id: null, officer_notes: 'Closed from LEI workflow' } }
        : { status }

    const result = await statusMutation.mutateAsync({ id: incident.incident_id || incident.id, payload })

    if (!result.success) {
      pushToast(result.error || `Failed to move incident to ${status}.`, 'error')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
    queryClient.invalidateQueries({ queryKey: ['lei-incidents-snapshot'] })
    queryClient.invalidateQueries({ queryKey: ['lei-incident', incident.incident_id || incident.id] })

    // Remove from alerts if it's been actioned
    if (status !== 'verified') {
      const incId = incident.incident_id || incident.id
      setLeiAlerts((prev) => prev.filter((a) => String(a.incidentId) !== String(incId)))
    }

    pushToast(`Incident moved to ${formatStatusLabel(status)}.`)
  }

  const requestStatusUpdate = (incident, status) => {
    if (!incident || !status) return
    if (!canTransitionTo(incident, status)) {
      pushToast(`Invalid transition from ${incident.status} to ${status}.`, 'warning')
      return
    }
    setPendingTransition({ incident, status })
  }

  const confirmPendingTransition = async () => {
    if (!pendingTransition || statusMutation.isPending) return
    await runStatusUpdate(pendingTransition.incident, pendingTransition.status)
    setPendingTransition(null)
  }

  // ── Alert dispatch shortcut ─────────────────────────────────────────────────

  const handleAlertDispatch = (alert) => {
    const incidentId = alert.incidentId
    const match = filteredIncidents.find((inc) => String(inc.id) === String(incidentId))
    const incident = match || { id: incidentId, incident_id: incidentId, status: alert.status }
    requestStatusUpdate(incident, 'dispatched')
  }

  // ── Browser notifications ───────────────────────────────────────────────────

  const notifyCriticalAlert = async (payload) => {
    if (typeof Notification === 'undefined' || payload?.severity !== 'critical') return
    const show = () => {
      const n = new Notification('Critical LE Alert', { body: payload?.title || 'Immediate dispatch required.' })
      n.onclick = () => window.focus()
    }
    if (Notification.permission === 'granted') { show(); return }
    if (Notification.permission === 'default' && !notificationPermissionRequestedRef.current) {
      notificationPermissionRequestedRef.current = true
      const perm = await Notification.requestPermission()
      if (perm === 'granted') show()
    }
  }

  // ── Socket ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user?.role !== 'law_enforcement' && user?.role !== 'admin') return
    const token = localStorage.getItem('moderator_token')
    if (!token) return

    const socket = io(SOCKET_URL, { auth: { token } })

    socket.on('lei_alert', (payload) => {
      if (payload?.status === 'verified') {
        setLeiAlerts((prev) => [payload, ...prev].slice(0, 8))
      }
      setLastRealtimeAlertAt(Date.now())
      queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
      queryClient.invalidateQueries({ queryKey: ['lei-incidents-snapshot'] })
      pushToast(`New LE alert: ${payload?.title || 'Incident update received'}`, 'warning')
      notifyCriticalAlert(payload)
    })

    socket.on('incident:update', (payload) => {
      const incidentId = payload?.incidentId
      const nextStatus = payload?.status
      if (!incidentId || nextStatus === 'verified') return
      setLeiAlerts((prev) => prev.filter((a) => String(a.incidentId) !== String(incidentId)))
      queryClient.invalidateQueries({ queryKey: ['lei-incidents-snapshot'] })
    })

    return () => socket.disconnect()
  }, [queryClient, user])

  // ── Access guard ────────────────────────────────────────────────────────────

  if (user?.role !== 'law_enforcement' && user?.role !== 'admin') {
    return (
      <div className="bg-card border border-border rounded-lg shadow-soft p-8 text-center">
        <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-text">Access Restricted</h2>
        <p className="text-muted mt-2">You do not have permission to view the Law Enforcement Interface.</p>
      </div>
    )
  }

  const pendingActionConfig = pendingTransition?.status ? STATUS_ACTION_CONFIG[pendingTransition.status] : null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Shield}
        title="Law Enforcement Operations"
      />

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[280px] max-w-[420px] rounded-lg border px-4 py-3 shadow-soft ${toast.type === 'error'
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

      {/* Sub-navigation */}
      <div className="flex items-stretch gap-2">
        <div className="flex-1 flex gap-1 bg-surface border border-border rounded-lg p-1">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 flex-1 justify-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeView === view.id
                ? 'bg-card shadow-soft text-text border border-border'
                : 'text-muted hover:text-text hover:bg-card/60'
                }`}
            >
              <view.icon size={15} />
              {view.label}
            </button>
          ))}
        </div>
        <div className="relative group flex-shrink-0 self-stretch">
          <div className="flex h-full w-9 items-center justify-center rounded-lg border border-border bg-card">
            <Radio className={hasFreshRealtimeAlert ? 'text-danger animate-pulse' : 'text-success'} size={14} />
          </div>
          <div className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 hidden w-max rounded-md border border-border bg-card px-2.5 py-1.5 text-xs shadow-soft group-hover:block">
            <span className="font-semibold text-text">
              {hasFreshRealtimeAlert ? 'New alert received' : 'Live feed connected'}
            </span>
            <span className="ml-2 text-muted tabular-nums">{displayAlerts.length} unactioned</span>
          </div>
        </div>
      </div>

      {/* ── Incident Queue view ── */}
      {activeView === 'queue' && (
        <div className="space-y-3">
          {/* Collapsible alert banner */}
          <AlertBanner
            alerts={displayAlerts}
            onDispatch={handleAlertDispatch}
            statusMutationPending={statusMutation.isPending}
            onSelectIncident={setSelectedIncidentId}
          />

          {/* Split-pane: table left, detail right */}
          <div
            className="bg-card border border-border rounded-lg shadow-soft overflow-hidden"
            style={{ height: '68vh', minHeight: '480px' }}
          >
            <div className="grid h-full" style={{ gridTemplateColumns: '2fr 3fr' }}>
              {/* Left: scrollable table */}
              <div className="border-r border-border h-full overflow-hidden flex flex-col">
                <IncidentQueueTable
                  isLoading={isLoading}
                  incidents={filteredIncidents}
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={setSelectedIncidentId}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  sortMode={sortMode}
                  onSortModeChange={setSortMode}
                  statusMutationPending={statusMutation.isPending}
                  onRequestAction={requestStatusUpdate}
                />
              </div>

              {/* Right: sticky detail */}
              <div className="h-full overflow-hidden">
                <IncidentDetailPane
                  incident={selectedIncident}
                  actionLog={actionLog}
                  statusMutationPending={statusMutation.isPending}
                  onRequestAction={requestStatusUpdate}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Operations Map view ── */}
      {activeView === 'map' && (
        <OpsMapView
          incidents={allLeiIncidents}
          onSelectIncident={(id) => {
            setSelectedIncidentId(id)
            setActiveView('queue')
          }}
        />
      )}

      {/* ── Closed Cases view ── */}
      {activeView === 'closed' && <ClosedCasesView />}

      {/* Confirm dialog */}
      <ConfirmDialog
        visible={Boolean(pendingTransition)}
        title={pendingActionConfig?.confirmTitle || 'Confirm status update?'}
        message={pendingActionConfig?.confirmMessage || 'This will update the incident workflow state.'}
        confirmLabel={pendingActionConfig?.label || 'Confirm'}
        confirmClassName={pendingActionConfig?.confirmClassName || 'bg-primary hover:bg-primary/90'}
        confirmDisabled={statusMutation.isPending}
        onCancel={() => setPendingTransition(null)}
        onConfirm={confirmPendingTransition}
      />
    </div>
  )
}

export default LawEnforcement
