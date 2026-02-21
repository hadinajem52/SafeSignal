import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHeader from '../../components/PageHeader'
import { reportsAPI } from '../../services/api'
import ReportDetail from './ReportDetail'
import ReportFilters from './ReportFilters'
import ReportList from './ReportList'

// Priority score: severity weight × log-age so old critical reports float to top
// and fresh low-severity ones don't crowd them out.
const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 }

function getPriorityScore(report) {
  const rank = SEVERITY_RANK[report.severity] || 0
  const ageHours = (Date.now() - new Date(report.createdAt).getTime()) / 3_600_000
  return rank * Math.log(Math.max(ageHours, 0.01) + 1)
}

function normalizeReport(incident) {
  return {
    ...incident,
    id: incident.incident_id,
    reporter: incident.username || 'Anonymous',
    location: incident.location_name || `${incident.latitude}, ${incident.longitude}`,
    createdAt: incident.created_at || incident.incident_date,
  }
}

function Reports() {
  // Default to the combined 'Needs Review' view so auto_flagged reports are visible
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('submitted,auto_flagged,auto_processed')
  const [sortMode, setSortMode] = useState('urgency') // 'urgency' | 'time'
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedReportIds, setSelectedReportIds] = useState([])
  const [bulkActionPending, setBulkActionPending] = useState(null)
  const [bulkConfirmAction, setBulkConfirmAction] = useState(null) // 'verify' | 'reject' | null
  const [toasts, setToasts] = useState([])

  const queryClient = useQueryClient()

  const pushToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
    const duration = type === 'error' ? 5000 : 3200
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
  }, [])

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const result = await reportsAPI.getAll(params)
      return result.success ? result.data : []
    },
  })

  const { data: dedupData, isLoading: isDedupLoading } = useQuery({
    queryKey: ['report-dedup', selectedReport?.id],
    queryFn: async () => {
      if (!selectedReport?.id) return null
      const result = await reportsAPI.getDedup(selectedReport.id)
      return result.success ? result.data : null
    },
    enabled: Boolean(selectedReport?.id),
  })

  const { data: mlSummary, isLoading: isMlLoading } = useQuery({
    queryKey: ['report-ml', selectedReport?.id],
    queryFn: async () => {
      if (!selectedReport?.id) return null
      const result = await reportsAPI.getMlSummary(selectedReport.id)
      return result.success ? result.data : null
    },
    enabled: Boolean(selectedReport?.id),
  })

  const verifyMutation = useMutation({ mutationFn: (id) => reportsAPI.verify(id) })
  const rejectMutation = useMutation({ mutationFn: (id) => reportsAPI.reject(id, 'Rejected by moderator') })

  const linkDuplicateMutation = useMutation({
    mutationFn: (duplicateIncidentId) => reportsAPI.linkDuplicate(selectedReport.id, duplicateIncidentId),
  })

  const updateCategoryMutation = useMutation({
    mutationFn: (category) => reportsAPI.updateCategory(selectedReport.id, category),
  })

  const filteredReports = useMemo(() => {
    const q = searchTerm.toLowerCase()
    // Build a set so multi-value filters like 'submitted,auto_flagged' work correctly
    const activeStatuses = statusFilter === 'all'
      ? null
      : new Set(statusFilter.split(',').map((s) => s.trim()))

    return reports
      .filter((report) => {
        const matchesSearch =
          report.title.toLowerCase().includes(q) ||
          report.description.toLowerCase().includes(q)
        const matchesStatus = !activeStatuses || activeStatuses.has(report.status)
        return matchesSearch && matchesStatus
      })
      .map(normalizeReport)
      .sort((a, b) =>
        sortMode === 'time'
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : getPriorityScore(b) - getPriorityScore(a)
      )
  }, [reports, searchTerm, statusFilter, sortMode])

  // Auto-select first report when list loads so the right panel isn't blank
  useEffect(() => {
    if (!selectedReport && filteredReports.length > 0) {
      setSelectedReport(filteredReports[0])
    }
  }, [filteredReports, selectedReport])

  // Keep selection valid if filters remove the currently selected report
  useEffect(() => {
    setSelectedReportIds((prev) => prev.filter((id) => filteredReports.some((r) => r.id === id)))
  }, [filteredReports])

  const invalidateReports = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['reports'] })
  }, [queryClient])

  const handleVerify = useCallback(async (reportId, source = 'single') => {
    const result = await verifyMutation.mutateAsync(reportId)
    if (!result.success) {
      pushToast(result.error || 'Failed to escalate report.', 'error')
      return false
    }
    invalidateReports()
    setSelectedReportIds((prev) => prev.filter((id) => id !== reportId))
    if (selectedReport?.id === reportId) setSelectedReport(null)
    if (source === 'single') pushToast('Report escalated successfully.')
    return true
  }, [invalidateReports, pushToast, selectedReport?.id, verifyMutation])

  const handleReject = useCallback(async (reportId, source = 'single') => {
    const result = await rejectMutation.mutateAsync(reportId)
    if (!result.success) {
      pushToast(result.error || 'Failed to reject report.', 'error')
      return false
    }
    invalidateReports()
    setSelectedReportIds((prev) => prev.filter((id) => id !== reportId))
    if (selectedReport?.id === reportId) setSelectedReport(null)
    if (source === 'single') pushToast('Report rejected successfully.')
    return true
  }, [invalidateReports, pushToast, rejectMutation, selectedReport?.id])

  // Called after confirmation dialog is confirmed
  const executeBulkAction = async (action) => {
    if (!selectedReportIds.length || bulkActionPending) return
    setBulkActionPending(action)
    try {
      const actionFn =
        action === 'verify'
          ? reportsAPI.verify
          : (id) => reportsAPI.reject(id, 'Rejected by moderator')

      const outcomes = await Promise.all(selectedReportIds.map((id) => actionFn(id)))
      const successCount = outcomes.filter((r) => r.success).length
      const failedCount = outcomes.length - successCount

      if (successCount > 0) {
        invalidateReports()
        setSelectedReportIds([])
        if (selectedReport && selectedReportIds.includes(selectedReport.id)) {
          setSelectedReport(null)
        }
      }

      if (failedCount === 0) {
        pushToast(`${successCount} reports ${action === 'verify' ? 'escalated' : 'rejected'} successfully.`)
      } else {
        pushToast(
          `${successCount} succeeded, ${failedCount} failed during bulk ${action}.`,
          failedCount === outcomes.length ? 'error' : 'warning'
        )
      }
    } catch {
      pushToast(`Bulk ${action} failed. Please try again.`, 'error')
    } finally {
      setBulkActionPending(null)
    }
  }

  const handleToggleSelection = (reportId) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    )
  }

  const handleToggleSelectAll = () => {
    if (!filteredReports.length) return
    setSelectedReportIds(
      selectedReportIds.length === filteredReports.length ? [] : filteredReports.map((r) => r.id)
    )
  }

  const handleSelectNextReport = useCallback(() => {
    if (!filteredReports.length) return
    if (!selectedReport) { setSelectedReport(filteredReports[0]); return }
    const idx = filteredReports.findIndex((r) => r.id === selectedReport.id)
    setSelectedReport(filteredReports[idx < 0 ? 0 : (idx + 1) % filteredReports.length])
  }, [filteredReports, selectedReport])

  // Keyboard shortcuts — E escalate, R reject, N next
  useEffect(() => {
    const handleKeydown = (event) => {
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const key = event.key.toLowerCase()
      if (key === 'n') { event.preventDefault(); handleSelectNextReport(); return }
      if (!selectedReport) return
      if (key === 'e' && !verifyMutation.isPending) { event.preventDefault(); handleVerify(selectedReport.id) }
      if (key === 'r' && !rejectMutation.isPending) { event.preventDefault(); handleReject(selectedReport.id) }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [handleReject, handleSelectNextReport, handleVerify, rejectMutation.isPending, selectedReport, verifyMutation.isPending])

  return (
    <div className="space-y-3">
      <PageHeader title="Reports Queue" />

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[280px] max-w-[420px] rounded-lg border px-4 py-3 shadow-soft ${toast.type === 'error'
              ? 'border-danger/40 bg-danger/10 text-danger'
              : toast.type === 'warning'
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-success/40 bg-success/10 text-success'
              }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <ReportFilters
        searchTerm={searchTerm}
        onSearchChange={(event) => setSearchTerm(event.target.value)}
        statusFilter={statusFilter}
        onStatusFilterChange={(event) => setStatusFilter(event.target.value)}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        totalResults={filteredReports.length}
        selectedCount={selectedReportIds.length}
        bulkActionPending={bulkActionPending}
        onBulkVerify={() => setBulkConfirmAction('verify')}
        onBulkReject={() => setBulkConfirmAction('reject')}
      />

      {/* ── Split-pane: queue left, detail right ── */}
      <div
        className="grid overflow-hidden rounded-xl border border-border bg-card"
        style={{ gridTemplateColumns: '5fr 8fr', height: '74vh', minHeight: '520px' }}
      >
        {/* Left: scrollable report queue */}
        <div className="border-r border-border h-full overflow-hidden flex flex-col">
          <ReportList
            reports={filteredReports}
            isLoading={isLoading}
            selectedReportId={selectedReport?.id ?? null}
            onSelectReport={setSelectedReport}
            selectedReportIds={selectedReportIds}
            onToggleSelection={handleToggleSelection}
            onToggleSelectAll={handleToggleSelectAll}
          />
        </div>

        {/* Right: detail panel */}
        <div className="h-full overflow-hidden">
          <ReportDetail
            report={selectedReport}
            mlSummary={mlSummary}
            isMlLoading={isMlLoading}
            dedupData={dedupData}
            isDedupLoading={isDedupLoading}
            isMerging={linkDuplicateMutation.isPending}
            updateCategoryPending={updateCategoryMutation.isPending}
            verifyPending={verifyMutation.isPending}
            rejectPending={rejectMutation.isPending}
            onMerge={async (duplicateIncidentId) => {
              const result = await linkDuplicateMutation.mutateAsync(duplicateIncidentId)
              if (!result.success) { pushToast(result.error || 'Failed to merge duplicate.', 'error'); return }
              queryClient.invalidateQueries({ queryKey: ['reports'] })
              queryClient.invalidateQueries({ queryKey: ['report-dedup', selectedReport?.id] })
              pushToast('Duplicate linked successfully.')
            }}
            onApplySuggestedCategory={async (category) => {
              const result = await updateCategoryMutation.mutateAsync(category)
              if (!result.success) { pushToast(result.error || 'Failed to update category.', 'error'); return }
              queryClient.invalidateQueries({ queryKey: ['reports'] })
              queryClient.invalidateQueries({ queryKey: ['report-ml', selectedReport?.id] })
              pushToast('Category updated successfully.')
            }}
            onVerify={() => handleVerify(selectedReport.id)}
            onReject={() => handleReject(selectedReport.id)}
            onNext={handleSelectNextReport}
            onOpenDuplicateCandidate={async (duplicateIncidentId) => {
              const duplicateId = Number(duplicateIncidentId)
              if (!Number.isFinite(duplicateId)) {
                pushToast('Unable to open duplicate incident: invalid incident id.', 'error')
                return
              }

              const inQueue = filteredReports.find((r) => Number(r.id) === duplicateId)
              if (inQueue) {
                setSelectedReport(inQueue)
                return
              }

              const result = await reportsAPI.getById(duplicateId)
              if (!result.success || !result.data) {
                pushToast(result.error || 'Failed to open duplicate incident.', 'error')
                return
              }

              setSelectedReport(normalizeReport(result.data))
            }}
          />
        </div>
      </div>

      {/* Bulk action confirmation — prevents accidental mass-actions */}
      <ConfirmDialog
        visible={Boolean(bulkConfirmAction)}
        title={`Bulk ${bulkConfirmAction === 'verify' ? 'Escalate' : 'Reject'} ${selectedReportIds.length} report${selectedReportIds.length !== 1 ? 's' : ''}?`}
        message={
          bulkConfirmAction === 'verify'
            ? `This will escalate all ${selectedReportIds.length} selected reports and forward them to law enforcement.`
            : `This will reject all ${selectedReportIds.length} selected reports. This cannot be undone.`
        }
        confirmLabel={bulkConfirmAction === 'verify' ? 'Escalate All' : 'Reject All'}
        confirmClassName={
          bulkConfirmAction === 'verify' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'
        }
        confirmDisabled={Boolean(bulkActionPending)}
        onCancel={() => setBulkConfirmAction(null)}
        onConfirm={() => { const action = bulkConfirmAction; setBulkConfirmAction(null); executeBulkAction(action) }}
      />
    </div>
  )
}

export default Reports
