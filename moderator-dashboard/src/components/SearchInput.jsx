import React from 'react'

function SearchInput({ label, icon: Icon, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text mb-2">
        {Icon ? <Icon className="inline mr-2" size={18} /> : null}
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-border bg-card text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  )
}

export default SearchInput
