import React from 'react'
import { Settings } from 'lucide-react'
import ToggleSettingRow from './ToggleSettingRow'

function ModerationSettings({ settings, isMutating, onAutoVerifyChange, onMinConfidenceChange }) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-soft p-6">
      <h2 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
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

        <div className="p-4 bg-surface rounded-lg">
          <label className="block text-sm font-medium text-text mb-3">
            Minimum Confidence Score for Auto-Verification: {settings.minConfidenceScore}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.minConfidenceScore}
            onChange={onMinConfidenceChange}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
            disabled={isMutating}
          />
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>Conservative</span>
              <span className="tabular-nums">{settings.minConfidenceScore}%</span>
              <span>Aggressive</span>
            </div>
            <div className="w-full h-2 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, settings.minConfidenceScore))}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-muted mt-2">Only reports above this score will be auto-verified</p>
        </div>
      </div>
    </div>
  )
}

export default ModerationSettings
