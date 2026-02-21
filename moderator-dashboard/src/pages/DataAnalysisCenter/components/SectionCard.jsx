import React from 'react'

export default function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text font-display">{title}</span>
        <button className="w-6 h-6 flex items-center justify-center rounded-md text-muted hover:text-text hover:bg-surface transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M8.5 1L10.5 3M1 11H3.5L10.5 4L8.5 2L1.5 9V11Z"
              stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {children}
    </div>
  )
}
