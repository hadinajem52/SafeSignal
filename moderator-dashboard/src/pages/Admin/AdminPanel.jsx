import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Database, ShieldCheck, UserCheck } from 'lucide-react'
import { adminAPI } from '../../services/api'
import ApplicationsTab from './ApplicationsTab'
import DatabaseTab from './DatabaseTab'

function AdminPanel() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('applications')
  const [selectedTable, setSelectedTable] = useState('')
  const [allDataConfirmation, setAllDataConfirmation] = useState('')
  const [reportsResetConfirmation, setReportsResetConfirmation] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const ensureSuccess = (result, fallbackMessage) => {
    if (result.success) return result.data
    throw new Error(result.error || fallbackMessage)
  }

  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: async () => {
      const result = await adminAPI.getPendingApplications()
      if (result.success) return result.data
      throw new Error(result.error)
    },
  })

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['admin-database-tables'],
    queryFn: async () => {
      const result = await adminAPI.getDatabaseTables()
      if (result.success) return result.data
      throw new Error(result.error)
    },
  })

  useEffect(() => {
    if (!selectedTable && tables.length > 0) {
      setSelectedTable(tables[0].tableName)
    }
  }, [selectedTable, tables])

  const { data: tableRowsData, isLoading: rowsLoading } = useQuery({
    queryKey: ['admin-table-rows', selectedTable],
    queryFn: async () => {
      const result = await adminAPI.getTableRows(selectedTable, 50)
      if (result.success) return result.data
      throw new Error(result.error)
    },
    enabled: Boolean(selectedTable),
  })

  const selectedTableMeta = useMemo(
    () => tables.find((table) => table.tableName === selectedTable),
    [tables, selectedTable]
  )

  const approveMutation = useMutation({
    mutationFn: async (userId) =>
      ensureSuccess(await adminAPI.approveApplication(userId), 'Failed to approve application'),
    onSuccess: async () => {
      setActionError('')
      setActionMessage('Application approved')
      await queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      setActionMessage('')
      setActionError(error.message || 'Failed to approve application')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (userId) =>
      ensureSuccess(await adminAPI.rejectApplication(userId), 'Failed to reject application'),
    onSuccess: async () => {
      setActionError('')
      setActionMessage('Application rejected')
      await queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      setActionMessage('')
      setActionError(error.message || 'Failed to reject application')
    },
  })

  const deleteRowMutation = useMutation({
    mutationFn: async (rowId) =>
      ensureSuccess(await adminAPI.deleteTableRow(selectedTable, rowId), 'Failed to delete row'),
    onSuccess: async () => {
      setActionError('')
      setActionMessage('Row deleted')
      await queryClient.invalidateQueries({ queryKey: ['admin-database-tables'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-table-rows', selectedTable] })
    },
    onError: (error) => {
      setActionMessage('')
      setActionError(error.message || 'Failed to delete row')
    },
  })

  const clearTableMutation = useMutation({
    mutationFn: async (tableName) =>
      ensureSuccess(await adminAPI.clearTable(tableName), 'Failed to clear table'),
    onSuccess: async (_, tableName) => {
      setActionError('')
      setActionMessage(`Table "${tableName}" cleared`)
      await queryClient.invalidateQueries({ queryKey: ['admin-database-tables'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-table-rows', selectedTable] })
    },
    onError: (error) => {
      setActionMessage('')
      setActionError(error.message || 'Failed to clear table')
    },
  })

  const clearAllMutation = useMutation({
    mutationFn: async () => ensureSuccess(await adminAPI.clearAllData(), 'Failed to clear all data'),
    onSuccess: async () => {
      setActionError('')
      setActionMessage('All managed database tables were cleared')
      setAllDataConfirmation('')
      await queryClient.invalidateQueries({ queryKey: ['admin-database-tables'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-table-rows'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
    },
    onError: (error) => {
      setActionMessage('')
      setActionError(error.message || 'Failed to clear all data')
    },
  })

  const resetReportsMutation = useMutation({
    mutationFn: async () =>
      ensureSuccess(await adminAPI.resetAllReports(), 'Failed to reset reports'),
    onSuccess: async (result) => {
      setActionError('')
      setActionMessage(
        `All reports reset to 0 (${result.submittedIncidentsBeforeReset || 0} reports cleared)`
      )
      setReportsResetConfirmation('')
      await queryClient.invalidateQueries({ queryKey: ['admin-database-tables'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-table-rows'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      setActionMessage('')
      setActionError(error.message || 'Failed to reset reports')
    },
  })

  const rows = tableRowsData?.rows || []
  const primaryKey = tableRowsData?.primaryKey || selectedTableMeta?.primaryKey

  const tabClassName = (tab) =>
    `flex items-center gap-2 px-5 h-11 text-[11px] font-bold tracking-widest uppercase border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? 'text-primary border-primary'
        : 'text-muted border-transparent hover:text-text'
    }`

  const pendingCount = applications.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3 mb-0.5">
          <ShieldCheck size={20} className="text-primary" />
          <h1 className="font-display font-extrabold text-xl tracking-tight text-text uppercase">
            Admin Control Center
          </h1>
          <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 border border-warning/60 text-warning bg-warning/8">
            Highest Authority
          </span>
        </div>
        <p className="text-xs text-muted ml-8">
          Approve staff access and manage platform database data.
        </p>
      </div>

      {/* Toast */}
      {actionError || actionMessage ? (
        <div
          className={`flex-shrink-0 mx-6 mt-3 px-4 py-2.5 text-xs font-semibold border ${
            actionError
              ? 'border-danger/30 bg-danger/5 text-danger'
              : 'border-success/30 bg-success/5 text-success'
          }`}
        >
          {actionError || actionMessage}
        </div>
      ) : null}

      {/* Tab bar */}
      <div className="flex-shrink-0 flex border-b border-border bg-card px-6">
        <button onClick={() => setActiveTab('applications')} className={tabClassName('applications')}>
          <UserCheck size={13} />
          Applications
          {pendingCount > 0 && (
            <span className="text-[9px] font-bold bg-warning text-black px-1.5 py-0.5 ml-1 tabular-nums">
              {pendingCount}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('database')} className={tabClassName('database')}>
          <Database size={13} />
          Database
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-6 pt-5 pb-5">
      {activeTab === 'applications' ? (
        <ApplicationsTab
          applications={applications}
          isLoading={applicationsLoading}
          approvePending={approveMutation.isPending}
          rejectPending={rejectMutation.isPending}
          onApprove={(id) => approveMutation.mutate(id)}
          onReject={(id) => rejectMutation.mutate(id)}
        />
      ) : (
        <DatabaseTab
          tables={tables}
          tablesLoading={tablesLoading}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
          onRefreshTables={() => queryClient.invalidateQueries({ queryKey: ['admin-database-tables'] })}
          rows={rows}
          rowsLoading={rowsLoading}
          primaryKey={primaryKey}
          onRefreshRows={() => queryClient.invalidateQueries({ queryKey: ['admin-table-rows', selectedTable] })}
          onClearTable={(tableName) => clearTableMutation.mutate(tableName)}
          clearTablePending={clearTableMutation.isPending}
          onDeleteRow={(rowId) => deleteRowMutation.mutate(rowId)}
          reportsResetConfirmation={reportsResetConfirmation}
          onReportsResetConfirmationChange={(event) => setReportsResetConfirmation(event.target.value)}
          onResetReports={() => resetReportsMutation.mutate()}
          resetReportsPending={resetReportsMutation.isPending}
          allDataConfirmation={allDataConfirmation}
          onAllDataConfirmationChange={(event) => setAllDataConfirmation(event.target.value)}
          onClearAllData={() => clearAllMutation.mutate()}
          clearAllPending={clearAllMutation.isPending}
        />
      )}
      </div>
    </div>
  )
}

export default AdminPanel
