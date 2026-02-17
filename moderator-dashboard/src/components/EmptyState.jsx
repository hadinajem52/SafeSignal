import React from 'react'

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-soft p-12 text-center">
      {Icon ? <Icon size={48} className="mx-auto text-muted mb-4" /> : null}
      <p className="text-muted">{message}</p>
    </div>
  )
}

export default EmptyState
