import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import PageHeader from '../../components/PageHeader'
import { reportsAPI } from '../../services/api'
import { SOCKET_URL } from '../../utils/network'
import ReportDetail from './ReportDetail'
import ReportFilters from './ReportFilters'
import ReportList from './ReportList'

function Reports() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)

  const queryClient = useQueryClient()

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

  useEffect(() => {
    const token = localStorage.getItem('moderator_token')
    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: { token },
    })

    socket.on('incident:new', () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    })

    socket.on('incident:update', () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient])

  const verifyMutation = useMutation({
    mutationFn: (id) => reportsAPI.verify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setSelectedReport(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id) => reportsAPI.reject(id, 'Rejected by moderator'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setSelectedReport(null)
    },
  })

  const linkDuplicateMutation = useMutation({
    mutationFn: (duplicateIncidentId) => reportsAPI.linkDuplicate(selectedReport.id, duplicateIncidentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['report-dedup', selectedReport?.id] })
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: (category) => reportsAPI.updateCategory(selectedReport.id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['report-ml', selectedReport?.id] })
    },
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

  return (
    <div>
      <PageHeader title="Reports Management" description="Review and manage incident reports" />

      <ReportFilters
        searchTerm={searchTerm}
        onSearchChange={(event) => setSearchTerm(event.target.value)}
        statusFilter={statusFilter}
        onStatusFilterChange={(event) => setStatusFilter(event.target.value)}
      />

      <ReportList reports={filteredReports} isLoading={isLoading} onSelectReport={setSelectedReport} />

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
        onMerge={(duplicateIncidentId) => linkDuplicateMutation.mutate(duplicateIncidentId)}
        onApplySuggestedCategory={(category) => updateCategoryMutation.mutate(category)}
        onVerify={() => verifyMutation.mutate(selectedReport.id)}
        onReject={() => rejectMutation.mutate(selectedReport.id)}
      />
    </div>
  )
}

export default Reports
