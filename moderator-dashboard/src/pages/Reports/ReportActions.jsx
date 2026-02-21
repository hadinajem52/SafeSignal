import React from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

function ReportActions({ verifyPending, rejectPending, onVerify, onReject }) {
  return (
    <div className="pt-5 border-t border-border flex gap-2">
      <button
        onClick={onVerify}
        disabled={verifyPending}
        className="flex-1 bg-success/15 hover:bg-success/25 text-success border border-success/20
          font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2
          disabled:opacity-40 text-sm"
      >
        <CheckCircle size={16} />
        {verifyPending ? 'Escalating…' : 'Escalate'}
      </button>
      <button
        onClick={onReject}
        disabled={rejectPending}
        className="flex-1 bg-error/15 hover:bg-error/25 text-error border border-error/20
          font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2
          disabled:opacity-40 text-sm"
      >
        <XCircle size={16} />
        {rejectPending ? 'Rejecting…' : 'Reject'}
      </button>
    </div>
  )
}

export default ReportActions
