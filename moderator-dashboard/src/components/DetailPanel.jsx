import React from 'react'

function DetailPanel({ visible, title, subtitle, headerClassName = 'from-blue-600 to-blue-700', onClose, maxWidthClass = 'max-w-3xl', children }) {
  if (!visible) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-card border border-border rounded-lg shadow-soft ${maxWidthClass} w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`sticky top-0 bg-gradient-to-r ${headerClassName} text-white p-6 flex justify-between items-center rounded-t-lg`}>
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle ? <p className="text-sm text-blue-100">{subtitle}</p> : null}
          </div>
          <button aria-label="Close detail panel" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default DetailPanel
