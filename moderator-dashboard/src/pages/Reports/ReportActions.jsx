import React from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

function ReportActions({ verifyPending, rejectPending, onVerify, onReject, onClose }) {
  return (
    <div className="pt-6 border-t border-border flex gap-3">
      <button
        onClick={onVerify}
        disabled={verifyPending}
        className="flex-1 bg-success hover:opacity-90 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <CheckCircle size={20} />
        {verifyPending ? 'Verifying...' : 'Verify (V)'}
      </button>
      <button
        onClick={onReject}
        disabled={rejectPending}
        className="flex-1 bg-danger hover:opacity-90 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <XCircle size={20} />
        {rejectPending ? 'Rejecting...' : 'Reject (R)'}
      </button>
      <button
        onClick={onClose}
        className="flex-1 bg-surface hover:bg-bg border border-border text-text font-medium py-2 rounded-lg transition-colors"
      >
        Close
      </button>
    </div>
  )
}

export default ReportActions
