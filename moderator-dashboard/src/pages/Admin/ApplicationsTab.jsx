import React, { useState } from 'react'
import { AlertTriangle, CheckCircle2, Search, ShieldAlert, ShieldCheck, ShieldOff, UserCheck, XCircle } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import LoadingState from '../../components/LoadingState'

// ── Risk assessment ──────────────────────────────────────────────────────────

const DISPOSABLE_DOMAINS = [
  'tempmail.io', 'mailinator.com', 'guerrillamail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'spam4.me', 'trashmail.com', 'throwam.com',
  'maildrop.cc', 'dispostable.com', 'fakeinbox.com', 'tempr.email',
]

function assessRisk(email, role) {
  const domain = (email || '').split('@')[1]?.toLowerCase() || ''

  if (DISPOSABLE_DOMAINS.some((d) => domain.includes(d))) {
    return {
      level: 'high',
      note: 'Disposable email domain detected. High-risk application — recommend rejection.',
    }
  }

  const isGovDomain =
    domain.endsWith('.gov') || domain.endsWith('.gov.lb') || domain.endsWith('.mil')

  if (role === 'law_enforcement' && !isGovDomain) {
    return {
      level: 'high',
      note: 'Law enforcement access requested from a non-official email domain. Identity verification required.',
    }
  }

  if (isGovDomain) {
    return {
      level: 'medium',
      note: 'Government domain detected — verify identity with official badge or credentials before approving access.',
    }
  }

  if (role === 'law_enforcement') {
    return {
      level: 'medium',
      note: 'Law enforcement role requested. Full credential review recommended before granting elevated access.',
    }
  }

  if (domain === 'safesignal.com') {
    return {
      level: 'low',
      note: 'Email domain matches platform. No prior account. Standard review recommended.',
    }
  }

  return {
    level: 'low',
    note: 'Standard commercial email. No risk flags detected. Normal review process applies.',
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

const RISK_STYLES = {
  low: {
    badge: 'border-green-500/40 text-green-400 bg-green-500/10',
    block: 'border-green-500/30 bg-green-500/5',
    icon: ShieldCheck,
    label: 'LOW RISK',
    iconColor: 'text-green-400',
  },
  medium: {
    badge: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    block: 'border-amber-500/30 bg-amber-500/5',
    icon: AlertTriangle,
    label: 'MEDIUM RISK',
    iconColor: 'text-amber-400',
  },
  high: {
    badge: 'border-red-500/40 text-red-400 bg-red-500/10',
    block: 'border-red-500/30 bg-red-500/5',
    icon: ShieldAlert,
    label: 'HIGH RISK',
    iconColor: 'text-red-400',
  },
}

function RiskBadge({ level }) {
  const s = RISK_STYLES[level] || RISK_STYLES.low
  return (
    <span
      className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 border ${s.badge}`}>
      {s.label}
    </span>
  )
}

function RoleChip({ role }) {
  const isLE = role === 'law_enforcement'
  return (
    <span
      className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 border ${
        isLE ? 'border-green-500/50 text-green-400' : 'border-primary/50 text-primary'
      }`}
    >
      {isLE ? 'LE' : 'Moderator'}
    </span>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

function ApplicationsTab({
  applications,
  isLoading,
  approvePending,
  rejectPending,
  onApprove,
  onReject,
}) {
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [confirmApprove, setConfirmApprove] = useState(null)
  const [confirmReject, setConfirmReject]   = useState(null)

  // Auto-select first pending on load
  const firstPending = applications.find((a) => !a.isVerified)
  const effectiveSelected = selectedId ?? firstPending?.id ?? applications[0]?.id ?? null
  const selected = applications.find((a) => a.id === effectiveSelected) || null
  const selectedRisk = selected ? assessRisk(selected.email, selected.role) : null

  const filtered = applications.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.username?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)
  })

  if (isLoading) return <LoadingState />

  return (
    <div className="flex flex-1 overflow-hidden min-h-0 border border-border">
      {/* ── Left panel: list ── */}
      <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-border overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-border flex-shrink-0">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2">
            Staff Access Requests
          </p>
          <div className="flex items-center gap-2 bg-surface border border-border rounded-sm px-2.5 py-1.5">
            <Search size={12} className="text-muted flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicants..."
              className="bg-transparent border-none outline-none text-xs text-text placeholder:text-muted flex-1 min-w-0"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                {search ? 'No results' : 'No applications'}
              </p>
            </div>
          ) : (
            filtered.map((app) => {
              const risk = assessRisk(app.email, app.role)
              const isSelected = app.id === effectiveSelected
              const isProcessed = app.status && app.status !== 'pending'
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedId(app.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                    isSelected
                      ? 'bg-primary/5 border-l-2 border-l-primary pl-[14px]'
                      : 'hover:bg-surface'
                  } ${isProcessed ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-text">{app.username}</span>
                    {isProcessed ? (
                      <span
                        className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 border rounded-sm ${
                          app.status === 'approved'
                            ? 'border-green-500/40 text-green-400 bg-green-500/8'
                            : 'border-red-500/40 text-red-400 bg-red-500/8'
                        }`}
                      >
                        {app.status}
                      </span>
                    ) : (
                      <RiskBadge level={risk.level} />
                    )}
                  </div>
                  <p className="text-[10px] text-muted mb-1.5 truncate">{app.email}</p>
                  <div className="flex items-center gap-2">
                    <RoleChip role={app.role} />
                    <span className="text-[9px] text-muted tabular-nums">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel: detail ── */}
      {selected && selectedRisk ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Detail topbar */}
          <div className="flex items-center gap-3 px-5 h-12 border-b border-border bg-card flex-shrink-0">
            <span className="font-extrabold text-sm tracking-wide uppercase text-text flex-1 truncate">
              {selected.username}
            </span>
            <button
              onClick={() => setConfirmApprove(selected)}
              disabled={approvePending || rejectPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border border-success/70 text-success bg-success/8 hover:bg-success hover:text-black transition-colors disabled:opacity-40"
            >
              <CheckCircle2 size={12} />
              Approve
            </button>
            <button
              onClick={() => setConfirmReject(selected)}
              disabled={approvePending || rejectPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border border-danger/70 text-danger bg-danger/8 hover:bg-danger hover:text-white transition-colors disabled:opacity-40"
            >
              <XCircle size={12} />
              Reject
            </button>
          </div>

          {/* Scrollable detail body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Profile block */}
            <div className="flex items-center gap-3.5 p-4 bg-surface border border-border">
              <div className="w-11 h-11 flex-shrink-0 bg-card border border-border flex items-center justify-center text-base font-extrabold text-muted uppercase">
                {selected.username.slice(0, 2)}
              </div>
              <div>
                <p className="text-base font-extrabold text-text tracking-tight">
                  {selected.username}
                </p>
                <p className="text-[11px] text-muted mt-0.5">{selected.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <RoleChip role={selected.role} />
                  <RiskBadge level={selectedRisk.level} />
                </div>
              </div>
            </div>

            {/* Application details grid */}
            <div>
              <SectionLabel label="Application Details" />
              <div className="grid grid-cols-2 border border-border">
                <MetaCell label="Applied" value={new Date(selected.appliedAt).toLocaleString()} />
                <MetaCell
                  label="Requested Role"
                  value={selected.role === 'law_enforcement' ? 'Law Enforcement' : 'Moderator'}
                  valueClassName="text-primary"
                />
              </div>
            </div>

            {/* Risk assessment */}
            <div>
              <SectionLabel label="Risk Assessment" />
              <RiskBlock level={selectedRisk.level} note={selectedRisk.note} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted">
          <ShieldOff size={28} strokeWidth={1.5} />
          <p className="text-[11px] font-semibold tracking-widest uppercase">
            Select an application
          </p>
        </div>
      )}

      {/* ── Dialogs ── */}
      <ConfirmDialog
        visible={Boolean(confirmApprove)}
        title="Approve Application?"
        message={`Grant ${confirmApprove?.username ?? 'this user'} access as ${
          confirmApprove?.role === 'law_enforcement' ? 'Law Enforcement' : 'Moderator'
        }? This is a permanent access decision and cannot be undone without manual intervention.`}
        confirmLabel="Approve Access"
        confirmClassName="bg-success text-black hover:opacity-90"
        onConfirm={() => {
          if (!confirmApprove) return
          onApprove(confirmApprove.id)
          setConfirmApprove(null)
        }}
        onCancel={() => setConfirmApprove(null)}
      />
      <ConfirmDialog
        visible={Boolean(confirmReject)}
        title="Reject Application?"
        message={`Reject ${confirmReject?.username ?? 'this user'}'s access request? This will permanently delete the pending account and cannot be undone.`}
        confirmLabel="Reject Application"
        confirmClassName="bg-danger text-white hover:opacity-90"
        onConfirm={() => {
          if (!confirmReject) return
          onReject(confirmReject.id)
          setConfirmReject(null)
        }}
        onCancel={() => setConfirmReject(null)}
      />
    </div>
  )
}

// ── Helper components ────────────────────────────────────────────────────────

function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] font-bold tracking-widest uppercase text-muted whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function MetaCell({ label, value, valueClassName = 'text-text' }) {
  return (
    <div className="px-3.5 py-2.5 border-r border-b border-border last:border-r-0 [&:nth-last-child(-n+2)]:border-b-0">
      <p className="text-[9px] font-bold tracking-widest uppercase text-muted mb-1">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${valueClassName}`}>{value}</p>
    </div>
  )
}

function RiskBlock({ level, note }) {
  const s = RISK_STYLES[level] || RISK_STYLES.low
  const Icon = s.icon
  return (
    <div className={`flex items-start gap-3 p-3.5 border ${s.block}`}>
      <Icon size={15} className={`flex-shrink-0 mt-0.5 ${s.iconColor}`} strokeWidth={2} />
      <div>
        <p className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${s.iconColor}`}>
          {s.label}
        </p>
        <p className="text-[12px] text-muted leading-relaxed">{note}</p>
      </div>
    </div>
  )
}

export default ApplicationsTab
