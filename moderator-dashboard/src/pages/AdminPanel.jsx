import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { adminAPI } from '../services/api'

function AdminPanel() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('applications')
  const [selectedTable, setSelectedTable] = useState('')
  const [allDataConfirmation, setAllDataConfirmation] = useState('')
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

  const renderApplications = () => {
    if (applicationsLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (applications.length === 0) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <UserCheck className="mx-auto text-gray-400 mb-3" size={36} />
          <p className="text-gray-600">No pending moderator or LE applications.</p>
        </div>
      )
    }

    return (
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
                onClick={() => approveMutation.mutate(application.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="px-4 py-2 rounded bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                Approve
              </button>
              <button
                onClick={() => {
                  const confirmed = window.confirm(
                    `Reject ${application.username}'s application? This deletes the pending account.`
                  )
                  if (confirmed) rejectMutation.mutate(application.id)
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle size={16} />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderDatabase = () => {
    const rows = tableRowsData?.rows || []
    const primaryKey = tableRowsData?.primaryKey || selectedTableMeta?.primaryKey

    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 mt-0.5" size={18} />
            <div className="text-sm text-amber-800">
              These actions directly modify production data. Deletions are permanent.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Managed Tables</h3>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-database-tables'] })}
                className="p-2 rounded hover:bg-gray-100 text-gray-600"
                title="Refresh table stats"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {tablesLoading ? (
              <div className="text-sm text-gray-500">Loading tables...</div>
            ) : (
              <div className="space-y-2">
                {tables.map((table) => (
                  <button
                    key={table.tableName}
                    onClick={() => setSelectedTable(table.tableName)}
                    className={`w-full text-left rounded px-3 py-2 border ${
                      selectedTable === table.tableName
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{table.tableName}</div>
                    <div className="text-xs text-gray-500">
                      Rows: {table.rowCount} | PK: {table.primaryKey}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Table Rows: {selectedTable || '-'}</h3>
                {primaryKey && <p className="text-xs text-gray-500">Primary key: {primaryKey}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    queryClient.invalidateQueries({ queryKey: ['admin-table-rows', selectedTable] })
                  }
                  disabled={!selectedTable}
                  className="px-3 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Refresh Rows
                </button>
                <button
                  onClick={() => {
                    if (!selectedTable) return
                    const confirmed = window.confirm(
                      `Clear all rows from table "${selectedTable}"? This cannot be undone.`
                    )
                    if (confirmed) clearTableMutation.mutate(selectedTable)
                  }}
                  disabled={!selectedTable || clearTableMutation.isPending}
                  className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Clear Table
                </button>
              </div>
            </div>

            {rowsLoading ? (
              <div className="text-sm text-gray-500">Loading rows...</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-gray-500">No rows in this table.</div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {rows.map((row) => {
                  const rowId = row[primaryKey]
                  return (
                    <div key={rowId} className="rounded border border-gray-200">
                      <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-700">
                          {primaryKey}: {String(rowId)}
                        </span>
                        <button
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Delete row ${primaryKey}=${rowId} from "${selectedTable}"?`
                            )
                            if (confirmed) deleteRowMutation.mutate(rowId)
                          }}
                          className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Delete Row
                        </button>
                      </div>
                      <pre className="text-xs text-gray-700 p-3 overflow-x-auto">
                        {JSON.stringify(row, null, 2)}
                      </pre>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-red-300 bg-red-50 p-5">
          <h3 className="text-red-800 font-semibold mb-2">Danger Zone: Clear All Managed Data</h3>
          <p className="text-sm text-red-700 mb-3">
            This will clear all incidents, reports, users, staff applications, and related dashboard data.
          </p>
          <p className="text-sm text-red-700 mb-2">Type <strong>DELETE ALL</strong> to enable this action.</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={allDataConfirmation}
              onChange={(event) => setAllDataConfirmation(event.target.value)}
              placeholder="DELETE ALL"
              className="px-3 py-2 border border-red-300 rounded w-56"
            />
            <button
              onClick={() => clearAllMutation.mutate()}
              disabled={allDataConfirmation !== 'DELETE ALL' || clearAllMutation.isPending}
              className="px-4 py-2 rounded bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-50"
            >
              Clear All Managed Data
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-blue-600" size={28} />
          <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
        </div>
        <p className="text-gray-600 mt-2">
          Highest authority workspace: approve staff access and manage platform database data.
        </p>
      </div>

      {(actionError || actionMessage) && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            actionError
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {actionError || actionMessage}
        </div>
      )}

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

      {activeTab === 'applications' ? renderApplications() : renderDatabase()}
    </div>
  )
}

export default AdminPanel
