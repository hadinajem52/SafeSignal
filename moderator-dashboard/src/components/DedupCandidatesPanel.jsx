import React from 'react'
import GoogleMapPanel from './GoogleMapPanel'

function DedupCandidatesPanel({ dedup, isLoading, onMerge, isMerging, sourceIncident }) {
  const candidates = dedup?.dedupCandidates?.candidates || []
  const meta = dedup?.dedupCandidates || {}
  const source = sourceIncident || meta.sourceIncident || {}
  const hasSourceCoords = Number.isFinite(Number(source.latitude)) && Number.isFinite(Number(source.longitude))
  const plottedCandidates = candidates.filter((candidate) => (
    Number.isFinite(Number(candidate.latitude)) && Number.isFinite(Number(candidate.longitude))
  ))
  const dedupMapMarkers = hasSourceCoords
    ? [
      {
        id: `source-${source.incidentId || 'incident'}`,
        lat: source.latitude,
        lng: source.longitude,
        title: source.title || 'Current Incident',
      },
      ...plottedCandidates.map((candidate) => ({
        id: `candidate-${candidate.incidentId}`,
        lat: candidate.latitude,
        lng: candidate.longitude,
        title: candidate.title || `Candidate #${candidate.incidentId}`,
        weight: Math.max(1, Number(candidate.score) || 1),
      })),
    ]
    : []

  return (
    <div className="border border-border rounded-lg p-4 bg-surface/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-text text-sm">Potential Duplicates</h4>
        <span className="text-[11px] text-muted">
          {meta.radiusMeters || 500}m · {meta.timeHours || 1}h
        </span>
      </div>

      {source.title && (
        <div className="mb-3 rounded-lg border border-primary/15 bg-primary/5 p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Current Incident</div>
          <div className="text-sm font-medium text-text mt-0.5">{source.title}</div>
        </div>
      )}

      {!isLoading && candidates.length > 0 && (
        <div className="mb-3 text-[11px] text-muted">
          ML semantic similarity: {meta.mlEnhanced ? 'enabled' : 'fallback'} ({meta.mlCandidatesWithSimilarity ?? 0}/{candidates.length} candidates)
        </div>
      )}

      {!isLoading && dedupMapMarkers.length > 1 && (
        <div className="mb-3">
          <GoogleMapPanel
            markers={dedupMapMarkers}
            center={{ lat: source.latitude, lng: source.longitude }}
            radiusMeters={meta.radiusMeters}
            height={200}
            zoom={15}
            showClusters
            emptyMessage="Not enough coordinate data to render duplicate proximity map."
          />
          <div className="mt-1 text-[11px] text-muted">
            Proximity: 1 source + {plottedCandidates.length} candidates within {meta.radiusMeters || 500}m
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted animate-pulse">Loading candidates…</div>
      ) : candidates.length === 0 ? (
        <div className="text-sm text-muted">No duplicate candidates detected.</div>
      ) : (
        <div className="space-y-2.5">
          {candidates.map((candidate) => (
            <div key={candidate.incidentId} className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-text">Incident #{candidate.incidentId}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
                  Score {candidate.score}
                </span>
              </div>

              {candidate.title && (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Candidate</div>
                  <div className="text-sm font-medium text-text mt-0.5">{candidate.title}</div>
                </div>
              )}

              {candidate.description && (
                <div className="mt-1.5 text-xs text-muted line-clamp-2">{candidate.description}</div>
              )}

              <div className="mt-2 text-[11px] text-muted grid grid-cols-2 gap-1.5">
                <span>Distance: {candidate.distanceMeters}m</span>
                <span>Time Δ: {candidate.timeHours}h</span>
                <span>Text sim: {candidate.textSimilarity}</span>
                <span>Semantic: {candidate.mlSimilarity ?? 'N/A'}</span>
                <span>Entity overlap: {candidate.namedEntitySimilarity ?? 'N/A'}</span>
                <span>Category: {candidate.categoryMatch ? 'Yes' : 'No'}</span>
                <span>Same reporter: {candidate.sameReporter ? 'Yes' : 'No'}</span>
              </div>

              <div className="mt-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Shared Keywords</div>
                {(candidate.sharedKeywords || []).length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {candidate.sharedKeywords.map((keyword) => (
                      <span
                        key={`${candidate.incidentId}-${keyword}`}
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning/10 text-warning border border-warning/15"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted mt-0.5">No strong shared keywords.</div>
                )}
              </div>

              <div className="mt-2.5">
                <button
                  onClick={() => onMerge?.(candidate.incidentId)}
                  disabled={isMerging}
                  className="text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/15 px-3 py-1 rounded-lg disabled:opacity-40 transition-colors"
                >
                  {isMerging ? 'Linking…' : 'Mark as Duplicate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DedupCandidatesPanel
