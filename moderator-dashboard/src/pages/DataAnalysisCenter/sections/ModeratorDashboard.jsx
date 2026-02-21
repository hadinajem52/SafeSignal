import React, { useMemo } from 'react'
import { CheckCircle2, FileText, ChevronRight, Clock, AlertTriangle, Zap, Activity } from 'lucide-react'
import { getTimeAgo } from '../../../utils/dateUtils'
import SparklineChart from '../components/SparklineChart'
import SectionCard from '../components/SectionCard'
import BigStatTile from '../components/BigStatTile'
import IncidentRow from '../components/IncidentRow'
import { severityClass } from '../components/helpers'
import { SkeletonLoader, EmptyState } from '../components/UIStates'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export function ModeratorLeft({ s, incidents, loading }) {
  const categories = useMemo(() => {
    const categoryMap = {}
    incidents.forEach((inc) => {
      const cat = inc.category || 'other'
      categoryMap[cat] = (categoryMap[cat] || 0) + 1
    })
    return Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [incidents])

  const maxCat = categories[0]?.[1] || 1

  const platformStatus = useMemo(() => [
    { label: 'Pending Review', value: s.pendingReports, color: 'text-warning' },
    { label: 'Verified', value: s.verifiedReports, color: 'text-success' },
    { label: 'Rejected', value: s.rejectedReports, color: 'text-error' },
    { label: 'Active Users', value: s.activeUsers, color: 'text-primary' },
    { label: 'Suspended', value: s.suspendedUsers, color: 'text-muted' },
  ], [s])

  // Fake history for demo
  const sparklineData = useMemo(() => {
    if (!s.totalIncidents) return []
    const val = s.totalIncidents
    return [Math.max(0, val - 45), Math.max(0, val - 30), Math.max(0, val - 10), Math.max(0, val - 5), val]
  }, [s.totalIncidents])

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 size={12} className="text-primary" />
              <span className="text-[11px] text-muted font-semibold uppercase tracking-widest">Total Reports</span>
            </div>
            {loading ? (
              <SkeletonLoader className="h-9 w-24 my-1" />
            ) : (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-3xl font-bold font-display text-text leading-none"
              >
                {s.totalIncidents.toLocaleString()}
              </motion.p>
            )}
            <p className="text-[11px] text-muted mt-1.5">All time · updated live</p>
          </div>
          <button
            aria-label="Change timeframe"
            className="flex items-center gap-1 text-[11px] text-muted hover:text-text border border-border rounded-lg px-2.5 py-1 mt-0.5 transition-colors"
          >
            Weekly
            <svg width="9" height="5" viewBox="0 0 9 5" fill="none">
              <path d="M1 1L4.5 4L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mt-3 -mx-1">
          <SparklineChart data={sparklineData} />
        </div>
      </div>

      <SectionCard title="Incident Categories">
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map(i => <SkeletonLoader key={i} className="h-6 w-full" />)}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState title="No categories tracked" description="There are no incidents logged to categorize." />
        ) : categories.map(([cat, count], i) => (
          <motion.div
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            key={cat} className={`flex items-center gap-3 py-2.5 ${i < categories.length - 1 ? 'border-b border-border' : ''}`}
          >
            <div className="w-6 h-6 rounded bg-surface flex items-center justify-center flex-shrink-0">
              <FileText size={10} className="text-muted" />
            </div>
            <span className="flex-1 text-xs text-text capitalize min-w-0 truncate">{cat.replace(/_/g, ' ')}</span>
            <span className="text-xs text-muted w-6 text-right flex-shrink-0">{count}</span>
            <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden flex-shrink-0">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${Math.round((count / maxCat) * 100)}%` }}
                className="h-full bg-primary rounded-full"
              />
            </div>
            <ChevronRight size={12} className="text-muted flex-shrink-0" />
          </motion.div>
        ))}
      </SectionCard>

      <SectionCard title="Platform Status">
        {platformStatus.map((item, i) => (
          <div key={item.label} className={`flex items-center gap-3 py-2.5 ${i < platformStatus.length - 1 ? 'border-b border-border' : ''}`}>
            <span className="flex-1 text-xs text-text">{item.label}</span>
            {loading ? (
              <SkeletonLoader className="h-4 w-8" />
            ) : (
              <span className={`text-xs font-bold ${item.color} w-8 text-right`}>
                {item.value}
              </span>
            )}
            <ChevronRight size={12} className="text-muted flex-shrink-0" />
          </div>
        ))}
      </SectionCard>
    </>
  )
}

export function ModeratorCenter({ s, incidents, loading }) {
  const navigate = useNavigate()

  const statusCounts = useMemo(() => {
    return incidents.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1
      return acc
    }, {})
  }, [incidents])

  const urgent = useMemo(() => {
    const recentIds = new Set((s.recentIncidents || []).map(r => r.incident_id))
    const list = [
      ...(s.recentIncidents || []).filter(i => i.severity === 'critical' || i.severity === 'high'),
      ...incidents.filter(i =>
        (i.severity === 'critical' || i.severity === 'high') && !recentIds.has(i.incident_id)
      ).slice(0, 6)
    ]
    return list.slice(0, 6)
  }, [s.recentIncidents, incidents])

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <BigStatTile label="Pending" value={s.pendingReports} icon={Clock} iconColor="text-warning" loading={loading} />
        <BigStatTile label="Verified" value={s.verifiedReports} icon={CheckCircle2} iconColor="text-success" loading={loading} />
      </div>

      <SectionCard title="High-Priority Incidents">
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2].map(i => <SkeletonLoader key={i} className="h-10 w-full" />)}
          </div>
        ) : urgent.length === 0 ? (
          <EmptyState title="No urgent incidents" description="Platform is running smoothly. No high severity alerts." />
        ) : urgent.map((inc, i) => (
          <IncidentRow
            key={inc.incident_id} inc={inc} idx={i} total={urgent.length}
            badge={inc.severity?.toUpperCase()} badgeClass={severityClass(inc.severity)}
            onClick={() => navigate(`/reports?id=${inc.incident_id}`)}
          />
        ))}
      </SectionCard>

      <SectionCard title="Processing Summary">
        <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-2">Auto-classified</p>
        <div className="mb-4">
          {[
            { status: 'auto_processed', icon: Zap, color: 'bg-primary/10 text-primary' },
            { status: 'auto_flagged', icon: AlertTriangle, color: 'bg-warning/10 text-warning' },
          ].map(({ status, icon: Icon, color }, i) => (
            <div key={status} className={`flex items-center gap-2.5 py-2 ${i === 0 ? 'border-b border-border' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={11} />
              </div>
              <span className="flex-1 text-xs text-text capitalize">{status.replace(/_/g, ' ')}</span>
              {loading ? (
                <SkeletonLoader className="h-4 w-6" />
              ) : (
                <span className="text-xs font-semibold text-muted">{statusCounts[status] || 0}</span>
              )}
              <ChevronRight size={12} className="text-muted flex-shrink-0" />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-2">Needs attention</p>
        <div>
          {[
            { status: 'in_review', color: 'bg-warning/10 text-warning' },
            { status: 'needs_info', color: 'bg-accent/10 text-accent' },
            { status: 'submitted', color: 'bg-info/10 text-info' },
          ].map(({ status, color }, i, arr) => (
            <div key={status} className={`flex items-center gap-2.5 py-2 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                <Activity size={11} />
              </div>
              <span className="flex-1 text-xs text-text capitalize">{status.replace(/_/g, ' ')}</span>
              {loading ? (
                <SkeletonLoader className="h-4 w-6" />
              ) : (
                <span className="text-xs font-semibold text-muted">{statusCounts[status] || 0}</span>
              )}
              <ChevronRight size={12} className="text-muted flex-shrink-0" />
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  )
}

export function ModeratorRight({ s, loading }) {
  const navigate = useNavigate()

  const recentList = useMemo(() => (s.recentIncidents || []).slice(0, 7), [s.recentIncidents])
  const urgent = useMemo(() => (s.recentIncidents || [])
    .filter((i) => i.severity === 'critical' || i.severity === 'high')
    .slice(0, 4), [s.recentIncidents])

  return (
    <>
      <SectionCard title="User Metrics">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: s.totalUsers, bg: 'bg-primary/10', text: 'text-primary' },
            { label: 'Active', value: s.activeUsers, bg: 'bg-success/10', text: 'text-success' },
            { label: 'Suspended', value: s.suspendedUsers, bg: 'bg-error/10', text: 'text-error' },
          ].map(({ label, value, bg, text }) => (
            <div key={label} className={`rounded-lg px-2 py-2.5 text-center ${bg}`}>
              {loading ? (
                <SkeletonLoader className="h-6 w-12 mx-auto mb-1" />
              ) : (
                <p className={`text-lg font-bold font-display leading-none ${text}`}>
                  {value}
                </p>
              )}
              <p className="text-[10px] text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Recent Incidents">
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map(i => <SkeletonLoader key={i} className="h-6 w-full" />)}
          </div>
        ) : recentList.length === 0 ? (
          <EmptyState title="No recent incidents" description="No incidents have been submitted recently." />
        ) : recentList.map((inc, i) => (
          <div
            key={inc.incident_id}
            className={`flex items-center gap-2 py-2 cursor-pointer hover:bg-surface/50 transition-colors px-1 rounded-md ${i < recentList.length - 1 ? 'border-b border-border' : ''}`}
            onClick={() => navigate(`/reports?id=${inc.incident_id}`)}
            role="button"
            tabIndex={0}
          >
            <FileText size={11} className="text-muted flex-shrink-0" />
            <span className="flex-1 text-xs text-text truncate min-w-0">
              {inc.title || `Incident #${inc.incident_id}`}
            </span>
            <ChevronRight size={12} className="text-muted flex-shrink-0" />
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Critical Alerts">
        {loading ? (
          <div className="space-y-4 py-2">
            {[1, 2].map(i => (
              <div key={i}>
                <SkeletonLoader className="h-4 w-3/4 mb-1" />
                <SkeletonLoader className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : urgent.length === 0 ? (
          <EmptyState title="No critical alerts" description="Everything looks stable." />
        ) : urgent.map((inc, i, arr) => (
          <div
            key={inc.incident_id}
            className={`py-2.5 cursor-pointer hover:bg-surface/50 transition-colors px-1 rounded-md ${i < arr.length - 1 ? 'border-b border-border' : ''}`}
            onClick={() => navigate(`/reports?id=${inc.incident_id}`)}
            role="button"
            tabIndex={0}
          >
            <p className="text-xs font-semibold text-text truncate">
              {inc.title || `Incident #${inc.incident_id}`}
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <span className={`text-[10px] font-bold ${severityClass(inc.severity)}`}>
                {inc.severity?.toUpperCase()}
              </span>
              <span className="text-[10px] text-muted">{getTimeAgo(inc.created_at)}</span>
            </div>
          </div>
        ))}
      </SectionCard>
    </>
  )
}
