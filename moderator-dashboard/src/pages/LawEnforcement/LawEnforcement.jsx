import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowUpRight, ChevronDown, ChevronUp, Clock, Flag, LayoutGrid, Radio, Shield, Wifi, Zap } from 'lucide-react'
import { io } from 'socket.io-client'
import ConfirmDialog from '../../components/ConfirmDialog'
import FilterDropdown from '../../components/FilterDropdown'
import GoogleMapPanel from '../../components/GoogleMapPanel'
import SearchInput from '../../components/SearchInput'
import SeverityBadge from '../../components/SeverityBadge'
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
    buttonClass: 'bg-primary text-bg font-mono uppercase tracking-wide',
    confirmTitle: 'Dispatch unit?',
    confirmMessage: 'This marks the incident as dispatched and notifies responders.',
    confirmClassName: 'bg-primary hover:bg-primary/90 text-bg',
  },
  on_scene: {
    label: 'Mark On Scene',
    buttonClass: 'bg-warning text-bg font-mono uppercase tracking-wide',
    confirmTitle: 'Mark unit on scene?',
    confirmMessage: 'Use this only when a responding unit has arrived at the location.',
    confirmClassName: 'bg-warning hover:bg-warning/90 text-bg',
  },
  investigating: {
    label: 'Mark Investigating',
    buttonClass: 'bg-warning/70 text-bg font-mono uppercase tracking-wide',
    confirmTitle: 'Move to investigating?',
    confirmMessage: 'This marks active scene handling as complete and starts investigation.',
    confirmClassName: 'bg-warning/70 hover:bg-warning/90 text-bg',
  },
  police_closed: {
    label: 'Close Case',
    buttonClass: 'bg-success/20 text-success border border-success/40 font-mono uppercase tracking-wide',
    confirmTitle: 'Close this case?',
    confirmMessage: 'Closing is recorded in the audit log and ends the active LE workflow.',
    confirmClassName: 'bg-success/20 hover:bg-success/30 text-success border border-success/40',
  },
}

const STATUS_ROW_CLASS = {
  verified: 'bg-warning/10',
  dispatched: 'bg-primary/10',
  on_scene: 'bg-primary/10',
  investigating: 'bg-warning/10',
  police_closed: 'bg-success/5',
}

const UNACTIONED_AGE_THRESHOLD_MINUTES = 30

// ─── Sub-nav tabs ─────────────────────────────────────────────────────────────

const VIEWS = [
  { id: 'queue', label: 'Incident Queue', icon: Radio },
  { id: 'map', label: 'Operations Map', icon: LayoutGrid },
  { id: 'closed', label: 'Closed Cases', icon: Flag },
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

  return (
    <div className="border-b border-border overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-2.5 bg-warning/5 hover:bg-warning/10 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={14} className="text-warning flex-shrink-0" />
          <span className="size-5 rounded flex items-center justify-center bg-warning text-bg text-[11px] font-bold font-mono flex-shrink-0">
            {alerts.length}
          </span>
          <span className="text-sm font-semibold text-warning font-condensed uppercase tracking-wide">
            Unactioned alerts require immediate review
          </span>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-warning flex-shrink-0" />
          : <ChevronDown size={14} className="text-warning flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="divide-y divide-border">
          {alerts.map((alert) => (
            <div
              key={alert.incidentId}
              className="flex items-center justify-between gap-4 px-5 py-2.5 cursor-pointer hover:bg-surface transition-colors"
              onClick={() => onSelectIncident(alert.incidentId)}
            >
              <div className="min-w-0 flex items-center gap-3">
                <span
                  className={`text-[10px] font-mono font-bold uppercase ${
                    alert.severity === 'critical' ? 'text-purple-400' : 'text-warning'
                  }`}
                >
                  {alert.severity}
                </span>
                <p className="text-sm font-semibold text-text truncate">
                  {alert.title || `Incident #${alert.incidentId}`}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {Number.isFinite(Number(alert.latitude)) && Number.isFinite(Number(alert.longitude)) && (
                  <a
                    href={openMapsUrl(alert.latitude, alert.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-primary hover:underline uppercase"
                  >
                    Map
                  </a>
                )}
                <button
                  onClick={() => onDispatch(alert)}
                  disabled={statusMutationPending || alert.status !== 'verified'}
                  className="px-3 py-1 rounded border border-primary text-primary text-xs font-mono font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-primary/10 transition-colors"
                >
                  Dispatch
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
      <div className="px-3 pt-3 pb-2 border-b border-border flex-shrink-0 space-y-2">
        <SearchInput
          label="Search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title or description..."
        />
        <div className="flex items-center gap-2">
          <FilterDropdown
            label="Status"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            options={LEI_STATUS_FILTERS}
          />
          <div className="ml-auto inline-flex rounded border border-border bg-surface overflow-hidden flex-shrink-0">
            <button
              onClick={() => onSortModeChange('urgency')}
              title="Sort by urgency"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wide transition-colors ${
                sortMode === 'urgency'
                  ? 'bg-primary text-bg'
                  : 'text-muted hover:text-text hover:bg-surface'
              }`}
            >
              <Zap size={11} />
              Urgency
            </button>
            <span className="inline-block h-5 w-px bg-border self-center" />
            <button
              onClick={() => onSortModeChange('time')}
              title="Sort by newest reports"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wide transition-colors ${
                sortMode === 'time'
                  ? 'bg-primary text-bg'
                  : 'text-muted hover:text-text hover:bg-surface'
              }`}
            >
              <Clock size={11} />
              Newest
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full">
          <thead className="bg-surface border-b border-border sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-muted font-condensed uppercase tracking-widest">Incident</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-muted font-condensed uppercase tracking-widest">Sev</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-muted font-condensed uppercase tracking-widest">Age</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-muted font-condensed uppercase tracking-widest">Action</th>
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
                      <span className="text-xs text-text tabular-nums font-mono">{getTimeAgo(incident.reportedAt)}</span>
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
                          className="px-2.5 py-1 rounded border border-primary text-primary text-[11px] font-mono font-bold uppercase tracking-wide hover:bg-primary/10 disabled:opacity-40 transition-colors whitespace-nowrap"
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
  const isComplete = incident.status === 'police_closed'

  return (
    <div className="overflow-y-auto h-full">
      {/* ─ Title block ─ */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="text-3xl font-bold text-text leading-tight text-balance font-condensed uppercase tracking-wide flex-1">
            {incident.title}
          </h3>
          <span className="flex-shrink-0 mt-1 px-3 py-1 rounded border border-primary text-primary text-xs font-mono font-bold uppercase tracking-widest">
            {incident.status?.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-sm text-muted leading-relaxed text-pretty">{incident.description}</p>
      </div>

      {/* ─ Meta cards ─ */}
      <div className="grid grid-cols-3 border-t border-b border-border">
        <div className="px-4 py-3 border-r border-border">
          <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-1">Reporter</p>
          <p className="text-sm font-semibold text-text">{incident.username || 'Unknown'}</p>
        </div>
        <div className="px-4 py-3 border-r border-border">
          <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-1">Reported</p>
          <p className="text-sm font-semibold text-text tabular-nums font-mono">{getTimeAgo(incident.reportedAt)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-1">Location</p>
          <p className="text-sm font-semibold text-text leading-snug">
            {incident.location_name || (
              Number.isFinite(Number(incident.latitude))
                ? `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}`
                : 'Unknown'
            )}
          </p>
        </div>
      </div>

      {/* ─ Workflow stepper ─ */}
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-4">Status Workflow</p>

        {/* Step circles + connecting line */}
        <div className="relative flex items-start justify-between mb-5">
          {/* connector line behind circles */}
          <div className="absolute left-0 right-0 top-3 h-px bg-border" />
          {WORKFLOW_STEPS.map((step, index) => {
            const isDone = currentStepIndex >= index
            const isNext = currentStepIndex + 1 === index
            return (
              <div key={step.id} className="relative flex flex-col items-center gap-2 z-10">
                <div
                  className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono border-2 transition-colors ${
                    isDone
                      ? 'border-primary bg-primary text-bg'
                      : isNext
                        ? 'border-warning bg-card text-warning'
                        : 'border-border bg-card text-muted'
                  }`}
                >
                  {isDone ? '✓' : index + 1}
                </div>
                <span
                  className={`text-[9px] font-bold font-condensed uppercase tracking-wider text-center leading-tight ${
                    isDone ? 'text-primary' : isNext ? 'text-warning' : 'text-muted'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Action button row */}
        {isComplete ? (
          <p className="text-xs text-muted font-mono uppercase tracking-wide">Case closed.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {/* Primary: next workflow step */}
            {nextAction && (
              <button
                onClick={() => onRequestAction(incident, nextStatus)}
                disabled={statusMutationPending}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded border border-primary text-primary text-xs font-mono font-bold uppercase tracking-wide hover:bg-primary/10 disabled:opacity-40 transition-colors"
              >
                <ArrowUpRight size={12} />
                {nextAction.label}
              </button>
            )}
            {/* Flag for review */}
            <button
              disabled
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded border border-border text-muted text-xs font-mono font-bold uppercase tracking-wide cursor-not-allowed opacity-50"
            >
              <Flag size={12} />
              Flag for Review
            </button>
            {/* Direct close */}
            {incident.status !== 'police_closed' && (
              <button
                onClick={() => onRequestAction(incident, 'police_closed')}
                disabled={statusMutationPending}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded border border-border text-muted text-xs font-mono font-bold uppercase tracking-wide hover:border-error/50 hover:text-error disabled:opacity-40 transition-colors"
              >
                Close Case
              </button>
            )}
          </div>
        )}
        {incident.status === 'dispatched' && (
          <p className="mt-2 text-[11px] text-primary font-mono uppercase flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary animate-pulse-opacity" />
            Dispatched {getTimeAgo(incident.updated_at || incident.created_at)}
          </p>
        )}
      </div>

      {/* ─ Incident location ─ */}
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-3">Incident Location</p>
        <div className="relative rounded border border-border overflow-hidden">
          <GoogleMapPanel
            markers={[{
              id: `lei-detail-${incident.id || incident.incident_id}`,
              lat: incident.latitude,
              lng: incident.longitude,
              title: incident.title,
            }]}
            center={{ lat: incident.latitude, lng: incident.longitude }}
            zoom={15}
            height={200}
            autoFit={false}
            emptyMessage="No coordinates available."
          />
          {Number.isFinite(Number(incident.latitude)) && (
            <div className="absolute bottom-2 left-2 bg-card/90 backdrop-blur-sm border border-border px-2 py-0.5 rounded text-[10px] font-mono text-muted tabular-nums">
              {Number(incident.latitude).toFixed(6)}, {Number(incident.longitude).toFixed(6)}
            </div>
          )}
        </div>
        {Number.isFinite(Number(incident.latitude)) && (
          <a
            href={openMapsUrl(incident.latitude, incident.longitude)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wide text-primary hover:underline"
          >
            <ArrowUpRight size={12} />
            Open in Maps
          </a>
        )}
      </div>

      {/* ─ Evidence photos ─ */}
      {incident.photo_urls?.length > 0 && (
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-3">Evidence</p>
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

      {/* ─ Chain of custody ─ */}
      <div className="px-6 pt-5 pb-6">
        <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-3">Chain of Custody</p>
        {actionLog.length ? (
          <ul className="space-y-2">
            {actionLog.map((entry) => (
              <li key={entry.action_id} className="border border-border rounded p-2.5 bg-surface">
                <p className="text-xs font-semibold text-text font-condensed uppercase tracking-wide">{entry.action_type.replace(/_/g, ' ')}</p>
                <p className="text-[11px] text-muted mt-0.5 font-mono tabular-nums">
                  {entry.moderator_name || 'System'} · {new Date(entry.timestamp).toLocaleString()}
                </p>
                {entry.notes && <p className="text-[11px] text-muted mt-0.5">{entry.notes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted font-mono">No actions recorded.</p>
        )}
      </div>
    </div>
  )
}

/**
 * Operations Map view — all active incidents as markers.
 */
function OpsMapView({ incidents, onSelectIncident: _onSelectIncident }) {
  const markers = incidents
    .filter((inc) => Number.isFinite(Number(inc.latitude)) && Number.isFinite(Number(inc.longitude)))
    .map((inc) => ({
      id: `ops-${inc.incident_id || inc.id}`,
      lat: inc.latitude,
      lng: inc.longitude,
      title: inc.title || `Incident #${inc.incident_id}`,
    }))

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <p className="text-sm font-bold text-text font-condensed uppercase tracking-wide">
          All Active Incidents — {markers.length} with coordinates
        </p>
        <p className="text-xs text-muted mt-0.5">Click a marker to select an incident in the Queue.</p>
      </div>
      <div className="flex-1 min-h-0">
        <GoogleMapPanel
          markers={markers}
          height="100%"
          autoFit
          showClusters={markers.length > 10}
          emptyMessage="No active incidents with coordinates."
        />
      </div>
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
        <p className="text-sm font-bold text-text font-condensed uppercase tracking-wide">Closed Cases ({closedIncidents.length})</p>
      </div>
      <table className="w-full">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-[11px] font-bold text-muted font-condensed uppercase tracking-widest">Incident</th>
            <th className="px-4 py-3 text-left text-[11px] font-bold text-muted font-condensed uppercase tracking-widest">Sev</th>
            <th className="px-4 py-3 text-left text-[11px] font-bold text-muted font-condensed uppercase tracking-widest">Reporter</th>
            <th className="px-4 py-3 text-left text-[11px] font-bold text-muted font-condensed uppercase tracking-widest">Closed At</th>
            <th className="px-4 py-3 text-left text-[11px] font-bold text-muted font-condensed uppercase tracking-widest">Outcome</th>
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
                <td className="px-4 py-3 text-sm text-muted font-mono tabular-nums">{inc.username || 'Unknown'}</td>
                <td className="px-4 py-3 text-sm text-muted font-mono tabular-nums">
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
        <AlertTriangle size={48} className="mx-auto text-warning mb-4" />
        <h2 className="text-2xl font-bold text-text font-condensed uppercase tracking-wide">Access Restricted</h2>
        <p className="text-muted mt-2">You do not have permission to view the Law Enforcement Interface.</p>
      </div>
    )
  }

  const pendingActionConfig = pendingTransition?.status ? STATUS_ACTION_CONFIG[pendingTransition.status] : null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col -m-8 h-dvh bg-bg">
      {/* ── Integrated header bar ── */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between px-8">
          {/* Left: title */}
          <div className="flex items-center gap-3 py-5">
            <Shield size={18} className="text-primary flex-shrink-0" />
            <h1 className="text-xl font-bold font-condensed uppercase tracking-widest text-text leading-none">
              Law Enforcement Operations
            </h1>
          </div>
          {/* Right: tabs + LIVE indicator */}
          <div className="flex items-center">
            {VIEWS.map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex items-center gap-2 px-5 py-5 text-[11px] font-mono font-bold uppercase tracking-widest border-b-2 transition-colors ${
                  activeView === view.id
                    ? 'text-primary border-primary'
                    : 'text-muted border-transparent hover:text-text'
                }`}
              >
                <view.icon size={13} />
                {view.label}
              </button>
            ))}
            <div className="w-px h-5 bg-border mx-4" />
            <div className={`flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest ${hasFreshRealtimeAlert ? 'text-warning' : 'text-success'}`}>
              <span className={`size-1.5 rounded-full bg-current ${hasFreshRealtimeAlert ? 'animate-pulse-opacity' : ''}`} />
              Live
              <Wifi size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[280px] max-w-[420px] rounded border px-4 py-3 text-xs font-mono pointer-events-auto ${
              toast.type === 'error'
                ? 'border-error/40 bg-error/10 text-error'
                : toast.type === 'warning'
                  ? 'border-warning/40 bg-warning/10 text-warning'
                  : 'border-success/40 bg-success/10 text-success'
              }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* ── Incident Queue view ── */}
      {activeView === 'queue' && (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Alert banner — full width, auto height */}
          <AlertBanner
            alerts={displayAlerts}
            onDispatch={handleAlertDispatch}
            statusMutationPending={statusMutation.isPending}
            onSelectIncident={setSelectedIncidentId}
          />

          {/* Two-column split fills remaining height */}
          <div className="grid flex-1 min-h-0" style={{ gridTemplateColumns: '2fr 3fr' }}>
            {/* Left: table */}
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
            {/* Right: detail pane */}
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
      )}

      {/* ── Operations Map view ── */}
      {activeView === 'map' && (
        <div className="flex-1 min-h-0">
          <OpsMapView
            incidents={allLeiIncidents}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id)
              setActiveView('queue')
            }}
          />
        </div>
      )}

      {/* ── Closed Cases view ── */}
      {activeView === 'closed' && (
        <div className="flex-1 min-h-0 overflow-auto p-8">
          <ClosedCasesView />
        </div>
      )}

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
