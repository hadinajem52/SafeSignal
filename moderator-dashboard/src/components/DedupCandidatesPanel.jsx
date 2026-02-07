import React from 'react'

function DedupCandidatesPanel({ dedup, isLoading, onMerge, isMerging }) {
  const candidates = dedup?.dedupCandidates?.candidates || []
  const meta = dedup?.dedupCandidates || {}

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-gray-900">Potential Duplicates</h4>
        <span className="text-xs text-gray-500">
          {meta.radiusMeters || 500}m • {meta.timeHours || 1}h
        </span>
      </div>

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
              <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-2">
                <span>Distance: {candidate.distanceMeters}m</span>
                <span>Time Δ: {candidate.timeHours}h</span>
                <span>Text sim: {candidate.textSimilarity}</span>
                <span>Category match: {candidate.categoryMatch ? 'Yes' : 'No'}</span>
                <span>Same reporter: {candidate.sameReporter ? 'Yes' : 'No'}</span>
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
