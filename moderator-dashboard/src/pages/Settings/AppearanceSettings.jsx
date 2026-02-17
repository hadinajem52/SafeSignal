import React from 'react'
import { Moon } from 'lucide-react'
import ToggleSettingRow from './ToggleSettingRow'

function AppearanceSettings({ darkMode, isMutating, onDarkModeChange }) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-soft p-6">
      <h2 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
        <Moon size={24} />
        Appearance
      </h2>

      <ToggleSettingRow
        label="Dark Mode"
        description="Use a dark interface theme across the dashboard."
        checked={darkMode}
        onChange={onDarkModeChange}
        disabled={isMutating}
      />

      <div className="mt-4 p-4 bg-surface rounded-lg border border-border">
        <p className="text-sm font-semibold text-text mb-3">Theme Preview</p>
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-lg border p-3 ${!darkMode ? 'border-primary bg-white' : 'border-border bg-white'}`}>
            <p className="text-xs text-gray-500">Light</p>
            <div className="mt-2 h-10 rounded bg-gray-100 border border-gray-200" />
          </div>
          <div className={`rounded-lg border p-3 ${darkMode ? 'border-primary bg-gray-900' : 'border-border bg-gray-900'}`}>
            <p className="text-xs text-gray-300">Dark</p>
            <div className="mt-2 h-10 rounded bg-gray-700 border border-gray-600" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppearanceSettings
