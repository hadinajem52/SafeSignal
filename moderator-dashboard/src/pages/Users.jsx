import React, { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../utils/dateUtils'

/* ─── Scoped styles ──────────────────────────────────────────────────────── */
const USERS_CSS = `
  .u-wrap { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; background: var(--color-bg); }

  /* KPI BAR */
  .u-kpi { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background: var(--color-border); border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
  .u-kpi-cell { background: var(--color-card); padding: 10px 18px; position: relative; }
  .u-kpi-cell::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; }
  .u-kpi-cell.ab-blue::before  { background: var(--color-primary); }
  .u-kpi-cell.ab-green::before { background: var(--color-success); }
  .u-kpi-cell.ab-red::before   { background: var(--color-error); }
  .u-kpi-cell.ab-amber::before { background: var(--color-warning); }
  .u-kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 4px; }
  .u-kpi-value { font-size: 22px; font-weight: 800; color: var(--color-text); line-height: 1; font-variant-numeric: tabular-nums; }

  /* TOPBAR */
  .u-topbar { border-bottom: 1px solid var(--color-border); padding: 0 24px; display: flex; align-items: center; background: var(--color-card); flex-shrink: 0; height: 52px; gap: 14px; }
  .u-topbar-title { font-weight: 800; font-size: 17px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--color-text); flex: 1; }
  .u-invite-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--color-primary); background: rgba(0,240,255,0.06); color: var(--color-primary); cursor: pointer; }
  .u-invite-btn:hover { background: rgba(0,240,255,0.12); }

  /* TOOLBAR */
  .u-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-bottom: 1px solid var(--color-border); background: var(--color-card); flex-shrink: 0; flex-wrap: wrap; }
  .u-search { background: var(--color-surface); border: 1px solid var(--color-border); display: flex; align-items: center; gap: 8px; padding: 7px 12px; flex: 1; min-width: 180px; max-width: 340px; }
  .u-search input { background: none; border: none; outline: none; color: var(--color-text); font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 500; flex: 1; }
  .u-search input::placeholder { color: var(--color-text-muted); }
  .u-search svg { color: var(--color-text-muted); flex-shrink: 0; }
  .u-select { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600; padding: 7px 10px; outline: none; cursor: pointer; appearance: none; }
  .u-filter-btn { display: flex; align-items: center; gap: 5px; padding: 6px 12px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--color-border); background: none; color: var(--color-text-muted); cursor: pointer; transition: all 0.1s; }
  .u-filter-btn:hover { color: var(--color-text); border-color: var(--color-text-muted); }
  .u-filter-btn.active { background: rgba(0,240,255,0.06); border-color: var(--color-primary); color: var(--color-primary); }
  .u-count { font-size: 11px; font-weight: 600; color: var(--color-text-muted); font-variant-numeric: tabular-nums; margin-left: auto; white-space: nowrap; }

  /* PANELS */
  .u-panels { display: grid; grid-template-columns: 420px 1fr; flex: 1; overflow: hidden; min-height: 0; }

  /* LIST */
  .u-list-panel { border-right: 1px solid var(--color-border); display: flex; flex-direction: column; overflow: hidden; }
  .u-list-header { display: grid; grid-template-columns: 1fr 72px 80px 64px; padding: 8px 16px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
  .u-col-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--color-text-muted); }
  .u-list { flex: 1; overflow-y: auto; }
  .u-list::-webkit-scrollbar { width: 3px; }
  .u-list::-webkit-scrollbar-thumb { background: var(--color-border); }
  .u-row { display: grid; grid-template-columns: 1fr 72px 80px 64px; padding: 11px 16px; border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background 0.1s; align-items: center; }
  .u-row:hover { background: var(--color-surface); }
  .u-row.sel { background: rgba(0,240,255,0.04); border-left: 2px solid var(--color-primary); padding-left: 14px; }
  .u-row.susp { opacity: 0.55; }

  .u-avatar { width: 28px; height: 28px; border: 1.5px solid; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--color-text-muted); background: var(--color-surface); flex-shrink: 0; text-transform: uppercase; }
  .u-user-info { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .u-name-block { min-width: 0; }
  .u-name { font-size: 12px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .u-email { font-size: 10px; font-weight: 500; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }

  .u-role-chip { font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 6px; border: 1px solid var(--color-border); color: var(--color-text-muted); }
  .u-role-chip.moderator { border-color: var(--color-primary); color: var(--color-primary); }
  .u-role-chip.admin     { border-color: var(--color-warning); color: var(--color-warning); }
  .u-role-chip.le        { border-color: var(--color-success); color: var(--color-success); }

  .u-status-chip { font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 6px; border: 1px solid; display: inline-flex; align-items: center; }
  .u-status-chip.active    { border-color: var(--color-success); color: var(--color-success); background: rgba(0,240,255,0.06); }
  .u-status-chip.suspended { border-color: var(--color-error); color: var(--color-error); background: rgba(255,51,51,0.06); }

  .u-rep-count { font-size: 12px; font-weight: 700; color: var(--color-text); font-variant-numeric: tabular-nums; text-align: right; }
  .u-rep-verif { font-size: 9px; font-weight: 600; color: var(--color-text-muted); font-variant-numeric: tabular-nums; margin-top: 1px; text-align: right; }

  /* DETAIL */
  .u-detail { display: flex; flex-direction: column; overflow: hidden; background: var(--color-bg); }
  .u-detail-bar { display: flex; align-items: center; gap: 10px; padding: 0 20px; height: 52px; border-bottom: 1px solid var(--color-border); background: var(--color-card); flex-shrink: 0; }
  .u-detail-name { font-weight: 800; font-size: 14px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--color-text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .u-act-btn { display: flex; align-items: center; gap: 5px; padding: 5px 12px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--color-border); background: none; color: var(--color-text-muted); cursor: pointer; transition: all 0.1s; white-space: nowrap; }
  .u-act-btn:hover { color: var(--color-text); border-color: var(--color-text-muted); }
  .u-act-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .u-act-btn.promote:hover { border-color: var(--color-primary); color: var(--color-primary); }
  .u-act-btn.suspend:hover { border-color: var(--color-error); color: var(--color-error); }
  .u-act-btn.restore:hover { border-color: var(--color-success); color: var(--color-success); }

  .u-detail-scroll { flex: 1; overflow-y: auto; padding: 20px; }
  .u-detail-scroll::-webkit-scrollbar { width: 3px; }
  .u-detail-scroll::-webkit-scrollbar-thumb { background: var(--color-border); }

  /* SECTION DIVIDER */
  .u-sec-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; margin-top: 4px; }
  .u-sec-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); white-space: nowrap; }
  .u-sec-line { flex: 1; height: 1px; background: var(--color-border); }

  /* PROFILE BLOCK */
  .u-profile { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--color-surface); border: 1px solid var(--color-border); margin-bottom: 20px; }
  .u-profile-avatar { width: 48px; height: 48px; border: 1.5px solid; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; background: var(--color-card); flex-shrink: 0; text-transform: uppercase; }
  .u-profile-name { font-size: 17px; font-weight: 800; letter-spacing: 0.01em; color: var(--color-text); line-height: 1.15; }
  .u-profile-email { font-size: 11px; font-weight: 500; color: var(--color-text-muted); margin-top: 3px; }
  .u-profile-chips { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }

  /* META GRID */
  .u-meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--color-border); margin-bottom: 20px; }
  .u-meta-cell { padding: 11px 14px; border-right: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
  .u-meta-cell:nth-child(even) { border-right: none; }
  .u-meta-cell:nth-last-child(-n+2) { border-bottom: none; }
  .u-meta-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin-bottom: 4px; }
  .u-meta-val { font-size: 13px; font-weight: 600; color: var(--color-text); font-variant-numeric: tabular-nums; }

  /* SIGNAL */
  .u-signal { border: 1px solid var(--color-border); margin-bottom: 20px; }
  .u-signal-hdr { padding: 10px 14px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; }
  .u-signal-pct { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
  .u-signal-bars { display: flex; gap: 3px; padding: 14px; align-items: flex-end; height: 72px; }
  .u-signal-bar { flex: 1; }
  .u-signal-warn { padding: 10px 14px; border-top: 1px solid var(--color-border); background: rgba(255,51,51,0.04); display: flex; gap: 6px; align-items: center; }

  /* TIMELINE */
  .u-tl { background: var(--color-card); border: 1px solid var(--color-border); padding: 0 14px; margin-bottom: 20px; }
  .u-tl-entry { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
  .u-tl-entry:last-child { border-bottom: none; }
  .u-tl-dot-col { display: flex; flex-direction: column; align-items: center; padding-top: 2px; }
  .u-tl-dot { width: 7px; height: 7px; border-radius: 50%; border: 1.5px solid; flex-shrink: 0; }
  .u-tl-line { width: 1px; flex: 1; background: var(--color-border); margin-top: 3px; min-height: 10px; }
  .u-tl-text { font-size: 11px; font-weight: 600; color: var(--color-text); }
  .u-tl-meta { font-size: 10px; font-weight: 500; color: var(--color-text-muted); margin-top: 1px; font-variant-numeric: tabular-nums; }

  /* EMPTY */
  .u-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px; color: var(--color-text-muted); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }

  /* ALERT DIALOG OVERLAY */
  .u-dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 50; }
  .u-dialog { background: var(--color-card); border: 1px solid var(--color-border); width: 100%; max-width: 420px; }
  .u-dialog-hdr { padding: 20px 20px 0; }
  .u-dialog-title { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.01em; color: var(--color-text); margin-bottom: 8px; }
  .u-dialog-desc { font-size: 13px; color: var(--color-text-muted); line-height: 1.6; }
  .u-dialog-body { padding: 16px 20px; }
  .u-dialog-select-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 6px; }
  .u-dialog-select { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600; padding: 8px 10px; outline: none; cursor: pointer; appearance: none; width: 100%; }
  .u-dialog-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 0 20px 20px; }
  .u-dialog-cancel { background: none; border: 1px solid var(--color-border); color: var(--color-text-muted); font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; padding: 8px 16px; cursor: pointer; }
  .u-dialog-cancel:hover { border-color: var(--color-text-muted); color: var(--color-text); }
  .u-dialog-confirm { border: none; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; padding: 8px 20px; cursor: pointer; }
  .u-dialog-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
  .u-dialog-confirm.blue { background: var(--color-primary); color: #000; }
  .u-dialog-confirm.red  { background: var(--color-error); color: #fff; }

  /* ERROR BANNER */
  .u-err { padding: 8px 14px; background: rgba(255,51,51,0.08); border: 1px solid var(--color-error); font-size: 11px; font-weight: 600; color: var(--color-error); margin-bottom: 12px; }

  /* LOADING */
  .u-loading { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
`

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
}

function calcAccuracy(verified, total) {
  if (!total) return 0
  return Math.round((verified / total) * 100)
}

function accuracyColor(pct) {
  if (pct >= 75) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
}

function isLowSignal(u) {
  const acc = calcAccuracy(u.verifiedReports, u.totalReports)
  return acc < 30 && u.totalReports > 2
}

function roleChipClass(role) {
  if (role === 'moderator') return 'moderator'
  if (role === 'admin') return 'admin'
  if (role === 'law_enforcement') return 'le'
  return ''
}

function roleLabel(role) {
  if (role === 'law_enforcement') return 'LE'
  return role
}

function buildTimeline(u) {
  const events = []
  events.push({ text: 'Account created', meta: formatDate(u.joinedDate), color: 'var(--color-text-muted)' })
  if (u.totalReports > 0) {
    events.push({
      text: `${u.totalReports} report${u.totalReports !== 1 ? 's' : ''} submitted`,
      meta: `Since joining`,
      color: 'var(--color-primary)',
    })
  }
  if (u.verifiedReports > 0) {
    events.push({
      text: `${u.verifiedReports} report${u.verifiedReports !== 1 ? 's' : ''} verified`,
      meta: `Signal quality: ${calcAccuracy(u.verifiedReports, u.totalReports)}%`,
      color: 'var(--color-success)',
    })
  }
  if (u.rejectedReports > 0) {
    events.push({
      text: `${u.rejectedReports} report${u.rejectedReports !== 1 ? 's' : ''} rejected`,
      meta: '',
      color: 'var(--color-error)',
    })
  }
  if (u.isSuspended) {
    events.push({ text: 'Account suspended', meta: '', color: 'var(--color-error)' })
  }
  return events
}

/* ─── Signal bars ────────────────────────────────────────────────────────── */
function SignalBars({ accuracy, total }) {
  const count = Math.min(Math.max(total, 1), 8)
  return (
    <div className="u-signal-bars">
      {Array.from({ length: count }, (_, i) => {
        const threshold = count === 1 ? 0 : (i / (count - 1)) * 100
        const filled = threshold <= accuracy
        return (
          <div
            key={i}
            className="u-signal-bar"
            style={{
              height: `${30 + (i / count) * 70}%`,
              background: filled ? accuracyColor(accuracy) : 'var(--color-border)',
              opacity: filled ? 0.85 : 1,
            }}
          />
        )
      })}
    </div>
  )
}

/* ─── Alert Dialog ───────────────────────────────────────────────────────── */
function AlertDialog({ open, onClose, title, description, children, confirmLabel, onConfirm, confirmVariant = 'blue', confirmDisabled = false }) {
  if (!open) return null
  return (
    <div className="u-dialog-overlay" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="u-dialog">
        <div className="u-dialog-hdr">
          <div className="u-dialog-title">{title}</div>
          <div className="u-dialog-desc">{description}</div>
        </div>
        {children && <div className="u-dialog-body">{children}</div>}
        <div className="u-dialog-foot">
          <button className="u-dialog-cancel" onClick={onClose}>Cancel</button>
          <button
            className={`u-dialog-confirm ${confirmVariant}`}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)
const IconWarn = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconUp = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
)
const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IconMail = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

/* ─── Main component ─────────────────────────────────────────────────────── */
function Users() {
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'admin'

  const ensureSuccess = (result, msg) => {
    if (result.success) return result.data
    throw new Error(result.error || msg)
  }

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [promoteRole, setPromoteRole] = useState('moderator')
  const [suspendDialog, setSuspendDialog] = useState(false)
  const [promoteDialog, setPromoteDialog] = useState(false)
  const [actionError, setActionError] = useState('')

  const queryClient = useQueryClient()

  const { data: users = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => ensureSuccess(await usersAPI.getAll(), 'Failed to load users'),
  })

  const suspendMutation = useMutation({
    mutationFn: async (id) => ensureSuccess(await usersAPI.suspend(id), 'Failed to suspend user'),
    onSuccess: () => {
      setActionError('')
      setSuspendDialog(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => setActionError(err.message || 'Failed to suspend user'),
  })

  const unsuspendMutation = useMutation({
    mutationFn: async (id) => ensureSuccess(await usersAPI.unsuspend(id), 'Failed to unsuspend user'),
    onSuccess: () => {
      setActionError('')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => setActionError(err.message || 'Failed to unsuspend user'),
  })

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }) => ensureSuccess(await usersAPI.updateRole(id, role), 'Failed to update role'),
    onSuccess: () => {
      setActionError('')
      setPromoteDialog(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => setActionError(err.message || 'Failed to update role'),
  })

  // Reset per-user state when selection changes
  useEffect(() => {
    if (selectedId) {
      setActionError('')
      const u = users.find(x => x.id === selectedId)
      if (u) setPromoteRole(u.role === 'citizen' ? 'moderator' : u.role)
    }
  }, [selectedId, users])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter === 'active' && u.isSuspended) return false
    if (statusFilter === 'suspended' && !u.isSuspended) return false
    return true
  })

  const selected = users.find(u => u.id === selectedId) ?? null

  const kpis = {
    total:     users.length,
    active:    users.filter(u => !u.isSuspended).length,
    suspended: users.filter(u => u.isSuspended).length,
    mods:      users.filter(u => u.role === 'moderator' || u.role === 'admin' || u.role === 'law_enforcement').length,
    lowSignal: users.filter(u => isLowSignal(u)).length,
  }

  return (
    <>
      <style>{USERS_CSS}</style>
      <div className="u-wrap">

        {/* TOPBAR */}
        <div className="u-topbar">
          <div className="u-topbar-title">Users Management</div>
          <button className="u-invite-btn">
            <IconMail /> Invite User
          </button>
        </div>

        {/* KPI BAR */}
        <div className="u-kpi">
          <div className="u-kpi-cell ab-blue">
            <div className="u-kpi-label">Total Users</div>
            <div className="u-kpi-value">{kpis.total}</div>
          </div>
          <div className="u-kpi-cell ab-green">
            <div className="u-kpi-label">Active</div>
            <div className="u-kpi-value">{kpis.active}</div>
          </div>
          <div className="u-kpi-cell ab-red">
            <div className="u-kpi-label">Suspended</div>
            <div className="u-kpi-value">{kpis.suspended}</div>
          </div>
          <div className="u-kpi-cell ab-amber">
            <div className="u-kpi-label">Staff / Mods</div>
            <div className="u-kpi-value">{kpis.mods}</div>
          </div>
          <div className="u-kpi-cell ab-red">
            <div className="u-kpi-label">Low Signal ⚠</div>
            <div className="u-kpi-value">{kpis.lowSignal}</div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="u-toolbar">
          <div className="u-search">
            <IconSearch />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="u-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="citizen">Citizen</option>
            <option value="moderator">Moderator</option>
            <option value="law_enforcement">Law Enforcement</option>
            <option value="admin">Admin</option>
          </select>
          {['all', 'active', 'suspended'].map(s => (
            <button
              key={s}
              className={`u-filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="u-count">{filtered.length} users</div>
        </div>

        {/* PANELS */}
        <div className="u-panels">

          {/* USER LIST */}
          <div className="u-list-panel">
            <div className="u-list-header">
              <div className="u-col-lbl">User</div>
              <div className="u-col-lbl">Role</div>
              <div className="u-col-lbl">Status</div>
              <div className="u-col-lbl" style={{ textAlign: 'right' }}>Reports</div>
            </div>
            <div className="u-list">
              {isLoading && <div className="u-loading">Loading users…</div>}
              {isError && (
                <div className="u-loading" style={{ flexDirection: 'column', gap: 12 }}>
                  <span style={{ color: 'var(--color-error)' }}>{error?.message || 'Failed to load users'}</span>
                  <button className="u-act-btn" onClick={() => refetch()}>Retry</button>
                </div>
              )}
              {!isLoading && !isError && filtered.length === 0 && (
                <div className="u-loading">No users found</div>
              )}
              {!isLoading && !isError && filtered.map(u => {
                const accuracy = calcAccuracy(u.verifiedReports, u.totalReports)
                const borderColor = u.totalReports === 0
                  ? 'var(--color-border)'
                  : accuracyColor(accuracy)
                return (
                  <div
                    key={u.id}
                    className={`u-row ${selectedId === u.id ? 'sel' : ''} ${u.isSuspended ? 'susp' : ''}`}
                    onClick={() => setSelectedId(u.id)}
                  >
                    <div className="u-user-info">
                      <div className="u-avatar" style={{ borderColor }}>
                        {getInitials(u.name)}
                      </div>
                      <div className="u-name-block">
                        <div className="u-name">{u.name}</div>
                        <div className="u-email">{u.email}</div>
                      </div>
                    </div>
                    <div>
                      <span className={`u-role-chip ${roleChipClass(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                    </div>
                    <div>
                      <span className={`u-status-chip ${u.isSuspended ? 'suspended' : 'active'}`}>
                        {u.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </div>
                    <div>
                      <div className="u-rep-count">{u.totalReports}</div>
                      <div className="u-rep-verif">{u.verifiedReports}✓</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* DETAIL PANEL */}
          {selected ? (() => {
            const accuracy = calcAccuracy(selected.verifiedReports, selected.totalReports)
            const avatarColor = selected.totalReports === 0 ? 'var(--color-text-muted)' : accuracyColor(accuracy)
            const timeline = buildTimeline(selected)
            const lowSignal = isLowSignal(selected)
            return (
              <div className="u-detail">
                {/* Header bar */}
                <div className="u-detail-bar">
                  <div className="u-detail-name">{selected.name}</div>
                  {isAdmin && (
                    <button className="u-act-btn promote" onClick={() => setPromoteDialog(true)}>
                      <IconUp /> Promote
                    </button>
                  )}
                  {isAdmin && (
                    selected.isSuspended ? (
                      <button
                        className="u-act-btn restore"
                        disabled={unsuspendMutation.isPending}
                        onClick={() => unsuspendMutation.mutate(selected.id)}
                      >
                        <IconCheck /> {unsuspendMutation.isPending ? 'Restoring…' : 'Restore'}
                      </button>
                    ) : (
                      <button className="u-act-btn suspend" onClick={() => setSuspendDialog(true)}>
                        <IconWarn /> Suspend
                      </button>
                    )
                  )}
                </div>

                <div className="u-detail-scroll">
                  {actionError && <div className="u-err">{actionError}</div>}

                  {/* Profile */}
                  <div className="u-profile">
                    <div className="u-profile-avatar" style={{ borderColor: avatarColor, color: avatarColor }}>
                      {getInitials(selected.name)}
                    </div>
                    <div>
                      <div className="u-profile-name">{selected.name}</div>
                      <div className="u-profile-email">{selected.email}</div>
                      <div className="u-profile-chips">
                        <span className={`u-role-chip ${roleChipClass(selected.role)}`}>
                          {roleLabel(selected.role)}
                        </span>
                        <span className={`u-status-chip ${selected.isSuspended ? 'suspended' : 'active'}`}>
                          {selected.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                        {lowSignal && (
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 6px', border: '1px solid var(--color-error)', color: 'var(--color-error)', background: 'rgba(255,51,51,0.08)' }}>
                            ⚠ Low Signal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="u-sec-row">
                    <div className="u-sec-title">Account Details</div>
                    <div className="u-sec-line" />
                  </div>
                  <div className="u-meta-grid">
                    <div className="u-meta-cell">
                      <div className="u-meta-lbl">Joined</div>
                      <div className="u-meta-val">{formatDate(selected.joinedDate)}</div>
                    </div>
                    <div className="u-meta-cell">
                      <div className="u-meta-lbl">Role</div>
                      <div className="u-meta-val" style={{ textTransform: 'capitalize' }}>{selected.role.replace('_', ' ')}</div>
                    </div>
                    <div className="u-meta-cell">
                      <div className="u-meta-lbl">Total Reports</div>
                      <div className="u-meta-val">{selected.totalReports}</div>
                    </div>
                    <div className="u-meta-cell">
                      <div className="u-meta-lbl">Verified Reports</div>
                      <div className="u-meta-val" style={{ color: 'var(--color-success)' }}>{selected.verifiedReports}</div>
                    </div>
                  </div>

                  {/* Signal Quality */}
                  <div className="u-sec-row">
                    <div className="u-sec-title">Signal Quality</div>
                    <div className="u-sec-line" />
                  </div>
                  <div className="u-signal">
                    <div className="u-signal-hdr">
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Report Accuracy</div>
                        <div className="u-signal-pct" style={{ color: accuracyColor(accuracy) }}>{accuracy}%</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Verified / Total</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                          {selected.verifiedReports}
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>/{selected.totalReports}</span>
                        </div>
                      </div>
                    </div>
                    <SignalBars accuracy={accuracy} total={selected.totalReports} />
                    {lowSignal && (
                      <div className="u-signal-warn">
                        <IconWarn />
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-error)' }}>
                          0% accuracy with {selected.totalReports} submissions — consider suspending to prevent queue noise.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Activity Timeline */}
                  <div className="u-sec-row">
                    <div className="u-sec-title">Account Activity</div>
                    <div className="u-sec-line" />
                  </div>
                  <div className="u-tl">
                    {timeline.map((ev, i) => (
                      <div key={i} className="u-tl-entry">
                        <div className="u-tl-dot-col">
                          <div className="u-tl-dot" style={{ background: ev.color, borderColor: ev.color }} />
                          {i < timeline.length - 1 && <div className="u-tl-line" />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: 4 }}>
                          <div className="u-tl-text">{ev.text}</div>
                          {ev.meta && <div className="u-tl-meta">{ev.meta}</div>}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            )
          })() : (
            <div className="u-detail">
              <div className="u-empty">
                <IconUsers />
                Select a user to view details
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUSPEND DIALOG */}
      {selected && (
        <AlertDialog
          open={suspendDialog}
          onClose={() => { setSuspendDialog(false); setActionError('') }}
          title="Suspend Account"
          description={`Suspend ${selected.name}? They will lose access immediately and all pending reports will be flagged for manual review. This action is logged.`}
          confirmLabel={suspendMutation.isPending ? 'Suspending…' : 'Confirm Suspend'}
          confirmVariant="red"
          confirmDisabled={suspendMutation.isPending}
          onConfirm={() => suspendMutation.mutate(selected.id)}
        />
      )}

      {/* PROMOTE DIALOG */}
      {selected && (
        <AlertDialog
          open={promoteDialog}
          onClose={() => { setPromoteDialog(false); setActionError('') }}
          title="Change Role"
          description={`Change role for ${selected.name}. This grants or revokes elevated permissions.`}
          confirmLabel={roleMutation.isPending ? 'Saving…' : 'Confirm'}
          confirmVariant="blue"
          confirmDisabled={roleMutation.isPending || promoteRole === selected.role}
          onConfirm={() => roleMutation.mutate({ id: selected.id, role: promoteRole })}
        >
          <div className="u-dialog-select-lbl">New Role</div>
          <select
            className="u-dialog-select"
            value={promoteRole}
            onChange={e => setPromoteRole(e.target.value)}
          >
            <option value="moderator">Moderator</option>
            <option value="law_enforcement">Law Enforcement</option>
            <option value="admin">Admin</option>
            <option value="citizen">Citizen (demote)</option>
          </select>
        </AlertDialog>
      )}
    </>
  )
}

export default Users
