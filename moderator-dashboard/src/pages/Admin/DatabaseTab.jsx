import React from 'react'
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'
import DangerActionPanel from './DangerActionPanel'

function DatabaseTab({
  tables,
  tablesLoading,
  selectedTable,
  onSelectTable,
  onRefreshTables,
  rows,
  rowsLoading,
  primaryKey,
  onRefreshRows,
  onClearTable,
  clearTablePending,
  onDeleteRow,
  reportsResetConfirmation,
  onReportsResetConfirmationChange,
  onResetReports,
  resetReportsPending,
  allDataConfirmation,
  onAllDataConfirmationChange,
  onClearAllData,
  clearAllPending,
}) {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Managed Tables</h3>
            <button
              onClick={onRefreshTables}
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
                  onClick={() => onSelectTable(table.tableName)}
                  className={`w-full text-left rounded px-3 py-2 border ${
                    selectedTable === table.tableName
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`font-medium ${
                      selectedTable === table.tableName ? 'text-black' : 'text-gray-900'
                    }`}
                  >
                    {table.tableName}
                  </div>
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
              {primaryKey ? <p className="text-xs text-gray-500">Primary key: {primaryKey}</p> : null}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onRefreshRows}
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
                  if (confirmed) onClearTable(selectedTable)
                }}
                disabled={!selectedTable || clearTablePending}
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
                          if (confirmed) onDeleteRow(rowId)
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

      <DangerActionPanel
        title="Danger Zone: Reset All Reports to 0"
        description="This clears all incidents and report records while keeping user accounts and settings."
        confirmationText="RESET REPORTS"
        inputValue={reportsResetConfirmation}
        onInputChange={onReportsResetConfirmationChange}
        inputPlaceholder="RESET REPORTS"
        buttonLabel="Reset All Reports"
        pendingLabel="Resetting Reports..."
        isPending={resetReportsPending}
        onAction={onResetReports}
        controlsClassName="mb-5"
      />

      <DangerActionPanel
        title="Danger Zone: Clear All Managed Data"
        description="This will clear all incidents, reports, users, staff applications, and related dashboard data."
        confirmationText="DELETE ALL"
        inputValue={allDataConfirmation}
        onInputChange={onAllDataConfirmationChange}
        inputPlaceholder="DELETE ALL"
        buttonLabel="Clear All Managed Data"
        pendingLabel="Clearing Data..."
        isPending={clearAllPending}
        onAction={onClearAllData}
      />
    </div>
  )
}

export default DatabaseTab
