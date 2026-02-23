import React from 'react'

function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmClassName = 'border border-danger/60 text-danger hover:bg-danger/10',
  confirmDisabled = false,
}) {
  if (!visible) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="bg-surface border border-border shadow-soft max-w-md w-full p-6"
      >
        <h3
          id="confirm-dialog-title"
          className="text-base font-extrabold text-text mb-2 font-display uppercase tracking-wide text-balance"
        >
          {title}
        </h3>
        <p id="confirm-dialog-desc" className="text-muted mb-6 text-sm text-pretty leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={confirmDisabled}
            className="px-4 py-2 border border-border text-muted text-sm font-semibold
              hover:text-text hover:bg-surface/80 transition-colors disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-[0.04em] transition-colors disabled:opacity-60 ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
