import React from "react";
import { ChevronRight } from "lucide-react";
import DetailSection from "../../components/DetailSection";
import DedupCandidatesPanel from "../../components/DedupCandidatesPanel";
import GoogleMapPanel from "../../components/GoogleMapPanel";
import SeverityBadge from "../../components/SeverityBadge";
import StatusBadge from "../../components/StatusBadge";
import {
  formatConstellationScore,
  getConstellationMeta,
} from "../../utils/constellationUtils";
import { formatCategoryLabel, openMapsUrl } from "../../utils/incidentUtils";
import { getReportPhotoUrls, resolveReportPhotoUrl } from "../../utils/reportPhotos";

// Bordered kbd chip — used in header action buttons and empty state
function KbdChip({ label, style }) {
  return (
    <kbd
      className="inline-flex items-center justify-center w-5 h-5 border border-border bg-surface/80 font-mono font-bold text-[10px] rounded-none"
      style={style}
    >
      {label}
    </kbd>
  );
}

function CommunitySignalCard({ constellation }) {
  const meta = getConstellationMeta(constellation);

  if (!meta) return null;

  const expiresAt = constellation.expiresAt
    ? new Date(constellation.expiresAt).toLocaleString()
    : "N/A";

  return (
    <DetailSection title="Community Signal">
      <div className="space-y-3 text-sm">
        <div
          className="border p-3"
          style={{
            borderColor: meta.color,
            background: `${meta.color}10`,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-[10px] font-bold uppercase text-balance"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-text">
              {formatConstellationScore(constellation.confidenceScore)}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted text-pretty">
            {constellation.summary || meta.description}
          </p>
        </div>

        <div className="grid grid-cols-3 border border-border">
          {[
            ["Supporting", constellation.supportingSignals || 0],
            ["Contradicting", constellation.contradictingSignals || 0],
            [
              "Assessment",
              constellation.ongoingAssessment?.replace(/_/g, " ") || "unknown",
            ],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={`p-2.5 ${index < 2 ? "border-r border-border" : ""}`}
            >
              <p className="text-[9px] font-bold uppercase text-muted">
                {label}
              </p>
              <p className="mt-1 text-xs font-semibold text-text tabular-nums capitalize">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Expires</span>
          <span className="font-semibold text-text tabular-nums">{expiresAt}</span>
        </div>
      </div>
    </DetailSection>
  );
}

function EvidencePanel({ photoUrls }) {
  if (!photoUrls.length) return null;

  return (
    <DetailSection
      title="Evidence"
      headerRight={
        <span className="text-[11px] font-semibold text-muted tabular-nums">
          {photoUrls.length} photo{photoUrls.length !== 1 ? "s" : ""}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {photoUrls.map((url, index) => {
          const resolvedUrl = resolveReportPhotoUrl(url);

          return (
            <a
              key={`${url}-${index}`}
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden border border-border bg-surface"
              aria-label={`Open evidence photo ${index + 1}`}
            >
              <img
                src={resolvedUrl}
                alt={`Evidence photo ${index + 1}`}
                className="h-32 w-full object-cover transition-opacity group-hover:opacity-90"
                loading="lazy"
              />
            </a>
          );
        })}
      </div>
    </DetailSection>
  );
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
  canVerify = true,
  canReject = true,
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
        <div className="w-16 h-16 bg-surface flex items-center justify-center mb-4">
          <ChevronRight className="text-muted" size={28} />
        </div>
        <p className="text-base font-semibold text-text">No report selected</p>
        <p className="text-sm text-muted mt-1.5">
          Select a report from the queue to review it here.
        </p>
        <div className="mt-6 flex items-center gap-1.5 text-xs text-muted">
          Press <KbdChip label="N" /> to jump to the next report
        </div>
      </div>
    );
  }

  const photoUrls = getReportPhotoUrls(report);

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* ── Header: title + action buttons (Escalate / Reject / Next) ── */}
      <div className="flex-shrink-0 min-h-[52px] px-5 py-2 flex flex-wrap items-center gap-2 bg-surface border-b border-border">
        <h2 className="flex-1 min-w-[180px] text-sm font-extrabold text-text uppercase tracking-wide leading-snug line-clamp-2 text-balance">
          {report.title}
        </h2>
        <div className="flex flex-wrap justify-end items-center gap-1.5">
          {/* Escalate — hover → success */}
          <button
            onClick={onVerify}
            disabled={verifyPending || !canVerify}
            aria-label="Escalate report"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em]
              border border-border text-muted bg-transparent transition-colors
              hover:border-success hover:text-success disabled:opacity-40"
          >
            <KbdChip label="E" /> {verifyPending ? "Escalating…" : "Escalate"}
          </button>

          {/* Reject — hover → danger */}
          <button
            onClick={onReject}
            disabled={rejectPending || !canReject}
            aria-label="Reject report"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em]
              border border-border text-muted bg-transparent transition-colors
              hover:border-danger hover:text-danger disabled:opacity-40"
          >
            <KbdChip label="R" /> {rejectPending ? "Rejecting…" : "Reject"}
          </button>

          {/* Next — bordered, no bg fill */}
          <button
            onClick={onNext}
            aria-label="Next report"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em]
              border border-border text-muted transition-colors
              hover:border-border/80 hover:text-text"
          >
            Next
            <KbdChip label="N" />
          </button>
        </div>
      </div>

      {/* ── Scrollable content column ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Badges row — plain bordered chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge
            status={report.status}
            size="sm"
            className="!rounded-none"
          />
          <span className="px-2.5 py-1 text-[11px] font-semibold bg-surface text-muted border border-border uppercase tracking-wide">
            {formatCategoryLabel(report.category)}
          </span>
          <SeverityBadge severity={report.severity} display="initial" />
        </div>

        {/* Description */}
        {report.description && (
          <p className="text-sm text-muted leading-relaxed border-l-2 border-border pl-3.5">
            {report.description}
          </p>
        )}

        <EvidencePanel photoUrls={photoUrls} />

        {/* Meta grid — condensed border-box style matching LE Interface */}
        <div className="grid grid-cols-2 border border-border">
          <div className="p-3 border-r border-b border-border">
            <p className="text-[9px] font-bold uppercase tracking-[0.05em] text-muted mb-1">
              Reporter
            </p>
            <p className="text-xs font-semibold text-text">{report.reporter}</p>
          </div>
          <div className="p-3 border-b border-border">
            <p className="text-[9px] font-bold uppercase tracking-[0.05em] text-muted mb-1">
              Location
            </p>
            <p className="text-xs font-semibold text-text leading-snug">
              {report.location}
            </p>
          </div>
          <div className="p-3 col-span-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.05em] text-muted mb-1">
              Submitted
            </p>
            <p className="text-xs font-semibold text-text tabular-nums">
              {new Date(report.createdAt).toLocaleString()}
            </p>
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
            markers={[
              {
                id: `report-${report.id}`,
                lat: report.latitude,
                lng: report.longitude,
                title: report.title || `Incident #${report.id}`,
              },
            ]}
            center={{ lat: report.latitude, lng: report.longitude }}
            height={160}
            zoom={15}
            autoFit={false}
            emptyMessage="No coordinates available."
          />
        </DetailSection>

        <CommunitySignalCard constellation={report.constellation} />

        {/* ML Insights */}
        <DetailSection
          title="ML Insights"
          headerRight={
            isMlLoading ? (
              <span className="text-[11px] text-muted animate-pulse">
                Loading…
              </span>
            ) : null
          }
        >
          {!isMlLoading && !mlSummary ? (
            <p className="text-sm text-muted">No ML data available.</p>
          ) : null}

          {mlSummary ? (
            <div className="space-y-2 text-sm">
              {[
                ["Suggested category", mlSummary.predictedCategory || "N/A"],
                ["Confidence", mlSummary.categoryConfidence],
                ["Risk score", mlSummary.riskScore],
                [
                  "Toxicity",
                  mlSummary.isToxic
                    ? `Flagged (${mlSummary.toxicityScore})`
                    : mlSummary.toxicityScore,
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted">{label}</span>
                  <span
                    className={`font-semibold ${
                      label === "Risk score" && mlSummary.riskScore >= 0.8
                        ? "text-error"
                        : label === "Risk score" && mlSummary.riskScore >= 0.5
                          ? "text-warning"
                          : label === "Toxicity" && mlSummary.isToxic
                            ? "text-error"
                            : "text-text"
                    }`}
                  >
                    {value}
                  </span>
                </div>
              ))}
              {mlSummary.predictedCategory &&
              mlSummary.predictedCategory !== report.category ? (
                <button
                  onClick={() =>
                    onApplySuggestedCategory(mlSummary.predictedCategory)
                  }
                  disabled={updateCategoryPending}
                  className="mt-2 w-full bg-surface hover:bg-surface/80 text-text text-xs font-bold uppercase tracking-[0.04em] py-2 disabled:opacity-50 transition-colors border border-border"
                >
                  {updateCategoryPending
                    ? "Updating…"
                    : "Apply Suggested Category"}
                </button>
              ) : null}
            </div>
          ) : null}
        </DetailSection>

        {/* Dedup candidates */}
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
      </div>
    </div>
  );
}

export default ReportDetail;
