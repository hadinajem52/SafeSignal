import React from 'react'
import { RotateCcw, Save } from 'lucide-react'

function SettingsActions({
  hasChanges,
  isMutating,
  savePending,
  resetPending,
  onSave,
  onReset,
  errorMessage,
  saved,
  successMessage,
}) {
  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={!hasChanges || isMutating}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:opacity-90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {savePending ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={onReset}
          disabled={isMutating}
          className="flex items-center gap-2 px-6 py-3 bg-surface border border-border hover:bg-bg text-text font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw size={20} />
          {resetPending ? 'Resetting...' : 'Reset to Defaults'}
        </button>
      </div>

      {errorMessage ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <div className="w-2 h-2 bg-red-600 rounded-full" />
          <p className="text-red-800">{errorMessage}</p>
        </div>
      ) : null}

      {saved ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="w-2 h-2 bg-green-600 rounded-full" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      ) : null}
    </>
  )
}

export default SettingsActions
