import React from 'react'
import DetailSection from '../../components/DetailSection'
import IncidentTimeline from '../../components/IncidentTimeline'
import DedupCandidatesPanel from '../../components/DedupCandidatesPanel'
import GoogleMapPanel from '../../components/GoogleMapPanel'
import SeverityBadge from '../../components/SeverityBadge'
import StatusBadge from '../../components/StatusBadge'
import { formatCategoryLabel, openMapsUrl } from '../../utils/incident'
import ReportActions from './ReportActions'

function ReportDetail({
  report,
  onClose,
  mlSummary,
  isMlLoading,
  dedupData,
  isDedupLoading,
  isMerging,
  updateCategoryPending,
  verifyPending,
  rejectPending,
  onMerge,
  onApplySuggestedCategory,
  onVerify,
  onReject,
  onNext,
}) {
  if (!report) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute inset-y-0 right-0 w-full bg-card border-l border-border shadow-soft overflow-hidden">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-blue-700 text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Report Detail Workspace</h2>
            <p className="text-sm text-blue-100">Keyboard shortcuts: V verify, R reject, N next</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onNext}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold"
            >
              Next (N)
            </button>
            <button
              aria-label="Close report detail"
              onClick={onClose}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>

        <div className="h-[calc(100dvh-88px)] flex">
          <div className="w-1/2 p-6 space-y-6 overflow-y-auto border-r border-border bg-card">
          <div>
            <h3 className="text-2xl font-bold text-text mb-4">{report.title}</h3>
            <div className="flex gap-3">
              <StatusBadge status={report.status} size="sm" />
              <span className="px-4 py-2 rounded-full text-sm font-medium bg-surface text-text">
                {formatCategoryLabel(report.category)}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-text mb-2">Description</h4>
            <p className="text-muted">{report.description}</p>
          </div>

          <DetailSection
            title="Location Context"
            headerRight={
              <a
                href={openMapsUrl(report.latitude, report.longitude)}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Open in Google Maps
              </a>
            }
          >
            <GoogleMapPanel
              markers={[
                {
                  id: `report-${report.id}`,
                  lat: report.latitude,
                  lng: report.longitude,
                  title: report.title || `Incident #${report.id}`,
                },
              ]}
              center={{ lat: report.latitude, lng: report.longitude }}
              height={220}
              zoom={15}
              autoFit={false}
              emptyMessage="No coordinates available for this report."
            />
          </DetailSection>

          <DetailSection
            title="ML Insights"
            headerRight={isMlLoading ? <span className="text-xs text-muted">Loading...</span> : null}
          >

            {!isMlLoading && !mlSummary ? <p className="text-sm text-muted">No ML data available.</p> : null}

            {mlSummary ? (
              <div className="space-y-2 text-sm text-muted">
                <div className="flex items-center justify-between">
                  <span>Suggested category</span>
                  <span className="font-semibold text-text">{mlSummary.predictedCategory || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Category confidence</span>
                  <span className="font-semibold text-text">{mlSummary.categoryConfidence}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Risk score</span>
                  <span className={`font-semibold ${mlSummary.riskScore >= 0.8 ? 'text-red-600' : mlSummary.riskScore >= 0.5 ? 'text-amber-600' : 'text-text'}`}>
                    {mlSummary.riskScore}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Toxicity</span>
                  <span className={`font-semibold ${mlSummary.isToxic ? 'text-red-600' : 'text-text'}`}>
                    {mlSummary.isToxic ? `Flagged (${mlSummary.toxicityScore})` : mlSummary.toxicityScore}
                  </span>
                </div>

                {mlSummary.predictedCategory && mlSummary.predictedCategory !== report.category ? (
                  <button
                    onClick={() => onApplySuggestedCategory(mlSummary.predictedCategory)}
                    disabled={updateCategoryPending}
                    className="mt-3 w-full bg-primary hover:opacity-90 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                  >
                    {updateCategoryPending ? 'Updating...' : 'Apply Suggested Category'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </DetailSection>

          <DedupCandidatesPanel
            dedup={dedupData}
            isLoading={isDedupLoading}
            isMerging={isMerging}
            sourceIncident={{
              incidentId: report.id,
              title: report.title,
              description: report.description,
              latitude: report.latitude,
              longitude: report.longitude,
            }}
            onMerge={onMerge}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted">Reported By</p>
              <p className="font-medium text-text">{report.reporter}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Location</p>
              <p className="font-medium text-text">{report.location}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Date Reported</p>
              <p className="font-medium text-text">{new Date(report.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Severity Level</p>
              <SeverityBadge severity={report.severity} display="text" />
            </div>
          </div>

          <ReportActions
            verifyPending={verifyPending}
            rejectPending={rejectPending}
            onVerify={onVerify}
            onReject={onReject}
            onClose={onClose}
          />
        </div>

          <div className="w-1/2 flex flex-col bg-surface">
            <div className="p-4 border-b border-border bg-surface">
              <h3 className="text-lg font-bold text-text">Timeline & Communication</h3>
              <p className="text-sm text-muted mt-1">Communicate with the reporter or add internal notes</p>
            </div>
            <div className="flex-1">
              <IncidentTimeline incidentId={report.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportDetail
