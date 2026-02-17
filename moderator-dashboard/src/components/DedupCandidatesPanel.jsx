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
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-text">Potential Duplicates</h4>
        <span className="text-xs text-muted">
          {meta.radiusMeters || 500}m • {meta.timeHours || 1}h
        </span>
      </div>
      {source.title && (
        <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 p-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Current Incident</div>
          <div className="text-sm font-medium text-blue-900">{source.title}</div>
        </div>
      )}
      {!isLoading && candidates.length > 0 && (
        <div className="mb-3 text-xs text-muted">
          ML semantic similarity: {meta.mlEnhanced ? 'enabled' : 'fallback'} ({meta.mlCandidatesWithSimilarity ?? 0}/{candidates.length} candidates)
        </div>
      )}
      {!isLoading && dedupMapMarkers.length > 1 && (
        <div className="mb-3">
          <GoogleMapPanel
            markers={dedupMapMarkers}
            center={{ lat: source.latitude, lng: source.longitude }}
            radiusMeters={meta.radiusMeters}
            height={230}
            zoom={15}
            showClusters
            emptyMessage="Not enough coordinate data to render duplicate proximity map."
          />
          <div className="mt-1 text-xs text-muted">
            Proximity view: 1 source incident + {plottedCandidates.length} candidates within {meta.radiusMeters || 500}m.
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted">Loading candidates...</div>
      ) : candidates.length === 0 ? (
        <div className="text-sm text-muted">No duplicate candidates detected.</div>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <div key={candidate.incidentId} className="bg-card border border-border rounded-md p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text">Incident #{candidate.incidentId}</span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  Score {candidate.score}
                </span>
              </div>
              {candidate.title && (
                <div className="mt-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Candidate Incident</div>
                  <div className="text-sm font-medium text-text">{candidate.title}</div>
                </div>
              )}
              {candidate.description && (
                <div className="mt-1 text-xs text-muted">{candidate.description}</div>
              )}
              <div className="mt-2 text-xs text-muted grid grid-cols-2 gap-2">
                <span>Distance: {candidate.distanceMeters}m</span>
                <span>Time Δ: {candidate.timeHours}h</span>
                <span>Text sim: {candidate.textSimilarity}</span>
                <span>Semantic sim: {candidate.mlSimilarity ?? 'N/A'}</span>
                <span>Entity overlap: {candidate.namedEntitySimilarity ?? 'N/A'}</span>
                <span>Category match: {candidate.categoryMatch ? 'Yes' : 'No'}</span>
                <span>Same reporter: {candidate.sameReporter ? 'Yes' : 'No'}</span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Shared Keywords</div>
                {(candidate.sharedKeywords || []).length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {candidate.sharedKeywords.map((keyword) => (
                      <span
                        key={`${candidate.incidentId}-${keyword}`}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted mt-1">No strong shared keywords.</div>
                )}
              </div>
              <div className="mt-3">
                <button
                  onClick={() => onMerge?.(candidate.incidentId)}
                  disabled={isMerging}
                  className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded disabled:opacity-50"
                >
                  {isMerging ? 'Linking...' : 'Mark as Duplicate'}
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
