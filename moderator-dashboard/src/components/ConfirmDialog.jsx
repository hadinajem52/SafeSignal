import React from 'react'

function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmClassName = 'bg-red-600 hover:bg-red-700',
  confirmDisabled = false,
}) {
  if (!visible) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-card border border-border rounded-lg shadow-soft max-w-md w-full p-6"
      >
        <h3 id="confirm-dialog-title" className="text-xl font-bold text-text mb-2">
          {title}
        </h3>
        <p className="text-muted mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={confirmDisabled}
            className="px-4 py-2 rounded-lg border border-border text-text hover:bg-surface disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 rounded-lg text-white font-medium disabled:opacity-60 ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
