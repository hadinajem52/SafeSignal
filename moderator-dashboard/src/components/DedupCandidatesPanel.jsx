import GoogleMapPanel from './GoogleMapPanel'

function DedupCandidatesPanel({ dedup, isLoading, onMerge, isMerging, sourceIncident, onOpenCandidate }) {
  const candidates = dedup?.dedupCandidates?.candidates || []
  const linkedDuplicates = dedup?.linkedDuplicates || []
  const meta = dedup?.dedupCandidates || {}
  const source = sourceIncident || meta.sourceIncident || {}
  const isSourceMerged = source.status === 'merged'
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
    <div className="border border-border p-4 bg-surface/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-text text-sm">Potential Duplicates</h4>
        <span className="text-[11px] text-muted">
          {meta.radiusMeters || 500}m · {meta.timeHours || 1}h
        </span>
      </div>

      {source.title && (
        <div className="mb-3 border border-primary/15 bg-primary/5 p-2.5">
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

      {!isLoading && linkedDuplicates.length > 0 && (
        <div className="mb-4 border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
            <h5 className="text-xs font-bold text-text">Merged Duplicates</h5>
            <span className="text-[11px] font-semibold text-muted tabular-nums">
              {linkedDuplicates.length} stored
            </span>
          </div>
          <div className="divide-y divide-border">
            {linkedDuplicates.map((duplicate) => {
              const evidenceCount = (duplicate.photoUrls || duplicate.photo_urls || []).length
                + (duplicate.videoUrl || duplicate.video_url ? 1 : 0)
              const linkedAt = duplicate.linkedAt || duplicate.linked_at

              return (
                <div key={duplicate.incidentId} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenCandidate?.(duplicate.incidentId)}
                        className="text-left text-sm font-semibold text-text hover:text-primary hover:underline transition-colors"
                      >
                        Report #{duplicate.incidentId}
                        {duplicate.title ? ` · ${duplicate.title}` : ''}
                      </button>
                      {duplicate.description && (
                        <p className="mt-1 text-xs leading-relaxed text-muted line-clamp-2">
                          {duplicate.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenCandidate?.(duplicate.incidentId)}
                      className="flex-shrink-0 border border-border px-2.5 py-1 text-[10px] font-bold uppercase text-muted hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      Open
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-muted">
                    <span>Status: {duplicate.status || 'merged'}</span>
                    <span>Evidence: {evidenceCount}</span>
                    <span>Reporter: {duplicate.reporter || 'Anonymous'}</span>
                    <span>
                      Linked: {linkedAt ? new Date(linkedAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted animate-pulse">Loading candidates…</div>
      ) : candidates.length === 0 ? (
        <div className="text-sm text-muted">
          {linkedDuplicates.length > 0
            ? 'No new duplicate candidates detected.'
            : 'No duplicate candidates detected.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {candidates.map((candidate) => {
            const parentIncidentId = candidate.canonicalIncidentId || candidate.incidentId
            const parentTitle = candidate.canonicalTitle || candidate.title

            return (
            <div key={candidate.incidentId} className="bg-card border border-border p-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenCandidate?.(candidate.incidentId)}
                  className="font-semibold text-sm text-text hover:text-primary hover:underline transition-colors"
                >
                  Incident #{candidate.incidentId}
                </button>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-primary/10 text-primary border border-primary/15">
                  Score {candidate.score}
                </span>
              </div>

              {candidate.title && (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Candidate</div>
                  <button
                    type="button"
                    onClick={() => onOpenCandidate?.(candidate.incidentId)}
                    className="text-left text-sm font-medium text-text mt-0.5 hover:text-primary hover:underline transition-colors"
                  >
                    {candidate.title}
                  </button>
                </div>
              )}

              {candidate.description && (
                <div className="mt-1.5 text-xs text-muted line-clamp-2">{candidate.description}</div>
              )}

              {candidate.matchedViaMergedDuplicate && (
                <div className="mt-2 border border-primary/15 bg-primary/5 p-2 text-[11px] text-muted">
                  <span className="font-semibold text-primary">Suggested parent:</span>{' '}
                  Report #{parentIncidentId}{parentTitle ? ` · ${parentTitle}` : ''}
                  <div className="mt-0.5">Matched through already-merged report #{candidate.incidentId}.</div>
                </div>
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
                        className="px-2 py-0.5 text-[10px] font-semibold bg-warning/10 text-warning border border-warning/15"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted mt-0.5">No strong shared keywords.</div>
                )}
              </div>

              {!isSourceMerged && (
                <div className="mt-2.5">
                  <button
                    onClick={() => onMerge?.(candidate.incidentId)}
                    disabled={isMerging}
                    className="text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/15 px-3 py-1 disabled:opacity-40 transition-colors"
                  >
                    {isMerging ? 'Linking…' : `Merge into Parent #${parentIncidentId}`}
                  </button>
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DedupCandidatesPanel
