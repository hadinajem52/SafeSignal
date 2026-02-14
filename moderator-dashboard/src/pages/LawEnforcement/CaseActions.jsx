import React from 'react'

function CaseActions({
  userRole,
  incidentStatus,
  statusMutationPending,
  canTransitionTo,
  onStatusUpdate,
  closeOutcome,
  onCloseOutcomeChange,
  caseId,
  onCaseIdChange,
  closeNotes,
  onCloseNotesChange,
  onCloseCase,
  closureOutcomes,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="font-bold text-gray-900 mb-3">Status Management</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(userRole === 'law_enforcement' || userRole === 'admin') && (
          <button
            onClick={() => onStatusUpdate('dispatched')}
            disabled={!canTransitionTo(incidentStatus, 'dispatched') || statusMutationPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Dispatch Unit
          </button>
        )}
        <button
          onClick={() => onStatusUpdate('on_scene')}
          disabled={!canTransitionTo(incidentStatus, 'on_scene') || statusMutationPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          On Scene
        </button>
        <button
          onClick={() => onStatusUpdate('investigating')}
          disabled={!canTransitionTo(incidentStatus, 'investigating') || statusMutationPending}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          Investigating
        </button>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <h5 className="font-semibold text-gray-900 mb-3">Close Case</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={closeOutcome}
            onChange={onCloseOutcomeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            {closureOutcomes.map((outcome) => (
              <option key={outcome.value} value={outcome.value}>
                {outcome.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={caseId}
            onChange={onCaseIdChange}
            placeholder="Case ID (required for Report Filed)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={onCloseCase}
            disabled={
              !canTransitionTo(incidentStatus, 'police_closed') ||
              statusMutationPending ||
              (closeOutcome === 'report_filed' && !caseId)
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Close Case
          </button>
        </div>
        <textarea
          value={closeNotes}
          onChange={onCloseNotesChange}
          placeholder="Officer notes"
          className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={3}
        />
        {closeOutcome === 'report_filed' && !caseId && (
          <p className="text-sm text-red-600 mt-2">Case ID is required for report filed.</p>
        )}
      </div>
    </div>
  )
}

export default CaseActions
