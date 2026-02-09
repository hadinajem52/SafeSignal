import React from 'react'

function DedupCandidatesPanel({ dedup, isLoading, onMerge, isMerging, sourceIncident }) {
  const candidates = dedup?.dedupCandidates?.candidates || []
  const meta = dedup?.dedupCandidates || {}
  const source = sourceIncident || meta.sourceIncident || {}

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-gray-900">Potential Duplicates</h4>
        <span className="text-xs text-gray-500">
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
        <div className="mb-3 text-xs text-gray-600">
          ML semantic similarity: {meta.mlEnhanced ? 'enabled' : 'fallback'} ({meta.mlCandidatesWithSimilarity ?? 0}/{candidates.length} candidates)
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading candidates...</div>
      ) : candidates.length === 0 ? (
        <div className="text-sm text-gray-600">No duplicate candidates detected.</div>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <div key={candidate.incidentId} className="bg-white border border-gray-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Incident #{candidate.incidentId}</span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  Score {candidate.score}
                </span>
              </div>
              {candidate.title && (
                <div className="mt-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Candidate Incident</div>
                  <div className="text-sm font-medium text-gray-900">{candidate.title}</div>
                </div>
              )}
              {candidate.description && (
                <div className="mt-1 text-xs text-gray-600">{candidate.description}</div>
              )}
              <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-2">
                <span>Distance: {candidate.distanceMeters}m</span>
                <span>Time Δ: {candidate.timeHours}h</span>
                <span>Text sim: {candidate.textSimilarity}</span>
                <span>Semantic sim: {candidate.mlSimilarity ?? 'N/A'}</span>
                <span>Entity overlap: {candidate.namedEntitySimilarity ?? 'N/A'}</span>
                <span>Category match: {candidate.categoryMatch ? 'Yes' : 'No'}</span>
                <span>Same reporter: {candidate.sameReporter ? 'Yes' : 'No'}</span>
              </div>
              <div className="mt-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Shared Keywords</div>
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
                  <div className="text-xs text-gray-500 mt-1">No strong shared keywords.</div>
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
