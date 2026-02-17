import React from 'react'

function DangerActionPanel({
  title,
  description,
  confirmationText,
  inputValue,
  onInputChange,
  inputPlaceholder,
  buttonLabel,
  pendingLabel,
  isPending,
  onAction,
  controlsClassName = '',
}) {
  const isEnabled = inputValue === confirmationText && !isPending

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-5">
      <h3 className="text-red-800 font-semibold mb-2">{title}</h3>
      <p className="text-sm text-red-700 mb-3">{description}</p>
      <p className="text-sm text-red-700 mb-2">
        Type <strong>{confirmationText}</strong> to enable this action.
      </p>
      <div className={`flex flex-wrap gap-2 ${controlsClassName}`.trim()}>
        <input
          type="text"
          value={inputValue}
          onChange={onInputChange}
          placeholder={inputPlaceholder}
          className="px-3 py-2 border border-red-300 bg-white rounded w-56"
        />
        <button
          onClick={onAction}
          disabled={!isEnabled}
          className="px-4 py-2 rounded bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-50"
        >
          {isPending ? pendingLabel : buttonLabel}
        </button>
      </div>
    </div>
  )
}

export default DangerActionPanel
