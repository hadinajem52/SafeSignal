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
      <div className="grid gap-4">
        {applications.map((application) => (
          <div
            key={application.id}
            className="rounded-lg border border-border bg-card shadow-soft p-5 flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-lg font-semibold text-text">{application.username}</p>
              <p className="text-sm text-muted">{application.email}</p>
              <p className="text-sm mt-2">
                <span className="inline-flex px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                  {application.role === 'law_enforcement' ? 'LAW ENFORCEMENT' : 'MODERATOR'}
                </span>
                <span className="ml-3 text-muted">
                  Applied {new Date(application.appliedAt).toLocaleString()}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onApprove(application.id)}
                disabled={approvePending || rejectPending}
                className="px-4 py-2 rounded bg-success text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
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
                className="px-4 py-2 rounded bg-danger text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
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
