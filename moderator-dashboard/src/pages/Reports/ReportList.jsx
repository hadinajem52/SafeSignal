import React from 'react'
import { AlertTriangle } from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import LoadingState from '../../components/LoadingState'
import SeverityBadge from '../../components/SeverityBadge'
import StatusBadge from '../../components/StatusBadge'

function ReportList({ reports, isLoading, onSelectReport }) {
  if (isLoading) {
    return <LoadingState />
  }

  if (!reports.length) {
    return <EmptyState icon={AlertTriangle} message="No reports found matching your criteria" />
  }

  return (
    <div className="grid gap-4">
      {reports.map((report) => (
        <div
          key={report.id}
          className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
          onClick={() => onSelectReport(report)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-gray-900">{report.title}</h3>
                <StatusBadge status={report.status} />
              </div>
              <p className="text-gray-600 text-sm mb-3">{report.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>📍 {report.location}</span>
                <span>👤 {report.reporter}</span>
                <span>📅 {new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <SeverityBadge severity={report.severity} display="initial" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default ReportList
