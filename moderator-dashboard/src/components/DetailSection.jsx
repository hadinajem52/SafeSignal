import React from 'react'

function DetailSection({ title, headerRight, className = '', children }) {
  return (
    <div className={`bg-surface/40 border border-border p-4 ${className}`.trim()}>
      {(title || headerRight) ? (
        <div className="flex items-center justify-between mb-3">
          {title ? (
            <h4 className="text-sm font-bold text-text">{title}</h4>
          ) : <span />}
          {headerRight}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export default DetailSection
