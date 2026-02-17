import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/PageHeader'
import { reportsAPI } from '../../services/api'
import ReportDetail from './ReportDetail'
import ReportFilters from './ReportFilters'
import ReportList from './ReportList'

function Reports() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedReportIds, setSelectedReportIds] = useState([])
  const [bulkActionPending, setBulkActionPending] = useState(null)
  const [toasts, setToasts] = useState([])

  const queryClient = useQueryClient()

  const pushToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3200)
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
    return reports
      .filter((report) => {
        const matchesSearch =
          report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.description.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || report.status === statusFilter
        return matchesSearch && matchesStatus
      })
      .map((report) => ({
        ...report,
        id: report.incident_id,
        reporter: report.username || 'Anonymous',
        location: report.location_name || `${report.latitude}, ${report.longitude}`,
        createdAt: report.created_at || report.incident_date,
      }))
  }, [reports, searchTerm, statusFilter])

  useEffect(() => {
    setSelectedReportIds((prev) => prev.filter((id) => filteredReports.some((report) => report.id === id)))
  }, [filteredReports])

  const invalidateReports = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['reports'] })
  }, [queryClient])

  const handleVerify = useCallback(async (reportId, source = 'single') => {
    const result = await verifyMutation.mutateAsync(reportId)
    if (!result.success) {
      pushToast(result.error || 'Failed to verify report.', 'error')
      return false
    }

    invalidateReports()
    setSelectedReportIds((prev) => prev.filter((id) => id !== reportId))
    if (selectedReport?.id === reportId) {
      setSelectedReport(null)
    }
    if (source === 'single') {
      pushToast('Report verified successfully.')
    }
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
    if (selectedReport?.id === reportId) {
      setSelectedReport(null)
    }
    if (source === 'single') {
      pushToast('Report rejected successfully.')
    }
    return true
  }, [invalidateReports, pushToast, rejectMutation, selectedReport?.id])

  const handleBulkAction = async (action) => {
    if (!selectedReportIds.length || bulkActionPending) return

    setBulkActionPending(action)
    try {
      const actionFn = action === 'verify' ? reportsAPI.verify : (id) => reportsAPI.reject(id, 'Rejected by moderator')

      const outcomes = await Promise.all(selectedReportIds.map((id) => actionFn(id)))
      const successCount = outcomes.filter((result) => result.success).length
      const failedCount = outcomes.length - successCount

      if (successCount > 0) {
        invalidateReports()
        setSelectedReportIds([])
        if (selectedReport && selectedReportIds.includes(selectedReport.id)) {
          setSelectedReport(null)
        }
      }

      if (failedCount === 0) {
        pushToast(`${successCount} reports ${action === 'verify' ? 'verified' : 'rejected'} successfully.`)
      } else {
        pushToast(
          `${successCount} succeeded, ${failedCount} failed during bulk ${action}.`,
          failedCount === outcomes.length ? 'error' : 'warning'
        )
      }
    } catch (_error) {
      pushToast(
        `Bulk ${action} failed. Please try again.`,
        'error'
      )
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
    if (selectedReportIds.length === filteredReports.length) {
      setSelectedReportIds([])
      return
    }
    setSelectedReportIds(filteredReports.map((report) => report.id))
  }

  const handleSelectNextReport = useCallback(() => {
    if (!filteredReports.length) return

    if (!selectedReport) {
      setSelectedReport(filteredReports[0])
      return
    }

    const currentIndex = filteredReports.findIndex((report) => report.id === selectedReport.id)
    if (currentIndex < 0) {
      setSelectedReport(filteredReports[0])
      return
    }

    const nextIndex = (currentIndex + 1) % filteredReports.length
    setSelectedReport(filteredReports[nextIndex])
  }, [filteredReports, selectedReport])

  useEffect(() => {
    const handleKeydown = (event) => {
      const tag = event.target?.tagName
      const isFormField =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable

      if (isFormField) return

      if (event.ctrlKey || event.metaKey || event.altKey) return

      const key = event.key.toLowerCase()
      if (key === 'n') {
        event.preventDefault()
        handleSelectNextReport()
        return
      }

      if (!selectedReport) return

      if (key === 'v' && !verifyMutation.isPending) {
        event.preventDefault()
        handleVerify(selectedReport.id)
      }

      if (key === 'r' && !rejectMutation.isPending) {
        event.preventDefault()
        handleReject(selectedReport.id)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [handleReject, handleSelectNextReport, handleVerify, rejectMutation.isPending, selectedReport, verifyMutation.isPending])

  return (
    <div>
      <PageHeader title="Reports Management" description="Review and manage incident reports" />

      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[280px] max-w-[420px] rounded-lg border px-4 py-3 shadow-soft ${
              toast.type === 'error'
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

      <ReportFilters
        searchTerm={searchTerm}
        onSearchChange={(event) => setSearchTerm(event.target.value)}
        statusFilter={statusFilter}
        onStatusFilterChange={(event) => setStatusFilter(event.target.value)}
        totalResults={filteredReports.length}
        selectedCount={selectedReportIds.length}
        bulkActionPending={bulkActionPending}
        onBulkVerify={() => handleBulkAction('verify')}
        onBulkReject={() => handleBulkAction('reject')}
      />

      <ReportList
        reports={filteredReports}
        isLoading={isLoading}
        onSelectReport={setSelectedReport}
        selectedReportIds={selectedReportIds}
        onToggleSelection={handleToggleSelection}
        onToggleSelectAll={handleToggleSelectAll}
      />

      <ReportDetail
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
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
          if (!result.success) {
            pushToast(result.error || 'Failed to merge duplicate report.', 'error')
            return
          }
          queryClient.invalidateQueries({ queryKey: ['reports'] })
          queryClient.invalidateQueries({ queryKey: ['report-dedup', selectedReport?.id] })
          pushToast('Duplicate linked successfully.')
        }}
        onApplySuggestedCategory={async (category) => {
          const result = await updateCategoryMutation.mutateAsync(category)
          if (!result.success) {
            pushToast(result.error || 'Failed to update category.', 'error')
            return
          }
          queryClient.invalidateQueries({ queryKey: ['reports'] })
          queryClient.invalidateQueries({ queryKey: ['report-ml', selectedReport?.id] })
          pushToast('Category updated successfully.')
        }}
        onVerify={() => handleVerify(selectedReport.id)}
        onReject={() => handleReject(selectedReport.id)}
        onNext={handleSelectNextReport}
      />
    </div>
  )
}

export default Reports
