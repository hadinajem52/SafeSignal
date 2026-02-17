import React from 'react'

function ToggleSettingRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
      <div>
        <p className="font-medium text-text">{label}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
          disabled={disabled}
        />
        <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
      </label>
    </div>
  )
}

export default ToggleSettingRow
