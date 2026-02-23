import React from 'react'

function LoadingState({ message = '' }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
      <div className="w-5 h-5 border border-border border-t-muted/60 rounded-full animate-spin" />
      {message ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted/60">{message}</p>
      ) : null}
    </div>
  )
}

export default LoadingState
