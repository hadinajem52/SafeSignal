import React, { useState } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'

/**
 * DangerActionPanel
 *
 * Two-gate destruction: type the exact phrase to unlock the button,
 * then confirm a final AlertDialog before the action fires.
 */
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
}) {
  const [finalDialog, setFinalDialog] = useState(false)
  const isUnlocked = inputValue === confirmationText

  return (
    <>
      <div
        className={`flex items-start gap-4 p-4 border transition-colors ${
          isUnlocked
            ? 'border-danger/50 bg-danger/5'
            : 'border-border bg-surface'
        }`}
      >
        {/* Icon */}
        <div
          className={`w-8 h-8 flex-shrink-0 border flex items-center justify-center transition-colors ${
            isUnlocked ? 'border-danger/60 text-danger' : 'border-border text-muted'
          }`}
        >
          {isUnlocked ? <ShieldAlert size={15} /> : <AlertTriangle size={15} />}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-bold mb-1 transition-colors ${
              isUnlocked ? 'text-danger' : 'text-text'
            }`}
          >
            {title}
          </p>
          <p className="text-[11px] text-muted leading-relaxed">{description}</p>
          <p className="text-[11px] text-muted mt-1">
            Type{' '}
            <span className="font-mono font-bold text-warning">{confirmationText}</span>{' '}
            to enable this action.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0 self-center">
          <input
            type="text"
            value={inputValue}
            onChange={onInputChange}
            placeholder={inputPlaceholder}
            className={`bg-bg border font-mono text-[11px] font-medium px-2.5 py-1.5 outline-none w-40 transition-colors ${
              isUnlocked
                ? 'border-danger/70 text-danger'
                : 'border-border text-text focus:border-muted'
            }`}
          />
          <button
            onClick={() => setFinalDialog(true)}
            disabled={!isUnlocked || isPending}
            className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border transition-all whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed ${
              isUnlocked
                ? 'border-danger text-danger bg-danger/10 hover:bg-danger hover:text-white'
                : 'border-border text-muted bg-transparent'
            }`}
          >
            {isPending ? pendingLabel : buttonLabel}
          </button>
        </div>
      </div>

      {/* Final confirmation gate */}
      <ConfirmDialog
        visible={finalDialog}
        title="Final Confirmation Required"
        message={`You are about to execute: "${title}". ${description} This action is permanent and cannot be reversed. Are you certain?`}
        confirmLabel="I Understand — Proceed"
        cancelLabel="Cancel"
        confirmClassName="bg-danger text-white hover:opacity-90"
        onConfirm={() => {
          setFinalDialog(false)
          onAction()
        }}
        onCancel={() => setFinalDialog(false)}
      />
    </>
  )
}

export default DangerActionPanel
