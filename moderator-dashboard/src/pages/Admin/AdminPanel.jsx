import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Database, ShieldCheck, UserCheck } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
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

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Admin Control Center"
        description="Highest authority workspace: approve staff access and manage platform database data."
      />

      {actionError || actionMessage ? (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            actionError
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {actionError || actionMessage}
        </div>
      ) : null}

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <UserCheck size={16} />
            Applications
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 ${
              activeTab === 'database'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Database size={16} />
            Database
          </button>
        </div>
      </div>

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
  )
}

export default AdminPanel
