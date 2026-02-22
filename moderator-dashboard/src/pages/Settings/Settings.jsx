import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import LoadingState from '../../components/LoadingState'
import { useAuth } from '../../context/AuthContext'
import { settingsAPI } from '../../services/api'
import { applyDarkMode, persistDarkMode } from '../../utils/theme'
import ConfirmDialog from '../../components/ConfirmDialog'

/* ─── Scoped CSS ─────────────────────────────────────────────────────────────── */
const CSS = `
  .st-container { display:flex; flex-direction:column; height:100%; overflow:hidden; background:var(--color-bg); }

  .st-topbar {
    border-bottom:1px solid var(--color-border);
    padding:0 24px; display:flex; align-items:center; height:52px;
    background:var(--color-card); flex-shrink:0; gap:16px;
  }
  .st-topbar-title {
    font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; font-size:17px;
    letter-spacing:0.06em; text-transform:uppercase; color:var(--color-text);
  }

  .st-body { display:flex; flex:1; overflow:hidden; min-height:0; }

  .st-snav {
    width:204px; border-right:1px solid var(--color-border);
    padding:16px 0; overflow-y:auto; flex-shrink:0; background:var(--color-card);
  }
  .st-snav-group { padding:10px 0 4px; }
  .st-snav-group-label {
    font-size:9px; font-weight:700; text-transform:uppercase;
    letter-spacing:0.06em; color:var(--color-text-muted); padding:0 16px 6px;
    display:block;
  }
  .st-snav-item {
    display:flex; align-items:center; gap:9px; padding:8px 16px;
    font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; font-weight:600;
    color:var(--color-text-muted); cursor:pointer; border:none; background:none;
    border-left:2px solid transparent; width:100%; text-align:left;
    transition:color 0.1s, background 0.1s, border-left-color 0.1s;
  }
  .st-snav-item:hover { color:var(--color-text); background:var(--color-surface); }
  .st-snav-item.active {
    color:var(--color-primary); border-left-color:var(--color-primary);
    background:rgba(0,240,255,0.04);
  }

  .st-scroll { flex:1; overflow-y:auto; padding:24px; }
  .st-scroll::-webkit-scrollbar { width:3px; }
  .st-scroll::-webkit-scrollbar-thumb { background:var(--color-border); }

  .st-sec-head { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .st-sec-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); white-space:nowrap; }
  .st-sec-line { flex:1; height:1px; background:var(--color-border); }
  .st-section { margin-bottom:28px; }

  .st-block { background:var(--color-card); border:1px solid var(--color-border); overflow:hidden; margin-bottom:1px; }
  .st-row { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; gap:24px; }
  .st-row+.st-row { border-top:1px solid var(--color-border); }
  .st-label { font-size:13px; font-weight:600; color:var(--color-text); margin-bottom:2px; }
  .st-desc { font-size:11px; font-weight:500; color:var(--color-text-muted); line-height:1.5; }
  .st-ctrl { flex-shrink:0; display:flex; align-items:center; gap:10px; }

  /* Square Toggle */
  .sq-wrap { position:relative; width:38px; height:20px; cursor:pointer; flex-shrink:0; }
  .sq-wrap input { opacity:0; width:0; height:0; position:absolute; }
  .sq-track {
    position:absolute; inset:0; border:1px solid var(--color-border);
    background:var(--color-surface); transition:background 0.15s, border-color 0.15s;
  }
  .sq-wrap input:checked + .sq-track { background:var(--color-primary); border-color:var(--color-primary); }
  .sq-thumb {
    position:absolute; top:3px; left:3px; width:12px; height:12px;
    background:var(--color-text-muted); transition:transform 0.15s, background 0.15s;
    pointer-events:none;
  }
  .sq-wrap input:checked ~ .sq-thumb { transform:translateX(18px); background:#000; }
  .sq-wrap:has(input:disabled) { cursor:not-allowed; opacity:.55; }

  .st-select {
    background:var(--color-surface); border:1px solid var(--color-border);
    color:var(--color-text); font-family:'Plus Jakarta Sans',sans-serif;
    font-size:12px; font-weight:600; padding:6px 10px; outline:none; cursor:pointer;
    appearance:none; min-width:140px;
  }
  .st-select:focus { border-color:var(--color-primary); }
  .st-input {
    background:var(--color-surface); border:1px solid var(--color-border);
    color:var(--color-text); font-family:'Plus Jakarta Sans',sans-serif;
    font-size:12px; font-weight:500; padding:6px 10px; outline:none; flex:1; min-width:0;
  }
  .st-input:focus { border-color:var(--color-primary); }
  .st-input::placeholder { color:var(--color-text-muted); }
  .st-input.mono { font-family:'IBM Plex Mono',monospace; font-size:12px; }
  .st-input-row { display:flex; gap:8px; align-items:center; margin-top:8px; }

  .st-btn {
    display:flex; align-items:center; gap:5px; padding:6px 12px;
    font-family:'Plus Jakarta Sans',sans-serif; font-size:10px; font-weight:700;
    letter-spacing:0.04em; text-transform:uppercase; cursor:pointer;
    transition:all 0.12s; white-space:nowrap; border:none;
  }
  .st-btn:disabled { opacity:.5; cursor:not-allowed; }
  .st-btn-ghost { border:1px solid var(--color-border) !important; background:none; color:var(--color-text-muted); }
  .st-btn-ghost:hover:not(:disabled) { color:var(--color-text); border-color:var(--color-text-muted) !important; }
  .st-btn-primary { border:1.5px solid var(--color-primary) !important; background:rgba(0,240,255,0.06); color:var(--color-primary); }
  .st-btn-primary:hover:not(:disabled) { background:var(--color-primary); color:#000; }
  .st-btn-danger { border:1.5px solid var(--color-error) !important; background:rgba(229,72,77,0.06); color:var(--color-error); }
  .st-btn-danger:hover:not(:disabled) { background:var(--color-error); color:#fff; }
  .st-btn-warning { border:1.5px solid var(--color-warning) !important; background:rgba(245,166,35,0.06); color:var(--color-warning); }
  .st-btn-warning:hover:not(:disabled) { background:var(--color-warning); color:#000; }

  .st-profile-card {
    display:flex; align-items:center; gap:14px; padding:16px 18px;
    background:var(--color-card); border:1px solid var(--color-border); margin-bottom:1px;
  }
  .st-avatar {
    width:44px; height:44px; border:1.5px solid var(--color-primary);
    display:flex; align-items:center; justify-content:center;
    font-size:16px; font-weight:800; color:var(--color-primary);
    background:rgba(0,240,255,0.06); flex-shrink:0; font-family:'Plus Jakarta Sans',sans-serif;
  }
  .st-profile-name { font-size:15px; font-weight:800; color:var(--color-text); margin-bottom:2px; }
  .st-profile-role { font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--color-primary); }
  .st-profile-email { font-size:11px; font-weight:500; color:var(--color-text-muted); margin-top:2px; }
  .st-role-badge { font-size:10px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; border:1px solid var(--color-primary); padding:2px 8px; color:var(--color-primary); }

  .st-sev-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--color-border); border:1px solid var(--color-border); }
  .st-sev-cell { background:var(--color-card); padding:12px 14px; cursor:pointer; transition:background 0.1s; user-select:none; }
  .st-sev-cell:hover { background:var(--color-surface); }
  .st-sev-cell.active { background:var(--color-surface); }
  .st-sev-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
  .st-sev-dot { width:8px; height:8px; border-radius:50%; }
  .st-sev-name { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px; }
  .st-sev-desc { font-size:10px; font-weight:500; color:var(--color-text-muted); }

  .st-day-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; padding:14px 18px; border-top:1px solid var(--color-border); }
  .st-day-item { display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; }
  .st-day-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--color-text-muted); }
  .st-day-box { width:32px; height:32px; border:1px solid var(--color-border); display:flex; align-items:center; justify-content:center; transition:all 0.1s; background:var(--color-surface); font-size:12px; font-weight:700; }
  .st-day-box.on { border-color:var(--color-primary); background:rgba(0,240,255,0.08); color:var(--color-primary); }
  .st-day-box.off { color:var(--color-text-muted); }

  .st-key-block { background:var(--color-surface); border:1px solid var(--color-border); display:flex; align-items:center; gap:10px; padding:10px 14px; }
  .st-key-text { font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--color-text); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .st-session-row { display:flex; align-items:center; gap:12px; padding:11px 18px; border-top:1px solid var(--color-border); }
  .st-session-icon { width:28px; height:28px; border:1px solid var(--color-border); display:flex; align-items:center; justify-content:center; color:var(--color-text-muted); flex-shrink:0; }
  .st-session-device { font-size:12px; font-weight:600; color:var(--color-text); }
  .st-session-meta { font-size:10px; font-weight:500; color:var(--color-text-muted); margin-top:1px; }
  .st-session-current { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--color-success); border:1px solid var(--color-success); padding:1px 6px; }
  .st-session-revoke { margin-left:auto; display:flex; align-items:center; gap:4px; padding:4px 10px; font-family:'Plus Jakarta Sans',sans-serif; font-size:9px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; border:1px solid transparent; background:none; color:var(--color-text-muted); cursor:pointer; transition:all 0.1s; }
  .st-session-revoke:hover { border-color:var(--color-error); color:var(--color-error); }

  .st-toast { position:fixed; bottom:24px; right:24px; background:var(--color-card); border:1px solid var(--color-success); border-left:3px solid var(--color-success); padding:10px 16px; font-size:12px; font-weight:600; color:var(--color-success); display:flex; align-items:center; gap:8px; z-index:9999; animation:st-up 0.2s ease-out; pointer-events:none; font-family:'Plus Jakarta Sans',sans-serif; }
  .st-toast.error { border-color:var(--color-error); border-left-color:var(--color-error); color:var(--color-error); }
  .st-toast.warn { border-color:var(--color-warning); border-left-color:var(--color-warning); color:var(--color-warning); }
  @keyframes st-up { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

  .st-danger-card { border:1px solid rgba(229,72,77,0.22); background:rgba(229,72,77,0.025); margin-bottom:1px; }
  .st-danger-row { display:flex; align-items:center; gap:14px; padding:14px 18px; }
  .st-danger-title { font-size:12px; font-weight:700; color:var(--color-error); margin-bottom:2px; }
  .st-danger-desc { font-size:11px; font-weight:500; color:var(--color-text-muted); }

  .st-sys-grid { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--color-border); border:1px solid var(--color-border); }
  .st-sys-cell { background:var(--color-card); padding:14px 16px; }
  .st-sys-cell-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-text-muted); margin-bottom:4px; }
  .st-sys-cell-value { font-size:14px; font-weight:700; color:var(--color-text); }
  .st-sys-cell-value.ok { color:var(--color-success); }

  .st-slider-area { padding:10px 18px 14px; border-top:1px solid var(--color-border); }
  .st-slider-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-text-muted); margin-bottom:8px; display:flex; justify-content:space-between; }
  input[type=range].st-range { width:100%; height:2px; accent-color:var(--color-primary); background:var(--color-border); cursor:pointer; }
  .st-range-row { display:flex; justify-content:space-between; font-size:10px; font-weight:600; color:var(--color-text-muted); margin-top:6px; }

  .st-inset { border-top:1px solid var(--color-border); padding:14px 18px; background:var(--color-surface); }
  .st-inset-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-text-muted); margin-bottom:8px; }
  .st-col-row { display:flex; flex-direction:column; gap:8px; padding:14px 18px; }
  .st-col-row+.st-col-row { border-top:1px solid var(--color-border); }
`

/* ─── Icons ──────────────────────────────────────────────────────────────────── */
const IC = {
  user: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  bell: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  moon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  lock: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  key:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  admin:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  check:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  copy: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  eye:  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  refresh:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  send: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  monitor:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  phone:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  warn: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
}

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SEVERITIES = [
  { key: 'critical', label: 'Critical', color: 'var(--color-error)',        desc: 'All critical incidents' },
  { key: 'high',     label: 'High',     color: 'var(--color-warning)',      desc: 'High severity reports' },
  { key: 'medium',   label: 'Medium',   color: 'var(--color-primary)',      desc: 'Medium priority events' },
  { key: 'low',      label: 'Low',      color: 'var(--color-text-muted)',   desc: 'All activity' },
]

const NAV = [
  { id: 'profile',    label: 'Profile',       icon: IC.user },
  { id: 'notif',      label: 'Notifications', icon: IC.bell },
  { id: 'appearance', label: 'Appearance',    icon: IC.moon },
  { id: 'security',   label: 'Security',      icon: IC.lock },
  { id: 'system',     label: 'System',        icon: IC.admin },
]

/* ─── Utilities ──────────────────────────────────────────────────────────────── */
function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '??'
}
function loadLocalPrefs() {
  try { return JSON.parse(localStorage.getItem('settings_local_prefs') || '{}') } catch { return {} }
}
function saveLocalPrefs(prefs) {
  localStorage.setItem('settings_local_prefs', JSON.stringify(prefs))
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
function SqToggle({ checked, onChange, disabled, id }) {
  return (
    <label className="sq-wrap" htmlFor={id}>
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <div className="sq-track" />
      <div className="sq-thumb" />
    </label>
  )
}

function SettingRow({ label, desc, children, noBorderTop }) {
  return (
    <div className="st-row" style={noBorderTop ? { borderTop: 'none' } : {}}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="st-label">{label}</div>
        {desc && <div className="st-desc">{desc}</div>}
      </div>
      <div className="st-ctrl">{children}</div>
    </div>
  )
}

function SecHead({ title, meta }) {
  return (
    <div className="st-sec-head">
      <div className="st-sec-title">{title}</div>
      <div className="st-sec-line" />
      {meta && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{meta}</span>}
    </div>
  )
}

function Toast({ message, type = 'success' }) {
  return (
    <div className={`st-toast${type === 'error' ? ' error' : type === 'warn' ? ' warn' : ''}`}>
      {type === 'success' ? IC.check : IC.warn}
      {message}
    </div>
  )
}

/* ─── DEFAULT SETTINGS ───────────────────────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  emailNotifications: true,
  reportAlerts: true,
  weeklyDigest: false,
  darkMode: false,
  autoVerify: false,
  minConfidenceScore: 80,
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────────── */
function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()

  const [activeSection, setActiveSection] = useState('profile')
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  // Local prefs — not persisted to server
  const localPrefs = useMemo(() => loadLocalPrefs(), [])
  const [alertSeverities, setAlertSeverities] = useState(localPrefs.alertSeverities ?? ['critical', 'high'])
  const [digestDays, setDigestDays] = useState(localPrefs.digestDays ?? [0, 1, 2, 3, 4])
  const [digestFreq, setDigestFreq] = useState(localPrefs.digestFreq ?? 'weekly')
  const [density, setDensity] = useState(localPrefs.density ?? 'comfortable')
  const [dateFormat, setDateFormat] = useState(localPrefs.dateFormat ?? 'MM/DD/YYYY')
  const [timezone, setTimezone] = useState(localPrefs.timezone ?? 'Asia/Beirut')
  const [language, setLanguage] = useState(localPrefs.language ?? 'en')

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false)
  const [displayName, setDisplayName] = useState(user?.username ?? '')
  const [emailInput, setEmailInput] = useState(user?.email ?? '')

  // Security
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)

  // Confirm reset
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (user?.username) setDisplayName(user.username)
    if (user?.email) setEmailInput(user.email)
  }, [user])

  /* ── Fetch settings ──────────────────────────────────────────────────────── */
  const { isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboardSettings'],
    queryFn: async () => {
      const result = await settingsAPI.get()
      if (result.success) return result.data
      throw new Error(result.error)
    },
    onSuccess: (data) => {
      setSettings(data)
      if (typeof data.darkMode === 'boolean') {
        applyDarkMode(data.darkMode)
        persistDarkMode(data.darkMode)
      }
    },
  })

  const persistedSettings = queryClient.getQueryData(['dashboardSettings'])
  useEffect(() => {
    if (persistedSettings) {
      setSettings(persistedSettings)
      if (typeof persistedSettings.darkMode === 'boolean') {
        applyDarkMode(persistedSettings.darkMode)
        persistDarkMode(persistedSettings.darkMode)
      }
    }
  }, [persistedSettings])

  /* ── Toast ───────────────────────────────────────────────────────────────── */
  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => setToast(null), 3200)
  }, [])

  /* ── Mutations ───────────────────────────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: async (next) => {
      const result = await settingsAPI.update(next)
      if (result.success) return result.data
      throw new Error(result.error)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['dashboardSettings'], data)
      setSettings(data)
      showToast('Settings saved.')
    },
    onError: (err) => showToast(err.message || 'Failed to save settings.', 'error'),
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      const result = await settingsAPI.reset()
      if (result.success) return result.data
      throw new Error(result.error)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['dashboardSettings'], data)
      setSettings(data)
      if (typeof data.darkMode === 'boolean') { applyDarkMode(data.darkMode); persistDarkMode(data.darkMode) }
      showToast('Settings reset to defaults.')
    },
    onError: (err) => showToast(err.message || 'Failed to reset.', 'error'),
  })

  const digestMutation = useMutation({
    mutationFn: async () => {
      const result = await settingsAPI.sendWeeklyDigestNow()
      if (result.success) return result.data
      throw new Error(result.error)
    },
    onSuccess: (data) => showToast(`Digest sent. ${data?.summary?.total_reports ?? 0} reports.`),
    onError: (err) => showToast(err.message || 'Failed to send digest.', 'error'),
  })

  const darkModeMutation = useMutation({
    mutationFn: async (val) => {
      const result = await settingsAPI.update({ darkMode: val })
      if (result.success) return result.data
      throw new Error(result.error)
    },
    onMutate: async (val) => {
      await queryClient.cancelQueries({ queryKey: ['dashboardSettings'] })
      const prev = queryClient.getQueryData(['dashboardSettings'])
      queryClient.setQueryData(['dashboardSettings'], (c) => c ? { ...c, darkMode: val } : c)
      return { prev }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['dashboardSettings'], data)
      setSettings(data)
      applyDarkMode(data.darkMode)
      persistDarkMode(data.darkMode)
      showToast('Dark mode preference saved.')
    },
    onError: (err, _val, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['dashboardSettings'], ctx.prev)
        setSettings(ctx.prev)
        applyDarkMode(ctx.prev.darkMode)
        persistDarkMode(ctx.prev.darkMode)
      }
      showToast(err.message || 'Failed to update dark mode.', 'error')
    },
  })

  const isMutating = saveMutation.isPending || resetMutation.isPending || digestMutation.isPending || darkModeMutation.isPending

  /* ── Handlers ────────────────────────────────────────────────────────────── */
  function updateApiSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function persistLocalPref(key, value) {
    const p = loadLocalPrefs(); p[key] = value; saveLocalPrefs(p)
  }

  function handleDarkModeChange(val) {
    applyDarkMode(val); persistDarkMode(val)
    setSettings((p) => ({ ...p, darkMode: val }))
    darkModeMutation.mutate(val)
  }

  function toggleSeverity(key) {
    setAlertSeverities((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      persistLocalPref('alertSeverities', next)
      return next
    })
  }

  function toggleDay(i) {
    setDigestDays((prev) => {
      const next = prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort((a, b) => a - b)
      persistLocalPref('digestDays', next)
      return next
    })
  }

  function handleChangePassword(e) {
    e.preventDefault()
    if (!currentPw || !newPw || !confirmPw) { showToast('Please fill in all password fields.', 'warn'); return }
    if (newPw !== confirmPw) { showToast('New passwords do not match.', 'error'); return }
    if (newPw.length < 8) { showToast('Password must be at least 8 characters.', 'warn'); return }
    showToast('Password change is not available in this build.', 'warn')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
  }

  /* ── Member since ────────────────────────────────────────────────────────── */
  const memberSince = useMemo(() => {
    const raw = user?.createdAt || user?.created_at
    if (!raw) return '—'
    try { return new Date(raw).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }
    catch { return '—' }
  }, [user])

  /* ── Loading / error ─────────────────────────────────────────────────────── */
  if (isLoading) return <LoadingState />
  if (isError) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'var(--color-error)', marginBottom: 12 }}>{error?.message || 'Failed to load settings'}</p>
        <button className="st-btn st-btn-primary" onClick={() => refetch()}>Retry</button>
      </div>
    )
  }

  /* ── Section renderers ───────────────────────────────────────────────────── */
  function renderProfile() {
    const initials = getInitials(displayName || user?.username || '')
    return (
      <>
        <div className="st-section">
          <SecHead title="Profile" />
          <div className="st-profile-card">
            <div className="st-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="st-profile-name">{displayName || user?.username || 'Unknown'}</div>
              <div className="st-profile-role">{user?.role ?? 'moderator'}</div>
              <div className="st-profile-email">{user?.email ?? ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
              {editingProfile
                ? <button className="st-btn st-btn-primary" onClick={() => { setEditingProfile(false); showToast('Profile display updated.') }}>{IC.check} Save</button>
                : <button className="st-btn st-btn-ghost" onClick={() => setEditingProfile(true)}>Edit Profile</button>
              }
            </div>
          </div>

          <div className="st-block">
            <SettingRow label="Display Name" desc="Shown in audit logs and team views" noBorderTop>
              {editingProfile
                ? <input className="st-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ minWidth: 200 }} />
                : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{displayName || user?.username}</span>}
            </SettingRow>
            <SettingRow label="Email Address" desc="Used for notifications and login">
              {editingProfile
                ? <input className="st-input" type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={{ minWidth: 220 }} />
                : <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>{user?.email}</span>}
            </SettingRow>
            <SettingRow label="Account Role" desc="Assigned by admin — contact admin to change">
              <span className="st-role-badge">{user?.role ?? 'moderator'}</span>
            </SettingRow>
            <SettingRow label="Member Since" desc="Account creation date">
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>{memberSince}</span>
            </SettingRow>
          </div>
        </div>

        <div className="st-section">
          <SecHead title="Preferences" />
          <div className="st-block">
            <SettingRow label="Language" desc="Interface display language" noBorderTop>
              <select className="st-select" value={language} onChange={(e) => { setLanguage(e.target.value); persistLocalPref('language', e.target.value) }}>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="fr">French</option>
              </select>
            </SettingRow>
            <SettingRow label="Timezone" desc="Used for timestamps throughout the dashboard">
              <select className="st-select" value={timezone} onChange={(e) => { setTimezone(e.target.value); persistLocalPref('timezone', e.target.value) }}>
                <option value="Asia/Beirut">Asia/Beirut (GMT+3)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">America/New_York (GMT-5)</option>
                <option value="Europe/London">Europe/London (GMT+1)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
              </select>
            </SettingRow>
            <SettingRow label="Date Format" desc="Applied to all timestamps and exports">
              <select className="st-select" value={dateFormat} onChange={(e) => { setDateFormat(e.target.value); persistLocalPref('dateFormat', e.target.value) }}>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </SettingRow>
          </div>
        </div>
      </>
    )
  }

  function renderNotifications() {
    return (
      <>
        <div className="st-section">
          <SecHead title="Channels" />
          <div className="st-block">
            <SettingRow label="Email Notifications" desc="Receive email notifications for report updates" noBorderTop>
              <SqToggle id="notif-email" checked={settings.emailNotifications} onChange={(val) => updateApiSetting('emailNotifications', val)} disabled={isMutating} />
            </SettingRow>
            <SettingRow label="Report Alerts" desc="Get notified immediately for high-severity reports">
              <SqToggle id="notif-alerts" checked={settings.reportAlerts} onChange={(val) => updateApiSetting('reportAlerts', val)} disabled={isMutating} />
            </SettingRow>
            <SettingRow label="Browser Notifications" desc="Push notifications in supported browsers">
              <SqToggle id="notif-browser" checked={false} onChange={() => showToast('Browser notifications not yet supported.', 'warn')} />
            </SettingRow>
            <SettingRow label="Sound Alerts" desc="Play a sound for critical incident notifications">
              <SqToggle id="notif-sound" checked={false} onChange={() => showToast('Sound alerts not yet supported.', 'warn')} />
            </SettingRow>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="st-btn st-btn-primary" onClick={() => saveMutation.mutate(settings)} disabled={isMutating}>
              {IC.check} Save Channels
            </button>
          </div>
        </div>

        <div className="st-section">
          <SecHead title="Alert Severity Filter" meta="Tap to toggle" />
          <div className="st-sev-grid">
            {SEVERITIES.map((s) => {
              const active = alertSeverities.includes(s.key)
              return (
                <div key={s.key} className={`st-sev-cell${active ? ' active' : ''}`} onClick={() => toggleSeverity(s.key)}>
                  <div className="st-sev-top">
                    <div className="st-sev-dot" style={{ background: s.color, opacity: active ? 1 : 0.25 }} />
                    {active && <span style={{ color: s.color }}>{IC.check}</span>}
                  </div>
                  <div className="st-sev-name" style={{ color: active ? s.color : 'var(--color-text-muted)' }}>{s.label}</div>
                  <div className="st-sev-desc">{s.desc}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="st-section">
          <SecHead title="Weekly Digest" />
          <div className="st-block">
            <SettingRow label="Enable Weekly Digest" desc="Receive a weekly summary of moderation activity" noBorderTop>
              <SqToggle
                id="notif-digest"
                checked={settings.weeklyDigest}
                onChange={(val) => {
                  const next = { ...settings, weeklyDigest: val }
                  setSettings(next)
                  saveMutation.mutate(next)
                }}
                disabled={isMutating}
              />
            </SettingRow>
            <SettingRow label="Frequency" desc="How often to receive the digest">
              <select className="st-select" value={digestFreq} onChange={(e) => { setDigestFreq(e.target.value); persistLocalPref('digestFreq', e.target.value) }} disabled={!settings.weeklyDigest}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
              </select>
            </SettingRow>
            {settings.weeklyDigest && (
              <div className="st-day-grid">
                {DAYS.map((d, i) => {
                  const on = digestDays.includes(i)
                  return (
                    <div key={d} className="st-day-item" onClick={() => toggleDay(i)}>
                      <span className="st-day-label">{d}</span>
                      <div className={`st-day-box ${on ? 'on' : 'off'}`}>{on ? IC.check : <span style={{ fontSize: 10 }}>—</span>}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {settings.weeklyDigest && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="st-btn st-btn-ghost" onClick={() => digestMutation.mutate()} disabled={digestMutation.isPending}>
                {IC.send} {digestMutation.isPending ? 'Sending…' : 'Send Digest Now'}
              </button>
            </div>
          )}
        </div>
      </>
    )
  }

  function renderAppearance() {
    return (
      <>
        <div className="st-section">
          <SecHead title="Theme" />
          <div className="st-block">
            <SettingRow label="Dark Mode" desc="Use a dark interface theme across the dashboard" noBorderTop>
              <SqToggle id="app-dark" checked={settings.darkMode} onChange={handleDarkModeChange} disabled={darkModeMutation.isPending} />
            </SettingRow>
          </div>
        </div>

        <div className="st-section">
          <SecHead title="Display" />
          <div className="st-block">
            <SettingRow label="Density" desc="Control spacing and row height in tables and lists" noBorderTop>
              <select className="st-select" value={density} onChange={(e) => setDensity(e.target.value)}>
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </SettingRow>
            <SettingRow label="Date Format" desc="Applied to all timestamps and exports">
              <select className="st-select" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </SettingRow>
            <SettingRow label="Timezone" desc="Used for timestamps throughout the dashboard">
              <select className="st-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="Asia/Beirut">Asia/Beirut (GMT+3)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">America/New_York (GMT-5)</option>
                <option value="Europe/London">Europe/London (GMT+1)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
              </select>
            </SettingRow>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="st-btn st-btn-primary" onClick={() => { persistLocalPref('density', density); persistLocalPref('dateFormat', dateFormat); persistLocalPref('timezone', timezone); showToast('Appearance preferences saved.') }} disabled={isMutating}>
              {IC.check} Save Appearance
            </button>
          </div>
        </div>
      </>
    )
  }

  function renderSecurity() {
    return (
      <>
        <div className="st-section">
          <SecHead title="Change Password" />
          <div className="st-block">
            <div className="st-col-row">
              <div className="st-label">Current Password</div>
              <div className="st-input-row">
                <input className="st-input" type={showPw ? 'text' : 'password'} placeholder="Enter current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
              </div>
            </div>
            <div className="st-col-row">
              <div className="st-label">New Password</div>
              <div className="st-input-row">
                <input className="st-input" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              </div>
            </div>
            <div className="st-col-row">
              <div className="st-label">Confirm New Password</div>
              <div className="st-input-row">
                <input className="st-input" type={showPw ? 'text' : 'password'} placeholder="Repeat new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                <button className="st-btn st-btn-ghost" type="button" onClick={() => setShowPw((v) => !v)} style={{ padding: '6px 10px' }}>
                  {showPw ? IC.eyeOff : IC.eye}
                </button>
              </div>
            </div>
            <div className="st-row" style={{ justifyContent: 'flex-end' }}>
              <button className="st-btn st-btn-primary" onClick={handleChangePassword}>{IC.lock} Update Password</button>
            </div>
          </div>
        </div>

        <div className="st-section">
          <SecHead title="Two-Factor Authentication" />
          <div className="st-block">
            <SettingRow label="Enable 2FA" desc="Require a one-time code from your authenticator app at login" noBorderTop>
              <SqToggle
                id="sec-2fa"
                checked={twoFaEnabled}
                onChange={() => { showToast('Two-factor authentication is not available in this build.', 'warn'); setTwoFaEnabled(false) }}
              />
            </SettingRow>
          </div>
        </div>

      </>
    )
  }

  function renderSystem() {
    return (
      <>
        <div className="st-section">
          <SecHead title="System Information" />
          <div className="st-sys-grid">
            <div className="st-sys-cell"><div className="st-sys-cell-label">Dashboard Version</div><div className="st-sys-cell-value">1.0.0</div></div>
            <div className="st-sys-cell"><div className="st-sys-cell-label">API Version</div><div className="st-sys-cell-value">1.0.0</div></div>
            <div className="st-sys-cell"><div className="st-sys-cell-label">Build Date</div><div className="st-sys-cell-value">Feb 2026</div></div>
            <div className="st-sys-cell"><div className="st-sys-cell-label">Status</div><div className="st-sys-cell-value ok">Operational</div></div>
          </div>
        </div>

        {isAdmin && (
          <div className="st-section">
            <SecHead title="Moderation Defaults" meta="Admin only" />
            <div className="st-block">
              <SettingRow label="Auto-Verify Reports" desc="Automatically verify reports that exceed the confidence threshold" noBorderTop>
                <SqToggle id="sys-autoverify" checked={settings.autoVerify} onChange={(val) => updateApiSetting('autoVerify', val)} disabled={isMutating} />
              </SettingRow>
              {settings.autoVerify && (
                <div className="st-slider-area">
                  <div className="st-slider-label">
                    <span>Min. Confidence Threshold</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-primary)' }}>{settings.minConfidenceScore}%</span>
                  </div>
                  <input type="range" className="st-range" min={0} max={100} value={settings.minConfidenceScore} onChange={(e) => updateApiSetting('minConfidenceScore', parseInt(e.target.value, 10))} disabled={isMutating} />
                  <div className="st-range-row"><span>Conservative (0%)</span><span>Aggressive (100%)</span></div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="st-btn st-btn-primary" onClick={() => saveMutation.mutate(settings)} disabled={isMutating}>{IC.check} Save System Settings</button>
            </div>
          </div>
        )}

        <div className="st-section">
          <SecHead title="Danger Zone" />
          <div className="st-danger-card">
            <div className="st-danger-row">
              <div style={{ flex: 1 }}>
                <div className="st-danger-title">Reset All Settings</div>
                <div className="st-danger-desc">Restore all dashboard settings to their factory defaults. This cannot be undone.</div>
              </div>
              <button className="st-btn st-btn-danger" onClick={() => setConfirmReset(true)} disabled={resetMutation.isPending}>{IC.refresh} Reset to Defaults</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const SECTION_RENDERERS = { profile: renderProfile, notif: renderNotifications, appearance: renderAppearance, security: renderSecurity, system: renderSystem }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{CSS}</style>

      <div className="st-container">
        {/* Topbar */}
        <div className="st-topbar">
          <span className="st-topbar-title">Settings</span>
        </div>

        {/* Body */}
        <div className="st-body">
          {/* Section nav */}
          <nav className="st-snav">
            <div className="st-snav-group">
              <span className="st-snav-group-label">Sections</span>
              {NAV.map((item) => (
                <button key={item.id} className={`st-snav-item${activeSection === item.id ? ' active' : ''}`} onClick={() => setActiveSection(item.id)}>
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="st-scroll">
            {(SECTION_RENDERERS[activeSection] ?? SECTION_RENDERERS.profile)()}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Confirm: Reset Settings */}
      <ConfirmDialog
        visible={confirmReset}
        title="Reset All Settings?"
        message="All dashboard settings will be restored to factory defaults. This includes notification preferences, moderation thresholds, and appearance options."
        confirmLabel="Reset Settings"
        cancelLabel="Cancel"
        confirmDisabled={resetMutation.isPending}
        onConfirm={() => { setConfirmReset(false); resetMutation.mutate() }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  )
}

export default SettingsPage
