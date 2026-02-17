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
    </div>
  )
}

export default AppearanceSettings
