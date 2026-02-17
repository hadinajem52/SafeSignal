import React from 'react'
import { AlertTriangle } from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import LoadingState from '../../components/LoadingState'
import SeverityBadge from '../../components/SeverityBadge'
import StatusBadge from '../../components/StatusBadge'

function ReportList({
  reports,
  isLoading,
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
    <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                aria-label="Select all reports"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="size-4"
              />
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-text">Report</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-text">Reporter</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-text">Status</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-text">Severity</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-text">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {reports.map((report) => (
            <tr
              key={report.id}
              className="hover:bg-surface cursor-pointer"
              onClick={() => onSelectReport(report)}
            >
              <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`Select report ${report.title}`}
                  checked={selectedReportIds.includes(report.id)}
                  onChange={() => onToggleSelection(report.id)}
                  className="size-4"
                />
              </td>
              <td className="px-4 py-3">
                <p className="font-semibold text-text text-sm">{report.title}</p>
                <p className="text-xs text-muted truncate max-w-[420px]">{report.description}</p>
              </td>
              <td className="px-4 py-3 text-sm text-muted">{report.reporter}</td>
              <td className="px-4 py-3">
                <StatusBadge status={report.status} />
              </td>
              <td className="px-4 py-3">
                <SeverityBadge severity={report.severity} display="initial" />
              </td>
              <td className="px-4 py-3 text-sm text-muted tabular-nums">
                {new Date(report.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ReportList
