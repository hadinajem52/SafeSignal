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

// Keyboard shortcut hint
function KbdHint({ label }) {
  return (
    <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/15 text-[10px] font-mono font-bold text-white/80">
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
      {/* ── Refined header ── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a2744] to-[#0f2035] px-5 py-3 flex items-center justify-between gap-3 border-b border-white/5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-white leading-tight truncate">{report.title}</h2>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-white/50">
            <KbdHint label="E" /> <span>escalate</span>
            <KbdHint label="R" /> <span>reject</span>
            <KbdHint label="N" /> <span>next</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={onNext}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold text-white/80 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* ── Two-column content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: report info + actions */}
        <div className="w-1/2 overflow-y-auto p-5 space-y-5 border-r border-border">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={report.status} size="sm" />
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface text-muted border border-border uppercase tracking-wide">
              {formatCategoryLabel(report.category)}
            </span>
            <SeverityBadge severity={report.severity} display="pill" />
          </div>

          {/* Description */}
          <p className="text-sm text-muted leading-relaxed">{report.description}</p>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              ['Reporter', report.reporter],
              ['Location', report.location],
              ['Submitted', new Date(report.createdAt).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">{label}</p>
                <p className="text-sm font-medium text-text mt-0.5">{value}</p>
              </div>
            ))}
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
          <div className="px-5 py-3.5 border-b border-border flex-shrink-0">
            <h3 className="text-sm font-bold text-text">Timeline & Communication</h3>
            <p className="text-[11px] text-muted mt-0.5">Notes and reporter messages</p>
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
