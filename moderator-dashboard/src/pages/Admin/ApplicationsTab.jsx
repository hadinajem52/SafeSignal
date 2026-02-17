import React, { useState } from 'react'
import { CheckCircle2, UserCheck, XCircle } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import LoadingState from '../../components/LoadingState'

function ApplicationsTab({
  applications,
  isLoading,
  approvePending,
  rejectPending,
  onApprove,
  onReject,
}) {
  const [pendingReject, setPendingReject] = useState(null)

  if (isLoading) {
    return <LoadingState />
  }

  if (!applications.length) {
    return <EmptyState icon={UserCheck} message="No pending moderator or LE applications." />
  }

  return (
    <>
      <div className="space-y-4">
        {applications.map((application) => (
          <div
            key={application.id}
            className="rounded-lg border border-gray-200 bg-white p-5 flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-lg font-semibold text-gray-900">{application.username}</p>
              <p className="text-sm text-gray-600">{application.email}</p>
              <p className="text-sm mt-2">
                <span className="inline-flex px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                  {application.role === 'law_enforcement' ? 'LAW ENFORCEMENT' : 'MODERATOR'}
                </span>
                <span className="ml-3 text-gray-500">
                  Applied {new Date(application.appliedAt).toLocaleString()}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onApprove(application.id)}
                disabled={approvePending || rejectPending}
                className="px-4 py-2 rounded bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                Approve
              </button>
              <button
                onClick={() => {
                  setPendingReject({
                    id: application.id,
                    username: application.username,
                  })
                }}
                disabled={approvePending || rejectPending}
                className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle size={16} />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        visible={Boolean(pendingReject)}
        title="Reject Application?"
        message={`Reject ${pendingReject?.username || 'this user'}'s application? This deletes the pending account.`}
        confirmLabel="Reject Application"
        onConfirm={() => {
          if (!pendingReject) return
          onReject(pendingReject.id)
          setPendingReject(null)
        }}
        onCancel={() => setPendingReject(null)}
      />
    </>
  )
}

export default ApplicationsTab
