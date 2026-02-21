import React from 'react'
import { ChevronRight } from 'lucide-react'
import { getTimeAgo } from '../../../utils/dateUtils'

export default function IncidentRow({ inc, badge, badgeClass, idx, total, onClick }) {
  return (
    <div
      className={`flex items-center gap-2.5 py-2.5 px-2 rounded-md transition-colors ${onClick ? 'cursor-pointer hover:bg-surface/50' : ''} ${idx < total - 1 ? 'border-b border-border' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : 'listitem'}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-muted">
        {String(inc.incident_id).slice(-3)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text truncate">
          {inc.title || `Incident #${inc.incident_id}`}
        </p>
        <p className="text-[10px] text-muted">{getTimeAgo(inc.created_at)}</p>
      </div>
      <span className={`text-[10px] font-bold flex-shrink-0 ${badgeClass}`}>{badge}</span>
      <ChevronRight size={12} className="text-muted flex-shrink-0" />
    </div>
  )
}
