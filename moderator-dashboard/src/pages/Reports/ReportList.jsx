import React from 'react'
import { AlertTriangle } from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import LoadingState from '../../components/LoadingState'
import SeverityBadge from '../../components/SeverityBadge'
import StatusBadge from '../../components/StatusBadge'
import { getTimeAgo } from '../../utils/dateUtils'

function ReportList({
  reports,
  isLoading,
  selectedReportId,
  onSelectReport,
  selectedReportIds,
  onToggleSelection,
  onToggleSelectAll,
}) {
  if (isLoading) {
    return <LoadingState />
  }

  if (!reports.length) {
    return <EmptyState icon={AlertTriangle} message="No reports found matching your criteria" />
  }

  const allSelected = selectedReportIds.length === reports.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface/60 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <input
          type="checkbox"
          aria-label="Select all reports"
          checked={allSelected}
          onChange={onToggleSelectAll}
          className="size-3.5 accent-primary"
        />
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider flex-1">Report</span>
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider w-12 text-center">Sev.</span>
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider w-16 text-right">Age</span>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1">
        {reports.map((report) => {
          const isSelected = report.id === selectedReportId
          const isChecked = selectedReportIds.includes(report.id)

          return (
            <div
              key={report.id}
              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 border-l-2
                ${isSelected
                  ? 'bg-primary/8 border-l-primary'
                  : 'border-l-transparent hover:bg-surface/50'
                }`}
              onClick={() => onSelectReport(report)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`Select report ${report.title}`}
                  checked={isChecked}
                  onChange={() => onToggleSelection(report.id)}
                  className="size-3.5 accent-primary"
                />
              </div>

              {/* Report info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text leading-snug truncate">{report.title}</p>
                <div className="mt-1.5">
                  <StatusBadge status={report.status} size="xs" />
                </div>
              </div>

              {/* Severity */}
              <div className="w-12 flex justify-center flex-shrink-0">
                <SeverityBadge severity={report.severity} display="initial" />
              </div>

              {/* Age */}
              <div className="w-16 text-right flex-shrink-0">
                <span className="text-xs text-muted tabular-nums">{getTimeAgo(report.createdAt)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ReportList
