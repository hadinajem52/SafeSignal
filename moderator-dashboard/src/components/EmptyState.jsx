import React from 'react'

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center select-none">
      {Icon ? (
        <div className="mb-3 text-border">
          <Icon size={20} strokeWidth={1.5} />
        </div>
      ) : null}
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted/60">
        {message}
      </p>
    </div>
  )
}

export default EmptyState
