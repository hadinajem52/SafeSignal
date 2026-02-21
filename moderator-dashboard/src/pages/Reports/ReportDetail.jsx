import React from 'react'
import { ChevronRight } from 'lucide-react'
import DetailSection from '../../components/DetailSection'
import DedupCandidatesPanel from '../../components/DedupCandidatesPanel'
import GoogleMapPanel from '../../components/GoogleMapPanel'
import IncidentTimeline from '../../components/IncidentTimeline'
import SeverityBadge from '../../components/SeverityBadge'
import StatusBadge from '../../components/StatusBadge'
import { formatCategoryLabel, openMapsUrl } from '../../utils/incident'
import ReportActions from './ReportActions'

// Keyboard shortcut hint — used only in the empty state now
function KbdHint({ label }) {
  return (
    <kbd className="inline-flex items-center justify-center size-5 rounded border border-border bg-surface text-[10px] font-mono font-bold text-text">
      {label}
    </kbd>
  )
}

function ReportDetail({
  report,
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
  onOpenDuplicateCandidate,
}) {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-10">
        <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4">
          <ChevronRight className="text-muted" size={28} />
        </div>
        <p className="text-base font-semibold text-text">No report selected</p>
        <p className="text-sm text-muted mt-1.5">Select a report from the queue to review it here.</p>
        <div className="mt-6 flex items-center gap-1 text-xs text-muted">
          Press <KbdHint label="N" /> to jump to the next report
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* ── Header bar ── */}
      <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between gap-4 bg-card border-b border-border">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-text text-balance leading-snug truncate">{report.title}</h2>
        </div>
        <button
          onClick={onNext}
          aria-label="Next report"
          className="flex-shrink-0 px-3 py-1.5 rounded border border-border text-muted text-xs font-semibold
            hover:bg-surface hover:text-text transition-colors"
        >
          Next →
        </button>
      </div>

      {/* ── Two-column content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: report info + actions */}
        <div className="w-1/2 overflow-y-auto p-5 space-y-5 border-r border-border">
          {/* Badges row — plain bordered chips, no pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={report.status} size="sm" className="!rounded" />
            <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-surface text-muted border border-border uppercase tracking-wide">
              {formatCategoryLabel(report.category)}
            </span>
            <SeverityBadge severity={report.severity} display="initial" />
          </div>

          {/* Description */}
          <p className="text-sm text-muted leading-relaxed">{report.description}</p>

          {/* Meta grid — LE Interface pattern (condensed mono labels, 600 data) */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest">Reporter</p>
              <p className="text-sm font-semibold text-text mt-0.5">{report.reporter}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest">Location</p>
              <p className="text-sm font-semibold text-text mt-0.5 leading-snug">{report.location}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest">Submitted</p>
              <p className="text-sm font-semibold text-text mt-0.5 tabular-nums">{new Date(report.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {/* Map */}
          <DetailSection
            title="Location"
            headerRight={
              <a
                href={openMapsUrl(report.latitude, report.longitude)}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Open in Maps ↗
              </a>
            }
          >
            <GoogleMapPanel
              markers={[{
                id: `report-${report.id}`,
                lat: report.latitude,
                lng: report.longitude,
                title: report.title || `Incident #${report.id}`,
              }]}
              center={{ lat: report.latitude, lng: report.longitude }}
              height={160}
              zoom={15}
              autoFit={false}
              emptyMessage="No coordinates available."
            />
          </DetailSection>

          {/* ML Insights */}
          <DetailSection
            title="ML Insights"
            headerRight={isMlLoading ? <span className="text-[11px] text-muted animate-pulse">Loading…</span> : null}
          >
            {!isMlLoading && !mlSummary ? (
              <p className="text-sm text-muted">No ML data available.</p>
            ) : null}

            {mlSummary ? (
              <div className="space-y-2 text-sm">
                {[
                  ['Suggested category', mlSummary.predictedCategory || 'N/A'],
                  ['Confidence', mlSummary.categoryConfidence],
                  ['Risk score', mlSummary.riskScore],
                  ['Toxicity', mlSummary.isToxic ? `Flagged (${mlSummary.toxicityScore})` : mlSummary.toxicityScore],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted">{label}</span>
                    <span className={`font-semibold ${label === 'Risk score' && mlSummary.riskScore >= 0.8 ? 'text-error'
                        : label === 'Risk score' && mlSummary.riskScore >= 0.5 ? 'text-warning'
                          : label === 'Toxicity' && mlSummary.isToxic ? 'text-error'
                            : 'text-text'
                      }`}>
                      {value}
                    </span>
                  </div>
                ))}
                {mlSummary.predictedCategory && mlSummary.predictedCategory !== report.category ? (
                  <button
                    onClick={() => onApplySuggestedCategory(mlSummary.predictedCategory)}
                    disabled={updateCategoryPending}
                    className="mt-2 w-full bg-primary/15 hover:bg-primary/25 text-primary text-sm font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors border border-primary/20"
                  >
                    {updateCategoryPending ? 'Updating…' : 'Apply Suggested Category'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </DetailSection>

          {/* Dedup */}
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
            onOpenCandidate={onOpenDuplicateCandidate}
          />

          {/* Actions */}
          <ReportActions
            verifyPending={verifyPending}
            rejectPending={rejectPending}
            onVerify={onVerify}
            onReject={onReject}
          />
        </div>

        {/* Right: timeline */}
        <div className="w-1/2 flex flex-col bg-surface/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest">Timeline & Comms</p>
            <p className="text-[11px] text-muted mt-0.5">Notes &amp; reporter messages</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <IncidentTimeline incidentId={report.id} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportDetail
