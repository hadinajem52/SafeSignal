import React from 'react'

function FilterDropdown({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text mb-2">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 border border-border bg-card text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default FilterDropdown
