import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Flag, LayoutGrid, Radio, Shield, Wifi, Zap, ArrowUpRight } from 'lucide-react'
import { io } from 'socket.io-client'
import ConfirmDialog from '../../components/ConfirmDialog'
import GoogleMapPanel from '../../components/GoogleMapPanel'
import SeverityBadge from '../../components/SeverityBadge'
import { LEI_STATUS_FILTERS } from '../../constants/incident'
import { useAuth } from '../../context/AuthContext'
import { leiAPI } from '../../services/api'
import { getTimeAgo } from '../../utils/dateUtils'
import { formatStatusLabel, openMapsUrl, SEVERITY_VARIANTS } from '../../utils/incident'
import { SOCKET_URL } from '../../utils/network'

// ─── CSS ──────────────────────────────────────────────────────────────────────

const leStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  .lei-root {
    --le-bg: #07090B;
    --le-surface: #0D1117;
    --le-surface2: #131920;
    --le-border: #1C2430;
    --le-border2: #243040;
    --le-muted: #3D4F65;
    --le-text: #D9E4F0;
    --le-text-dim: #5C7390;
    --le-amber: #F5A623;
    --le-red: #E5484D;
    --le-blue: #3B9EFF;
    --le-green: #30A46C;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--le-text);
    background: var(--le-bg);
  }
  .lei-root * { box-sizing: border-box; margin: 0; padding: 0; }

  /* TOPBAR */
  .lei-topbar {
    border-bottom: 1px solid var(--le-border);
    padding: 0 24px;
    display: flex;
    align-items: center;
    background: var(--le-surface);
    flex-shrink: 0;
    height: 52px;
  }
  .lei-topbar-title {
    font-weight: 800;
    font-size: 17px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--le-text);
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: 32px;
    flex-shrink: 0;
  }
  .lei-tab-bar { display: flex; flex: 1; }
  .lei-tab {
    padding: 0 20px;
    height: 52px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    letter-spacing: 0.04em;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--le-text-dim);
    cursor: pointer;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    transition: color 0.1s;
  }
  .lei-tab:hover { color: var(--le-text); }
  .lei-tab.active { color: var(--le-blue); border-bottom-color: var(--le-blue); }
  .lei-live-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .lei-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    animation: lei-pulse 2s ease-in-out infinite;
  }
  @keyframes lei-pulse { 0%,100%{opacity:1}50%{opacity:0.3} }

  /* ALERT BANNER */
  .lei-alert-banner-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 24px;
    background: rgba(245,166,35,0.05);
    border: none;
    border-bottom: 1px solid rgba(245,166,35,0.2);
    cursor: pointer;
    transition: background 0.1s;
  }
  .lei-alert-banner-toggle:hover { background: rgba(245,166,35,0.09); }
  .lei-alert-banner-left {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: var(--le-amber);
    letter-spacing: 0.04em;
  }
  .lei-alert-count {
    font-size: 10px;
    background: var(--le-amber);
    color: #000;
    padding: 2px 6px;
    font-weight: 700;
    border-radius: 2px;
  }
  .lei-alert-rows { border-bottom: 1px solid rgba(245,166,35,0.15); }
  .lei-alert-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 9px 24px;
    border-top: 1px solid var(--le-border);
    cursor: pointer;
    background: none;
    transition: background 0.1s;
  }
  .lei-alert-row:hover { background: rgba(245,166,35,0.04); }
  .lei-alert-row-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .lei-alert-row-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

  /* CONTENT SPLIT */
  .lei-content {
    display: grid;
    grid-template-columns: 420px 1fr;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  /* QUEUE PANEL */
  .lei-queue-panel {
    border-right: 1px solid var(--le-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--le-surface);
  }
  .lei-queue-filters {
    padding: 14px 16px;
    border-bottom: 1px solid var(--le-border);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .lei-search-box {
    background: var(--le-surface2);
    border: 1px solid var(--le-border2);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
  }
  .lei-search-box input {
    background: none;
    border: none;
    outline: none;
    color: var(--le-text);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12px;
    flex: 1;
  }
  .lei-search-box input::placeholder { color: var(--le-text-dim); }
  .lei-filter-row { display: flex; gap: 8px; align-items: center; }
  .lei-select {
    flex: 1;
    background: var(--le-surface2);
    border: 1px solid var(--le-border2);
    color: var(--le-text);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    padding: 6px 10px;
    outline: none;
    cursor: pointer;
    appearance: none;
  }
  .lei-sort-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    border: 1px solid var(--le-border2);
    color: var(--le-text-dim);
    background: none;
    text-transform: uppercase;
    transition: all 0.1s;
  }
  .lei-sort-btn.active { background: rgba(59,158,255,0.08); border-color: var(--le-blue); color: var(--le-blue); }

  /* COLUMN HEADERS */
  .lei-queue-cols {
    display: grid;
    grid-template-columns: 1fr 72px 80px 90px;
    padding: 7px 16px;
    border-bottom: 1px solid var(--le-border);
    flex-shrink: 0;
    background: var(--le-surface);
  }
  .lei-col-label {
    font-size: 9px;
    letter-spacing: 0.06em;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--le-muted);
  }

  /* INCIDENT ROWS */
  .lei-incident-list { flex: 1; overflow-y: auto; }
  .lei-incident-list::-webkit-scrollbar { width: 3px; }
  .lei-incident-list::-webkit-scrollbar-thumb { background: var(--le-border2); }
  .lei-incident-row {
    display: grid;
    grid-template-columns: 1fr 72px 80px 90px;
    padding: 11px 16px;
    border-bottom: 1px solid var(--le-border);
    cursor: pointer;
    transition: background 0.1s;
    align-items: start;
    background: var(--le-surface);
  }
  .lei-incident-row:hover { background: var(--le-surface2); }
  .lei-incident-row.selected { background: rgba(59,158,255,0.05); border-left: 2px solid var(--le-blue); padding-left: 14px; }
  .lei-incident-row.aged { background: rgba(229,72,77,0.06); }
  .lei-incident-title { font-size: 13px; font-weight: 600; color: var(--le-text); margin-bottom: 3px; line-height: 1.3; }
  .lei-incident-preview { font-size: 10px; color: var(--le-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
  .lei-sev-badge { display: flex; flex-direction: column; align-items: center; gap: 3px; padding-top: 2px; }
  .lei-sev-label { font-size: 9px; letter-spacing: 0.05em; font-weight: 700; }
  .lei-sev-dots { display: flex; gap: 2px; }
  .lei-sev-dot { width: 5px; height: 5px; border-radius: 50%; }
  .lei-age-cell { font-size: 11px; color: var(--le-text-dim); font-variant-numeric: tabular-nums; padding-top: 2px; }
  .lei-age-flag { font-size: 9px; color: var(--le-amber); margin-top: 2px; }
  .lei-action-btn {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 5px 9px;
    border: 1px solid var(--le-blue);
    color: var(--le-blue);
    background: rgba(59,158,255,0.06);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .lei-action-btn:hover:not(:disabled) { background: var(--le-blue); color: #000; }
  .lei-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .lei-empty { display: flex; align-items: center; justify-content: center; height: 120px; color: var(--le-muted); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }

  /* DETAIL PANEL */
  .lei-detail-panel { display: flex; flex-direction: column; overflow: hidden; background: var(--le-bg); }
  .lei-detail-scroll { flex: 1; overflow-y: auto; padding: 24px; }
  .lei-detail-scroll::-webkit-scrollbar { width: 3px; }
  .lei-detail-scroll::-webkit-scrollbar-thumb { background: var(--le-border2); }
  .lei-detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
  .lei-detail-title { font-size: 26px; font-weight: 800; letter-spacing: 0.01em; text-transform: uppercase; color: var(--le-text); line-height: 1.15; flex: 1; }
  .lei-status-chip { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border: 1px solid; flex-shrink: 0; margin-top: 3px; }
  .lei-status-chip.verified { border-color: var(--le-green); color: var(--le-green); background: rgba(48,164,108,0.08); }
  .lei-status-chip.dispatched { border-color: var(--le-blue); color: var(--le-blue); background: rgba(59,158,255,0.08); }
  .lei-status-chip.on_scene { border-color: var(--le-blue); color: var(--le-blue); background: rgba(59,158,255,0.06); }
  .lei-status-chip.investigating { border-color: var(--le-amber); color: var(--le-amber); background: rgba(245,166,35,0.08); }
  .lei-status-chip.police_closed { border-color: var(--le-muted); color: var(--le-muted); background: rgba(61,79,101,0.1); }
  .lei-detail-body { font-size: 13px; line-height: 1.7; color: var(--le-text-dim); margin-bottom: 20px; border-left: 2px solid var(--le-border2); padding-left: 14px; }
  .lei-meta-grid { display: grid; grid-template-columns: repeat(3,1fr); border: 1px solid var(--le-border); margin-bottom: 24px; }
  .lei-meta-cell { padding: 12px 14px; border-right: 1px solid var(--le-border); }
  .lei-meta-cell:last-child { border-right: none; }
  .lei-meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--le-muted); margin-bottom: 4px; }
  .lei-meta-value { font-size: 12px; color: var(--le-text); font-weight: 500; }
  .lei-section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--le-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .lei-section-label::after { content:''; flex:1; height:1px; background: var(--le-border); }

  /* WORKFLOW */
  .lei-workflow-steps { display: flex; align-items: flex-start; }
  .lei-workflow-step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; }
  .lei-workflow-step:not(:last-child)::after { content:''; position:absolute; top:11px; left:50%; width:100%; height:1px; background: var(--le-border2); z-index:0; }
  .lei-workflow-step.done::after { background: var(--le-blue); }
  .lei-step-circle { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--le-border2); display:flex; align-items:center; justify-content:center; background:var(--le-surface); position:relative; z-index:1; font-size:9px; color:var(--le-muted); font-weight:600; }
  .lei-step-circle.done { border-color:var(--le-blue); background:rgba(59,158,255,0.15); color:var(--le-blue); }
  .lei-step-circle.current { border-color:var(--le-amber); background:rgba(245,166,35,0.15); color:var(--le-amber); }
  .lei-step-name { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--le-muted); text-align:center; }
  .lei-step-name.done { color:var(--le-blue); }
  .lei-step-name.current { color:var(--le-amber); }

  /* ACTION ROW */
  .lei-action-row { display:flex; gap:10px; margin-top:16px; flex-wrap:wrap; align-items:center; }
  .lei-btn-primary { font-size:11px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; padding:10px 20px; border:1.5px solid var(--le-blue); color:var(--le-blue); background:rgba(59,158,255,0.08); cursor:pointer; transition:all 0.15s; font-family:'Plus Jakarta Sans',sans-serif; display:flex; align-items:center; gap:6px; }
  .lei-btn-primary:hover:not(:disabled) { background:var(--le-blue); color:#000; }
  .lei-btn-primary:disabled { opacity:0.4; cursor:not-allowed; }
  .lei-btn-ghost { font-size:11px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; padding:10px 16px; border:1px solid var(--le-border2); color:var(--le-text-dim); background:none; cursor:pointer; transition:all 0.1s; font-family:'Plus Jakarta Sans',sans-serif; display:flex; align-items:center; gap:6px; }
  .lei-btn-ghost:hover:not(:disabled) { border-color:var(--le-muted); color:var(--le-text); }
  .lei-btn-ghost:disabled { opacity:0.4; cursor:not-allowed; }
  .lei-btn-close { font-size:11px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; padding:10px 16px; border:1px solid var(--le-border2); color:var(--le-text-dim); background:none; cursor:pointer; transition:all 0.1s; font-family:'Plus Jakarta Sans',sans-serif; margin-left:auto; display:flex; align-items:center; gap:6px; }
  .lei-btn-close:hover:not(:disabled) { border-color:var(--le-red); color:var(--le-red); }
  .lei-btn-close:disabled { opacity:0.4; cursor:not-allowed; }

  /* MAP */
  .lei-map-container { background:#090D12; border:1px solid var(--le-border); position:relative; overflow:hidden; margin-top:8px; }
  .lei-map-open-link { position:absolute; top:8px; left:10px; font-size:9px; color:var(--le-blue); letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; text-decoration:none; z-index:10; background:rgba(13,17,23,0.7); padding:2px 6px; }
  .lei-map-open-link:hover { text-decoration:underline; }

  /* CUSTODY */
  .lei-custody-entry { border:1px solid var(--le-border); padding:10px 12px; margin-bottom:8px; background:var(--le-surface); }
  .lei-custody-action { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--le-text); }
  .lei-custody-meta { font-size:10px; color:var(--le-text-dim); margin-top:3px; font-variant-numeric:tabular-nums; }

  /* TOAST */
  .lei-toast-stack { position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:8px; pointer-events:none; }
  .lei-toast { min-width:260px; max-width:400px; padding:10px 14px; font-size:11px; font-family:'Plus Jakarta Sans',sans-serif; font-weight:600; letter-spacing:0.04em; border:1px solid; pointer-events:auto; }
  .lei-toast.success { border-color:rgba(48,164,108,0.4); background:rgba(48,164,108,0.08); color:var(--le-green); }
  .lei-toast.error { border-color:rgba(229,72,77,0.4); background:rgba(229,72,77,0.08); color:var(--le-red); }
  .lei-toast.warning { border-color:rgba(245,166,35,0.4); background:rgba(245,166,35,0.08); color:var(--le-amber); }

  /* CLOSED */
  .lei-closed-wrap { padding:24px; overflow-y:auto; flex:1; }
  .lei-closed-table { width:100%; border-collapse:collapse; }
  .lei-closed-table th { text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--le-muted); padding:10px 14px; border-bottom:1px solid var(--le-border); background:var(--le-surface); }
  .lei-closed-table td { padding:10px 14px; font-size:12px; color:var(--le-text-dim); border-bottom:1px solid var(--le-border); }
  .lei-closed-table tr:hover td { background:rgba(255,255,255,0.02); }
  .lei-closed-title { font-size:13px; font-weight:600; color:var(--le-text); margin-bottom:2px; }

  /* SELECT PROMPT */
  .lei-select-prompt { display:flex; align-items:center; justify-content:center; height:100%; font-size:11px; color:var(--le-muted); letter-spacing:0.06em; text-transform:uppercase; }

  /* OPS MAP */
  .lei-ops-map-header { padding:14px 20px; border-bottom:1px solid var(--le-border); background:var(--le-surface); flex-shrink:0; }
  .lei-ops-map-title { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--le-text); }
  .lei-ops-map-sub { font-size:11px; color:var(--le-text-dim); margin-top:3px; }

  .lei-evidence-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .lei-evidence-img { width:100%; height:96px; object-fit:cover; border:1px solid var(--le-border); }
`

// ─── Constants ─────────────────────────────────────────────────────────────────

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

const STATUS_ACTION_CONFIG = {
  dispatched: {
    label: 'Dispatch Unit',
    confirmTitle: 'Dispatch unit?',
    confirmMessage: 'This marks the incident as dispatched and notifies responders.',
    confirmClassName: 'bg-primary hover:bg-primary/90 text-bg',
  },
  on_scene: {
    label: 'Mark On Scene',
    confirmTitle: 'Mark unit on scene?',
    confirmMessage: 'Use this only when a responding unit has arrived at the location.',
    confirmClassName: 'bg-warning hover:bg-warning/90 text-bg',
  },
  investigating: {
    label: 'Mark Investigating',
    confirmTitle: 'Move to investigating?',
    confirmMessage: 'This marks active scene handling as complete and starts investigation.',
    confirmClassName: 'bg-warning/70 hover:bg-warning/90 text-bg',
  },
  police_closed: {
    label: 'Close Case',
    confirmTitle: 'Close this case?',
    confirmMessage: 'Closing is recorded in the audit log and ends the active LE workflow.',
    confirmClassName: 'bg-success/20 hover:bg-success/30 text-success border border-success/40',
  },
}

const UNACTIONED_AGE_THRESHOLD_MINUTES = 30

const SEVERITY_COLOR = {
  critical: '#A855F7',
  high: '#E5484D',
  medium: '#F5A623',
  low: '#3B9EFF',
}

const VIEWS = [
  { id: 'queue', label: 'Incident Queue', Icon: Radio },
  { id: 'map', label: 'Operations Map', Icon: LayoutGrid },
  { id: 'closed', label: 'Closed Cases', Icon: Flag },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getIncidentAgeMinutes(incident) {
  const ts = incident?.reportedAt || incident?.incident_date || incident?.created_at
  if (!ts) return 0
  const diff = Date.now() - new Date(ts).getTime()
  return Number.isFinite(diff) && diff > 0 ? Math.floor(diff / 60000) : 0
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

// ─── SeverityDots ──────────────────────────────────────────────────────────────

function SeverityDots({ severity }) {
  const color = SEVERITY_COLOR[severity] || '#5C7390'
  const initials = severity ? severity[0].toUpperCase() : '?'
  return (
    <div className="lei-sev-badge">
      <div className="lei-sev-label" style={{ color }}>{initials}</div>
      <div className="lei-sev-dots">
        {[0, 1, 2].map((i) => (
          <div key={i} className="lei-sev-dot" style={{ background: color, opacity: i === 2 ? 1 : i === 1 ? 0.55 : 0.25 }} />
        ))}
      </div>
    </div>
  )
}

// ─── AlertBanner ───────────────────────────────────────────────────────────────

function AlertBanner({ alerts, onDispatch, statusMutationPending, onSelectIncident }) {
  const [expanded, setExpanded] = useState(true)
  if (!alerts.length) return null

  return (
    <div style={{ borderBottom: '1px solid rgba(245,166,35,0.2)', flexShrink: 0 }}>
      <button className="lei-alert-banner-toggle" onClick={() => setExpanded((p) => !p)}>
        <div className="lei-alert-banner-left">
          <AlertTriangle size={14} />
          <span className="lei-alert-count">{alerts.length}</span>
          <span style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
            Unactioned alerts require immediate review
          </span>
        </div>
        {expanded
          ? <ChevronUp size={13} style={{ color: 'var(--le-amber)', flexShrink: 0 }} />
          : <ChevronDown size={13} style={{ color: 'var(--le-amber)', flexShrink: 0 }} />}
      </button>

      {expanded && (
        <div className="lei-alert-rows">
          {alerts.map((alert) => (
            <div
              key={alert.incidentId}
              className="lei-alert-row"
              onClick={() => onSelectIncident(alert.incidentId)}
            >
              <div className="lei-alert-row-left">
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SEVERITY_COLOR[alert.severity] || 'var(--le-amber)', flexShrink: 0 }}>
                  {alert.severity?.toUpperCase()}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--le-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {alert.title || `Incident #${alert.incidentId}`}
                </span>
              </div>
              <div className="lei-alert-row-actions" onClick={(e) => e.stopPropagation()}>
                {Number.isFinite(Number(alert.latitude)) && (
                  <a href={openMapsUrl(alert.latitude, alert.longitude)} target="_blank" rel="noreferrer"
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--le-blue)', textDecoration: 'none' }}>
                    Map ↗
                  </a>
                )}
                <button
                  className="lei-action-btn"
                  disabled={statusMutationPending || alert.status !== 'verified'}
                  onClick={() => onDispatch(alert)}
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

// ─── IncidentQueuePanel ────────────────────────────────────────────────────────

function IncidentQueuePanel({
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
    <div className="lei-queue-panel">
      <div className="lei-queue-filters">
        <div className="lei-search-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--le-text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search by title or description..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="lei-filter-row">
          <select className="lei-select" value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}>
            {LEI_STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button className={`lei-sort-btn${sortMode === 'urgency' ? ' active' : ''}`} onClick={() => onSortModeChange('urgency')}>
            <Zap size={11} /> Urgency
          </button>
          <button className={`lei-sort-btn${sortMode === 'time' ? ' active' : ''}`} onClick={() => onSortModeChange('time')}>
            <Clock size={11} /> Newest
          </button>
        </div>
      </div>

      <div className="lei-queue-cols">
        <div className="lei-col-label">Incident</div>
        <div className="lei-col-label">Sev.</div>
        <div className="lei-col-label">Age</div>
        <div className="lei-col-label">Action</div>
      </div>

      <div className="lei-incident-list">
        {isLoading ? (
          <div className="lei-empty">Loading…</div>
        ) : incidents.length === 0 ? (
          <div className="lei-empty">No incidents found</div>
        ) : (
          incidents.map((incident) => {
            const aged = isUnactionedAged(incident)
            const isSelected = selectedIncidentId === incident.id
            const nextStatus = getNextWorkflowStatus(incident.status)
            const nextAction = nextStatus ? STATUS_ACTION_CONFIG[nextStatus] : null

            return (
              <div
                key={incident.id}
                className={`lei-incident-row${isSelected ? ' selected' : ''}${aged ? ' aged' : ''}`}
                onClick={() => onSelectIncident(incident.id)}
              >
                <div>
                  <div className="lei-incident-title">{incident.title}</div>
                  <div className="lei-incident-preview">{incident.description}</div>
                </div>

                <SeverityDots severity={incident.severity} />

                <div className="lei-age-cell">
                  <div>{getTimeAgo(incident.reportedAt)}</div>
                  {aged && <div className="lei-age-flag">&gt;{UNACTIONED_AGE_THRESHOLD_MINUTES}m</div>}
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  {nextAction ? (
                    <button
                      className="lei-action-btn"
                      disabled={statusMutationPending || !canTransitionTo(incident, nextStatus)}
                      onClick={() => onRequestAction(incident, nextStatus)}
                    >
                      {nextAction.label.split(' ')[0]}
                    </button>
                  ) : incident.status === 'police_closed' ? (
                    <span style={{ fontSize: 10, color: 'var(--le-muted)', letterSpacing: '0.04em' }}>CLOSED</span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--le-muted)' }}>—</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── IncidentDetailPane ────────────────────────────────────────────────────────

function IncidentDetailPane({ incident, actionLog, statusMutationPending, onRequestAction }) {
  if (!incident) {
    return (
      <div className="lei-detail-panel">
        <div className="lei-select-prompt">Select an incident from the queue</div>
      </div>
    )
  }

  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.id === incident.status)
  const nextStatus = getNextWorkflowStatus(incident.status)
  const nextAction = nextStatus ? STATUS_ACTION_CONFIG[nextStatus] : null
  const isComplete = incident.status === 'police_closed'
  const statusKey = incident.status || 'pending'

  return (
    <div className="lei-detail-panel">
      <div className="lei-detail-scroll">
        <div className="lei-detail-header">
          <div className="lei-detail-title">{incident.title}</div>
          <div className={`lei-status-chip ${statusKey}`}>{statusKey.replace(/_/g, ' ')}</div>
        </div>

        <p className="lei-detail-body">{incident.description}</p>

        <div className="lei-meta-grid">
          <div className="lei-meta-cell">
            <div className="lei-meta-label">Reporter</div>
            <div className="lei-meta-value">{incident.username || 'Unknown'}</div>
          </div>
          <div className="lei-meta-cell">
            <div className="lei-meta-label">Reported</div>
            <div className="lei-meta-value" style={{ fontVariantNumeric: 'tabular-nums' }}>{getTimeAgo(incident.reportedAt)}</div>
          </div>
          <div className="lei-meta-cell">
            <div className="lei-meta-label">Location</div>
            <div className="lei-meta-value" style={{ fontSize: 11, color: 'var(--le-blue)' }}>
              {incident.location_name || (Number.isFinite(Number(incident.latitude))
                ? `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}`
                : 'Unknown')}
            </div>
          </div>
        </div>

        {/* Workflow */}
        <div style={{ marginBottom: 24 }}>
          <div className="lei-section-label">Status Workflow</div>
          <div className="lei-workflow-steps">
            {WORKFLOW_STEPS.map((step, i) => {
              const isDone = currentStepIndex >= i
              const isCurrent = currentStepIndex + 1 === i
              return (
                <div key={step.id} className={`lei-workflow-step${isDone ? ' done' : ''}`}>
                  <div className={`lei-step-circle${isDone ? ' done' : isCurrent ? ' current' : ''}`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <div className={`lei-step-name${isDone ? ' done' : isCurrent ? ' current' : ''}`}>{step.label}</div>
                </div>
              )
            })}
          </div>

          <div className="lei-action-row">
            {isComplete ? (
              <span style={{ fontSize: 11, color: 'var(--le-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', paddingTop: 10 }}>Case closed.</span>
            ) : (
              <>
                {nextAction && (
                  <button className="lei-btn-primary" disabled={statusMutationPending} onClick={() => onRequestAction(incident, nextStatus)}>
                    <ArrowUpRight size={13} />
                    {nextAction.label}
                  </button>
                )}
                <button className="lei-btn-ghost" disabled>
                  <Flag size={12} />
                  Flag for Review
                </button>
                <button className="lei-btn-close" disabled={statusMutationPending} onClick={() => onRequestAction(incident, 'police_closed')}>
                  Close Case
                </button>
              </>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="lei-section-label">Incident Location</div>
        <div className="lei-map-container">
          <GoogleMapPanel
            markers={[{ id: `lei-${incident.id}`, lat: incident.latitude, lng: incident.longitude, title: incident.title }]}
            center={{ lat: incident.latitude, lng: incident.longitude }}
            zoom={15}
            height={220}
            autoFit={false}
            emptyMessage="No coordinates available."
          />
          {Number.isFinite(Number(incident.latitude)) && (
            <>
              <div style={{ position:'absolute', bottom:8, left:10, fontSize:9, color:'var(--le-muted)', fontVariantNumeric:'tabular-nums', background:'rgba(7,9,11,0.7)', padding:'2px 6px', zIndex:10 }}>
                {Number(incident.latitude).toFixed(6)}, {Number(incident.longitude).toFixed(6)}
              </div>
              <a href={openMapsUrl(incident.latitude, incident.longitude)} target="_blank" rel="noreferrer" className="lei-map-open-link">
                ↗ Open in Maps
              </a>
            </>
          )}
        </div>

        {/* Evidence */}
        {incident.photo_urls?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="lei-section-label">Evidence</div>
            <div className="lei-evidence-grid">
              {incident.photo_urls.map((url, i) => (
                <img key={`${url}-${i}`} src={url} alt="Evidence" className="lei-evidence-img" />
              ))}
            </div>
          </div>
        )}

        {/* Chain of custody */}
        <div style={{ marginTop: 24 }}>
          <div className="lei-section-label">Chain of Custody</div>
          {actionLog.length ? (
            actionLog.map((entry) => (
              <div key={entry.action_id} className="lei-custody-entry">
                <div className="lei-custody-action">{entry.action_type?.replace(/_/g, ' ')}</div>
                <div className="lei-custody-meta">{entry.moderator_name || 'System'} · {new Date(entry.timestamp).toLocaleString()}</div>
                {entry.notes && <div style={{ fontSize:11, color:'var(--le-text-dim)', marginTop:4 }}>{entry.notes}</div>}
              </div>
            ))
          ) : (
            <div style={{ fontSize:11, color:'var(--le-muted)' }}>No actions recorded.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── OpsMapView ────────────────────────────────────────────────────────────────

function OpsMapView({ incidents }) {
  const markers = incidents
    .filter((inc) => Number.isFinite(Number(inc.latitude)) && Number.isFinite(Number(inc.longitude)))
    .map((inc) => ({
      id: `ops-${inc.incident_id || inc.id}`,
      lat: inc.latitude,
      lng: inc.longitude,
      title: inc.title || `Incident #${inc.incident_id}`,
    }))

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'var(--le-bg)' }}>
      <div className="lei-ops-map-header">
        <div className="lei-ops-map-title">All Active Incidents — {markers.length} with coordinates</div>
        <div className="lei-ops-map-sub">Click a marker to select an incident in the Queue.</div>
      </div>
      <div style={{ flex:1, minHeight:0 }}>
        <GoogleMapPanel markers={markers} height="100%" autoFit showClusters={markers.length > 10} emptyMessage="No active incidents with coordinates." />
      </div>
    </div>
  )
}

// ─── ClosedCasesView ───────────────────────────────────────────────────────────

function ClosedCasesView() {
  const { data: closedIncidents = [], isLoading } = useQuery({
    queryKey: ['lei-incidents', 'police_closed'],
    queryFn: async () => {
      const result = await leiAPI.getAll({ status: 'police_closed' })
      return result.success ? result.data : []
    },
  })

  return (
    <div className="lei-closed-wrap">
      <div className="lei-section-label" style={{ marginBottom: 16 }}>Closed Cases ({closedIncidents.length})</div>
      <table className="lei-closed-table">
        <thead>
          <tr>
            <th>Incident</th><th>Sev</th><th>Reporter</th><th>Closed At</th><th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={5} style={{ textAlign:'center', padding:24 }}>Loading…</td></tr>
          ) : closedIncidents.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign:'center', padding:24 }}>No closed cases.</td></tr>
          ) : (
            closedIncidents.map((inc) => (
              <tr key={inc.incident_id}>
                <td>
                  <div className="lei-closed-title">{inc.title}</div>
                  <div style={{ fontSize:10, color:'var(--le-text-dim)', marginTop:2, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inc.description}</div>
                </td>
                <td><SeverityBadge severity={inc.severity} variant={SEVERITY_VARIANTS.LAW_ENFORCEMENT} display="initial" /></td>
                <td style={{ fontVariantNumeric:'tabular-nums' }}>{inc.username || 'Unknown'}</td>
                <td style={{ fontVariantNumeric:'tabular-nums' }}>{inc.updated_at ? new Date(inc.updated_at).toLocaleDateString() : '—'}</td>
                <td style={{ textTransform:'capitalize' }}>{inc.closure_outcome?.replace(/_/g, ' ') || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────

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
    const timeouts = toastTimeoutsRef.current
    return () => { timeouts.forEach(clearTimeout) }
  }, [])

  const pushToast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
    const duration = type === 'error' ? 5000 : 3200
    const tid = setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
    toastTimeoutsRef.current.push(tid)
  }

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
    const q = searchTerm.toLowerCase()
    return incidents
      .filter((inc) => {
        const t = (inc.title || '').toLowerCase()
        const d = (inc.description || '').toLowerCase()
        return t.includes(q) || d.includes(q)
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
      .map((inc) => ({ ...inc, id: inc.incident_id, reportedAt: inc.incident_date || inc.created_at }))
  }, [incidents, searchTerm, sortMode])

  useEffect(() => {
    if (!selectedIncidentId && filteredIncidents.length) {
      setSelectedIncidentId(filteredIncidents[0].id)
    }
  }, [filteredIncidents, selectedIncidentId])

  const selectedIncident = incidentDetail?.incident || filteredIncidents.find((inc) => inc.id === selectedIncidentId)
  const actionLog = incidentDetail?.actions || []

  const displayAlerts = useMemo(() => {
    const derived = allLeiIncidents
      .filter((inc) => ['critical', 'high'].includes(inc.severity) && inc.status === 'verified')
      .map((inc) => ({ incidentId: inc.incident_id, title: inc.title, severity: inc.severity, status: inc.status, latitude: inc.latitude, longitude: inc.longitude }))
    const combined = [...leiAlerts, ...derived]
    const seen = new Set()
    return combined.filter((a) => { const k = String(a.incidentId); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 8)
  }, [allLeiIncidents, leiAlerts])

  useEffect(() => {
    const statusById = new Map(allLeiIncidents.map((inc) => [String(inc.incident_id), inc.status]))
    setLeiAlerts((prev) => prev.filter((a) => { const s = statusById.get(String(a.incidentId)); return !s || s === 'verified' }))
  }, [allLeiIncidents])

  const hasFreshRealtimeAlert = typeof lastRealtimeAlertAt === 'number' && Date.now() - lastRealtimeAlertAt < 12000

  const runStatusUpdate = async (incident, status) => {
    if (!incident || !canTransitionTo(incident, status)) {
      pushToast(`Invalid transition from ${incident?.status} to ${status}.`, 'warning')
      return
    }
    const payload = status === 'police_closed'
      ? { status, closure_outcome: 'resolved_handled', closure_details: { case_id: null, officer_notes: 'Closed from LEI workflow' } }
      : { status }
    const result = await statusMutation.mutateAsync({ id: incident.incident_id || incident.id, payload })
    if (!result.success) { pushToast(result.error || `Failed to move to ${status}.`, 'error'); return }
    queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
    queryClient.invalidateQueries({ queryKey: ['lei-incidents-snapshot'] })
    queryClient.invalidateQueries({ queryKey: ['lei-incident', incident.incident_id || incident.id] })
    if (status !== 'verified') {
      const incId = incident.incident_id || incident.id
      setLeiAlerts((prev) => prev.filter((a) => String(a.incidentId) !== String(incId)))
    }
    pushToast(`Incident moved to ${formatStatusLabel(status)}.`)
  }

  const requestStatusUpdate = (incident, status) => {
    if (!incident || !status) return
    if (!canTransitionTo(incident, status)) { pushToast(`Invalid transition from ${incident.status} to ${status}.`, 'warning'); return }
    setPendingTransition({ incident, status })
  }

  const confirmPendingTransition = async () => {
    if (!pendingTransition || statusMutation.isPending) return
    await runStatusUpdate(pendingTransition.incident, pendingTransition.status)
    setPendingTransition(null)
  }

  const handleAlertDispatch = (alert) => {
    const match = filteredIncidents.find((inc) => String(inc.id) === String(alert.incidentId))
    const incident = match || { id: alert.incidentId, incident_id: alert.incidentId, status: alert.status }
    requestStatusUpdate(incident, 'dispatched')
  }

  const notifyCriticalAlert = async (payload) => {
    if (typeof Notification === 'undefined' || payload?.severity !== 'critical') return
    const show = () => { const n = new Notification('Critical LE Alert', { body: payload?.title || 'Immediate dispatch required.' }); n.onclick = () => window.focus() }
    if (Notification.permission === 'granted') { show(); return }
    if (Notification.permission === 'default' && !notificationPermissionRequestedRef.current) {
      notificationPermissionRequestedRef.current = true
      const perm = await Notification.requestPermission()
      if (perm === 'granted') show()
    }
  }

  useEffect(() => {
    if (user?.role !== 'law_enforcement' && user?.role !== 'admin') return
    const token = localStorage.getItem('moderator_token')
    if (!token) return
    const socket = io(SOCKET_URL, { auth: { token } })
    socket.on('lei_alert', (payload) => {
      if (payload?.status === 'verified') setLeiAlerts((prev) => [payload, ...prev].slice(0, 8))
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

  if (user?.role !== 'law_enforcement' && user?.role !== 'admin') {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <AlertTriangle size={48} style={{ margin: '0 auto 16px', color: '#F5A623' }} />
        <h2 style={{ fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#D9E4F0' }}>Access Restricted</h2>
        <p style={{ color: '#5C7390', marginTop: 8 }}>You do not have permission to view the Law Enforcement Interface.</p>
      </div>
    )
  }

  const pendingActionConfig = pendingTransition?.status ? STATUS_ACTION_CONFIG[pendingTransition.status] : null

  return (
    <>
      <style>{leStyles}</style>
      <div
        className="lei-root"
        style={{ display:'flex', flexDirection:'column', margin:'-32px', height:'100dvh', overflow:'hidden' }}
      >
        {/* Topbar */}
        <div className="lei-topbar">
          <div className="lei-topbar-title">
            <Shield size={16} style={{ color:'var(--le-blue)', flexShrink:0 }} />
            Law Enforcement Operations
          </div>
          <div className="lei-tab-bar">
            {VIEWS.map(({ id, label, Icon }) => (
              <button key={id} className={`lei-tab${activeView === id ? ' active' : ''}`} onClick={() => setActiveView(id)}>
                <Icon size={12} />{label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <div className="lei-live-indicator">
              <div className="lei-live-dot" style={{ background: hasFreshRealtimeAlert ? 'var(--le-amber)' : 'var(--le-green)' }} />
              <span style={{ color: hasFreshRealtimeAlert ? 'var(--le-amber)' : 'var(--le-green)' }}>Live</span>
              <Wifi size={12} style={{ color: hasFreshRealtimeAlert ? 'var(--le-amber)' : 'var(--le-green)' }} />
            </div>
          </div>
        </div>

        {/* Queue view */}
        {activeView === 'queue' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden' }}>
            <AlertBanner
              alerts={displayAlerts}
              onDispatch={handleAlertDispatch}
              statusMutationPending={statusMutation.isPending}
              onSelectIncident={setSelectedIncidentId}
            />
            <div className="lei-content">
              <IncidentQueuePanel
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
              <IncidentDetailPane
                incident={selectedIncident}
                actionLog={actionLog}
                statusMutationPending={statusMutation.isPending}
                onRequestAction={requestStatusUpdate}
              />
            </div>
          </div>
        )}

        {/* Map view */}
        {activeView === 'map' && (
          <div style={{ flex:1, minHeight:0 }}>
            <OpsMapView incidents={allLeiIncidents} />
          </div>
        )}

        {/* Closed cases */}
        {activeView === 'closed' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden', background:'var(--le-bg)' }}>
            <ClosedCasesView />
          </div>
        )}

        {/* Toast stack */}
        <div className="lei-toast-stack">
          {toasts.map((toast) => (
            <div key={toast.id} className={`lei-toast ${toast.type}`}>{toast.message}</div>
          ))}
        </div>
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
    </>
  )
}

export default LawEnforcement
