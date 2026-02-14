import React from 'react'

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      {Icon ? <Icon size={48} className="mx-auto text-gray-400 mb-4" /> : null}
      <p className="text-gray-600">{message}</p>
    </div>
  )
}

export default EmptyState
