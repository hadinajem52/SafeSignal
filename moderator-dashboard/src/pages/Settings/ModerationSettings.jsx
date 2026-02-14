import React from 'react'
import { Settings } from 'lucide-react'
import ToggleSettingRow from './ToggleSettingRow'

function ModerationSettings({ settings, isMutating, onAutoVerifyChange, onMinConfidenceChange }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Settings size={24} />
        Moderation Settings
      </h2>

      <div className="space-y-4">
        <ToggleSettingRow
          label="Auto-Verify Reports"
          description="Automatically verify reports with high confidence"
          checked={settings.autoVerify}
          onChange={onAutoVerifyChange}
          disabled={isMutating}
        />

        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Minimum Confidence Score for Auto-Verification: {settings.minConfidenceScore}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.minConfidenceScore}
            onChange={onMinConfidenceChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={isMutating}
          />
          <p className="text-sm text-gray-600 mt-2">Only reports above this score will be auto-verified</p>
        </div>
      </div>
    </div>
  )
}

export default ModerationSettings
