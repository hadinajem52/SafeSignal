import React from 'react'

function DetailSection({ title, headerRight, className = '', children }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`.trim()}>
      {(title || headerRight) ? (
        <div className="flex items-center justify-between mb-3">
          {title ? <h4 className="font-bold text-gray-900">{title}</h4> : <span />}
          {headerRight}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export default DetailSection
