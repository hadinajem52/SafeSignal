import React from 'react'

function LoadingState({ message = '' }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        {message ? <p className="text-sm text-gray-600 mt-3">{message}</p> : null}
      </div>
    </div>
  )
}

export default LoadingState
