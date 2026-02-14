import React from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

function ReportActions({ verifyPending, rejectPending, onVerify, onReject, onClose }) {
  return (
    <div className="pt-6 border-t border-gray-200 flex gap-3">
      <button
        onClick={onVerify}
        disabled={verifyPending}
        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <CheckCircle size={20} />
        {verifyPending ? 'Verifying...' : 'Verify'}
      </button>
      <button
        onClick={onReject}
        disabled={rejectPending}
        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <XCircle size={20} />
        {rejectPending ? 'Rejecting...' : 'Reject'}
      </button>
      <button
        onClick={onClose}
        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition-colors"
      >
        Close
      </button>
    </div>
  )
}

export default ReportActions
