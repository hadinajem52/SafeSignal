import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, MapPin, Radio, Shield } from 'lucide-react'
import { io } from 'socket.io-client'
import FilterDropdown from '../../components/FilterDropdown'
import GoogleMapPanel from '../../components/GoogleMapPanel'
import PageHeader from '../../components/PageHeader'
import SearchInput from '../../components/SearchInput'
import SeverityBadge from '../../components/SeverityBadge'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { CLOSURE_OUTCOMES, LEI_STATUS_FILTERS } from '../../constants/incident'
import { useAuth } from '../../context/AuthContext'
import { leiAPI } from '../../services/api'
import { getTimeAgo } from '../../utils/dateUtils'
import { formatStatusLabel, openMapsUrl, SEVERITY_VARIANTS } from '../../utils/incident'
import { SOCKET_URL } from '../../utils/network'

const WORKFLOW_STEPS = [
  { id: 'verified', label: 'Verified' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'on_scene', label: 'On Scene' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'police_closed', label: 'Closed' },
]

const STATUS_TRANSITIONS = {
  verified: ['dispatched'],
  dispatched: ['on_scene'],
  on_scene: ['investigating'],
  investigating: ['police_closed'],
  police_closed: [],
}

const UNACTIONED_AGE_THRESHOLD_MINUTES = 30
const TOAST_DURATION_MS = {
  success: 3000,
  warning: 4000,
  error: 5000,
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
  verified: 'bg-amber-50/50',
  dispatched: 'bg-blue-50/40',
  on_scene: 'bg-indigo-50/40',
  investigating: 'bg-violet-50/40',
  police_closed: 'bg-emerald-50/40',
}

function LawEnforcement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('verified')
  const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const [leiAlerts, setLeiAlerts] = useState([])
  const [lastRealtimeAlertAt, setLastRealtimeAlertAt] = useState(null)
  const [nowTs, setNowTs] = useState(Date.now())
  const [freshNowTs, setFreshNowTs] = useState(Date.now())
  const [toasts, setToasts] = useState([])
  const [pendingTransition, setPendingTransition] = useState(null)
  const [closeOutcome, setCloseOutcome] = useState('resolved_handled')
  const [closeCaseId, setCloseCaseId] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const notificationPermissionRequestedRef = useRef(false)
  const notificationFallbackShownRef = useRef(false)
  const manualDeselectRef = useRef(false)
  const toastTimeoutsRef = useRef([])

  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
      toastTimeoutsRef.current = []
    }
  }, [])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowTs(Date.now())
    }, 60000)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setFreshNowTs(Date.now())
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  const pushToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
    const duration = TOAST_DURATION_MS[type] || TOAST_DURATION_MS.success
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
      toastTimeoutsRef.current = toastTimeoutsRef.current.filter((savedId) => savedId !== timeoutId)
    }, duration)
    toastTimeoutsRef.current.push(timeoutId)
  }, [])

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['lei-incidents', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const result = await leiAPI.getAll(params)
      return result.success ? result.data : []
    },
  })

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
    const getReportedAt = (incident) => incident.incident_date || incident.created_at

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
        return new Date(getReportedAt(b)) - new Date(getReportedAt(a))
      })
      .map((incident) => ({
        ...incident,
        id: incident.incident_id,
        reportedAt: getReportedAt(incident),
      }))
  }, [incidents, searchTerm])

  const getIncidentAgeMinutes = (incident) => {
    const reportedAt = incident?.reportedAt
    if (!reportedAt) return 0

    const diffMs = nowTs - new Date(reportedAt).getTime()
    if (!Number.isFinite(diffMs) || diffMs <= 0) return 0

    return Math.floor(diffMs / 60000)
  }

  const isUnactionedAged = (incident) =>
    incident?.status === 'verified' && getIncidentAgeMinutes(incident) >= UNACTIONED_AGE_THRESHOLD_MINUTES

  const selectIncident = useCallback((incidentId) => {
    manualDeselectRef.current = false
    setSelectedIncidentId(incidentId)
  }, [])

  useEffect(() => {
    if (manualDeselectRef.current) return
    if (!selectedIncidentId && filteredIncidents.length) {
      setSelectedIncidentId(filteredIncidents[0].id)
    }
  }, [filteredIncidents, selectedIncidentId])

  const selectedIncident = incidentDetail?.incident || filteredIncidents.find((item) => item.id === selectedIncidentId)
  const actionLog = incidentDetail?.actions || []

  const displayAlerts = useMemo(() => {
    const derived = allLeiIncidents
      .filter((incident) => ['critical', 'high'].includes(incident.severity))
      .filter((incident) => incident.status === 'verified')
      .map((incident) => ({
        incidentId: incident.incident_id,
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
    }).slice(0, 8)
  }, [allLeiIncidents, leiAlerts])

  const hasFreshRealtimeAlert =
    typeof lastRealtimeAlertAt === 'number' && freshNowTs - lastRealtimeAlertAt < 12000

  const getNextWorkflowStatus = (currentStatus) => {
    const next = STATUS_TRANSITIONS[currentStatus]?.[0]
    return next || null
  }

  const canTransitionTo = useCallback((incident, status) => {
    if (!incident) return false
    const currentStatus = incident.status
    return (STATUS_TRANSITIONS[currentStatus] || []).includes(status)
  }, [])

  const runStatusUpdate = async (incident, status, closePayload = null) => {
    if (!incident) return

    if (!canTransitionTo(incident, status)) {
      pushToast(`Invalid transition from ${incident.status} to ${status}.`, 'warning')
      return
    }

    const payload =
      status === 'police_closed'
        ? {
          status,
          closure_outcome: closePayload?.closure_outcome || 'resolved_handled',
          closure_details: {
            case_id: closePayload?.closure_details?.case_id || null,
            officer_notes: closePayload?.closure_details?.officer_notes || null,
          },
        }
        : { status }

    const result = await statusMutation.mutateAsync({
      id: incident.incident_id || incident.id,
      payload,
    })

    if (!result.success) {
      pushToast(result.error || `Failed to move incident to ${status}.`, 'error')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
    queryClient.invalidateQueries({ queryKey: ['lei-incidents-snapshot'] })
    queryClient.invalidateQueries({ queryKey: ['lei-incident', incident.incident_id || incident.id] })
    if (status !== 'verified') {
      const incidentId = incident.incident_id || incident.id
      setLeiAlerts((prev) => prev.filter((alert) => String(alert.incidentId) !== String(incidentId)))
    }
    pushToast(`Incident moved to ${formatStatusLabel(status)}.`)
  }

  const requestStatusUpdate = useCallback((incident, status, closePayload = null) => {
    if (!incident || !status) return

    if (!canTransitionTo(incident, status)) {
      pushToast(`Invalid transition from ${incident.status} to ${status}.`, 'warning')
      return
    }

    setPendingTransition({ incident, status, closePayload })
  }, [canTransitionTo, pushToast])

  const requestCloseCase = (incident) => {
    if (!incident) return

    if (closeOutcome === 'report_filed' && !closeCaseId.trim()) {
      pushToast('Case ID is required when closure outcome is Report Filed.', 'warning')
      return
    }

    requestStatusUpdate(incident, 'police_closed', {
      closure_outcome: closeOutcome,
      closure_details: {
        case_id: closeCaseId.trim() || null,
        officer_notes: closeNotes.trim() || null,
      },
    })
  }

  const getIncidentFromAlert = (alert) => {
    if (!alert) return null
    const incidentId = alert.incidentId
    const match = filteredIncidents.find((incident) => String(incident.id) === String(incidentId))
    if (match) return match

    return {
      id: incidentId,
      incident_id: incidentId,
      status: alert.status,
    }
  }

  const handleAlertDispatch = (alert) => {
    const incident = getIncidentFromAlert(alert)
    if (!incident) {
      pushToast('Unable to dispatch from alert: incident not found.', 'warning')
      return
    }

    requestStatusUpdate(incident, 'dispatched')
  }

  const notifyCriticalAlert = useCallback(async (payload) => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return
    if (payload?.severity !== 'critical') return

    const showNotification = () => {
      const notification = new Notification('Critical LE Alert', {
        body: payload?.title || 'A critical incident requires immediate dispatch.',
      })
      notification.onclick = () => {
        window.focus()
      }
    }

    if (Notification.permission === 'granted') {
      showNotification()
      return
    }

    if (Notification.permission === 'denied' && !notificationFallbackShownRef.current) {
      notificationFallbackShownRef.current = true
      pushToast('Critical alert received. Browser notifications are blocked.', 'warning')
      return
    }

    if (Notification.permission === 'default' && !notificationPermissionRequestedRef.current) {
      notificationPermissionRequestedRef.current = true
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        showNotification()
      } else if (!notificationFallbackShownRef.current) {
        notificationFallbackShownRef.current = true
        pushToast('Critical alert received. Enable browser notifications for pop-up alerts.', 'warning')
      }
    }
  }, [pushToast])

  const confirmPendingTransition = async () => {
    if (!pendingTransition || statusMutation.isPending) return

    await runStatusUpdate(
      pendingTransition.incident,
      pendingTransition.status,
      pendingTransition.closePayload
    )
    setPendingTransition(null)
  }

  useEffect(() => {
    if (!selectedIncidentId) return
    setCloseOutcome('resolved_handled')
    setCloseCaseId('')
    setCloseNotes('')
  }, [selectedIncidentId])

  useEffect(() => {
    if (user?.role !== 'law_enforcement' && user?.role !== 'admin') return

    const token = localStorage.getItem('moderator_token')
    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: { token },
    })

    socket.on('lei_alert', (payload) => {
      const normalizedStatus = payload?.status || null
      if (normalizedStatus === 'verified') {
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

      setLeiAlerts((prev) => prev.filter((alert) => String(alert.incidentId) !== String(incidentId)))
      queryClient.invalidateQueries({ queryKey: ['lei-incidents-snapshot'] })
    })

    return () => {
      socket.disconnect()
    }
  }, [notifyCriticalAlert, pushToast, queryClient, user])

  const pendingActionConfig = pendingTransition?.status
    ? STATUS_ACTION_CONFIG[pendingTransition.status]
    : null

  const activeCasesCount = allLeiIncidents.filter((incident) => incident.status !== 'police_closed').length
  const criticalActiveCount = allLeiIncidents.filter(
    (incident) => incident.status !== 'police_closed' && incident.severity === 'critical'
  ).length

  useEffect(() => {
    const statusByIncidentId = new Map(
      allLeiIncidents.map((incident) => [String(incident.incident_id), incident.status])
    )

    setLeiAlerts((prev) =>
      prev.filter((alert) => {
        const status = statusByIncidentId.get(String(alert.incidentId))
        if (!status) return true
        return status === 'verified'
      })
    )
  }, [allLeiIncidents])

  useEffect(() => {
    const onKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase()
      const isTypingTarget =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        event.target?.isContentEditable

      if (isTypingTarget) return

      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === 'Escape') {
        if (pendingTransition) {
          setPendingTransition(null)
          return
        }
        manualDeselectRef.current = true
        setSelectedIncidentId(null)
        return
      }

      if (!selectedIncident) return

      if (event.key.toLowerCase() === 'd' && canTransitionTo(selectedIncident, 'dispatched')) {
        requestStatusUpdate(selectedIncident, 'dispatched')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canTransitionTo, pendingTransition, requestStatusUpdate, selectedIncident])

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

      <div className="sticky top-3 z-40 bg-card/95 backdrop-blur border border-border rounded-lg shadow-soft px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm font-semibold text-text">Officer: {user?.username || 'Unknown'}</span>
        <span className="text-sm text-muted">Active Cases: {activeCasesCount}</span>
        <span className="text-sm font-semibold text-danger">Critical: {criticalActiveCount}</span>
        <span className="text-xs text-muted">Shortcuts: D dispatch selected, Esc deselect</span>
      </div>

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
                onClick={() => selectIncident(alert.incidentId)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-text">{alert.title || `Incident #${alert.incidentId}`}</p>
                    <p className="text-sm text-muted mt-1">
                      Severity <span className="font-semibold uppercase">{alert.severity || 'unknown'}</span> · Status{' '}
                      <span className="font-semibold">{alert.status || 'N/A'}</span>
                    </p>
                    <div className="mt-3" onClick={(event) => event.stopPropagation()}>
                      <button
                        onClick={() => handleAlertDispatch(alert)}
                        disabled={statusMutation.isPending || alert.status !== 'verified'}
                        className="px-3 py-1.5 rounded bg-primary text-white text-xs font-semibold disabled:opacity-50"
                      >
                        {statusMutation.isPending ? 'Dispatching...' : 'Dispatch Now'}
                      </button>
                      {alert.status !== 'verified' ? (
                        <p className="text-xs text-muted mt-1">Dispatch unavailable: incident already actioned.</p>
                      ) : null}
                    </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)] gap-6 items-start">
        <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
          <div className="max-h-[72vh] overflow-auto">
            <table className="w-full">
              <thead className="bg-surface border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-text">Incident</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-text">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-text">Severity</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-text">Time Reported</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-text">Reporter</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-muted" colSpan={6}>Loading incidents...</td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-muted" colSpan={6}>No incidents found.</td>
                  </tr>
                ) : (
                  filteredIncidents.map((incident) => {
                    const aged = isUnactionedAged(incident)
                    const statusClass = aged ? 'bg-danger/10' : STATUS_ROW_CLASS[incident.status]
                    const nextStatus = getNextWorkflowStatus(incident.status)
                    const nextAction = nextStatus ? STATUS_ACTION_CONFIG[nextStatus] : null

                    return (
                      <tr
                        key={incident.id}
                        className={`cursor-pointer ${statusClass || ''} ${selectedIncidentId === incident.id ? 'ring-1 ring-primary/30' : 'hover:bg-surface'}`}
                        onClick={() => selectIncident(incident.id)}
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
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-text tabular-nums">{getTimeAgo(incident.reportedAt)}</span>
                            {aged ? (
                              <span
                                className="inline-flex w-fit rounded-full bg-danger/20 px-2 py-0.5 text-[11px] font-semibold text-danger"
                                title={`Reported at ${new Date(incident.reportedAt).toLocaleString()}`}
                              >
                                Over {UNACTIONED_AGE_THRESHOLD_MINUTES}m waiting dispatch
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">{incident.username || 'Unknown'}</td>
                        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                          {nextAction && nextStatus !== 'police_closed' ? (
                            <button
                              onClick={() => requestStatusUpdate(incident, nextStatus)}
                              disabled={statusMutation.isPending || !canTransitionTo(incident, nextStatus)}
                              className={`px-2.5 py-1.5 rounded text-xs font-semibold disabled:opacity-50 ${nextAction.buttonClass}`}
                            >
                              {statusMutation.isPending ? 'Updating...' : nextAction.label}
                            </button>
                          ) : nextStatus === 'police_closed' ? (
                            <span className="text-xs text-muted">Close from detail panel</span>
                          ) : (
                            <span className="text-xs text-muted">No next action</span>
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

        <div className="lg:sticky lg:top-24 space-y-6">
          {selectedIncident ? (
            <>
              <div className="bg-card border border-border rounded-lg shadow-soft p-6 space-y-4">
                {(() => {
                  const currentStepIndex = WORKFLOW_STEPS.findIndex((step) => step.id === selectedIncident.status)
                  const nextStatus = getNextWorkflowStatus(selectedIncident.status)
                  const nextAction = nextStatus ? STATUS_ACTION_CONFIG[nextStatus] : null

                  return (
                    <>
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
                        height={240}
                        autoFit={false}
                        emptyMessage="No coordinates available for this incident."
                      />

                      <div className="pt-4 border-t border-border">
                        <p className="text-sm font-semibold text-text mb-3">Status Workflow</p>
                        <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-1 gap-2">
                          {WORKFLOW_STEPS.map((step, index) => {
                            const isDone = currentStepIndex > index
                            const isCurrent = currentStepIndex === index

                            return (
                              <div
                                key={step.id}
                                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                                  isCurrent
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

                        <div className="mt-3">
                          {nextStatus === 'police_closed' ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3">
                                <select
                                  value={closeOutcome}
                                  onChange={(event) => setCloseOutcome(event.target.value)}
                                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm"
                                >
                                  {CLOSURE_OUTCOMES.map((outcome) => (
                                    <option key={outcome.value} value={outcome.value}>
                                      {outcome.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={closeCaseId}
                                  onChange={(event) => setCloseCaseId(event.target.value)}
                                  placeholder="Case ID (for Report Filed)"
                                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm"
                                />
                                <button
                                  onClick={() => requestCloseCase(selectedIncident)}
                                  disabled={
                                    statusMutation.isPending ||
                                    !canTransitionTo(selectedIncident, 'police_closed') ||
                                    (closeOutcome === 'report_filed' && !closeCaseId.trim())
                                  }
                                  className="px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white disabled:opacity-50"
                                >
                                  {statusMutation.isPending ? 'Closing...' : 'Close Case'}
                                </button>
                              </div>
                              <textarea
                                value={closeNotes}
                                onChange={(event) => setCloseNotes(event.target.value)}
                                rows={3}
                                placeholder="Officer notes"
                                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm"
                              />
                              {closeOutcome === 'report_filed' && !closeCaseId.trim() ? (
                                <p className="text-xs text-danger">Case ID is required when outcome is Report Filed.</p>
                              ) : null}
                            </div>
                          ) : nextAction ? (
                            <button
                              onClick={() => requestStatusUpdate(selectedIncident, nextStatus)}
                              disabled={statusMutation.isPending || !canTransitionTo(selectedIncident, nextStatus)}
                              className={`px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 ${nextAction.buttonClass}`}
                            >
                              {statusMutation.isPending ? 'Updating...' : nextAction.label}
                            </button>
                          ) : (
                            <p className="text-sm text-muted">Workflow complete. No next action available.</p>
                          )}
                        </div>
                      </div>
                    </>
                  )
                })()}
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
            </>
          ) : (
            <div className="bg-card border border-border rounded-lg shadow-soft p-6 text-sm text-muted">
              No incident selected. Choose a row to view detail.
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-muted">
        Live status transitions supported: verified to dispatched to on_scene to investigating to police_closed.
      </div>

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
