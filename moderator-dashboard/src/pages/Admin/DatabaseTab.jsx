import React, { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, RefreshCw, Trash2 } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import DangerActionPanel from './DangerActionPanel'

// ── JSON syntax highlighting ─────────────────────────────────────────────────

function JsonHighlight({ data }) {
  const json = JSON.stringify(data, null, 2)

  // Tokenise using a single-pass regex
  const tokens = []
  const re = /("(?:\\.|[^"\\])*"(?:\s*:)?)|(\b\d+\.?\d*(?:[eE][+-]?\d+)?\b)|(null)|(true|false)/g
  let lastIndex = 0
  let match

  while ((match = re.exec(json)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', value: json.slice(lastIndex, match.index) })
    }
    const [full, strOrKey, num, nullVal, bool] = match
    if (strOrKey !== undefined) {
      tokens.push({ type: full.endsWith(':') ? 'key' : 'string', value: full })
    } else if (num !== undefined) {
      tokens.push({ type: 'number', value: full })
    } else if (nullVal !== undefined) {
      tokens.push({ type: 'null', value: full })
    } else if (bool !== undefined) {
      tokens.push({ type: 'bool', value: full })
    }
    lastIndex = re.lastIndex
  }
  if (lastIndex < json.length) {
    tokens.push({ type: 'plain', value: json.slice(lastIndex) })
  }

  const colorMap = {
    key:    'text-primary',
    string: 'text-success',
    number: 'text-warning',
    null:   'text-muted',
    bool:   'text-warning',
    plain:  'text-muted',
  }

  return (
    <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
      {tokens.map((token, i) => (
        <span key={i} className={colorMap[token.type]}>
          {token.value}
        </span>
      ))}
    </pre>
  )
}

// ── Row item with collapse ───────────────────────────────────────────────────

function DbRowItem({ row, primaryKey, onDelete, deletePending }) {
  const [expanded, setExpanded] = useState(false)
  const rowId = row[primaryKey]

  return (
    <div className="border-b border-border">
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-surface cursor-pointer hover:bg-primary/5 transition-colors group"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={13} className="text-muted flex-shrink-0" />
          ) : (
            <ChevronRight size={13} className="text-muted flex-shrink-0" />
          )}
          <span className="text-[11px] font-bold text-primary font-mono tabular-nums">
            {primaryKey}: {String(rowId)}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(rowId)
          }}
          disabled={deletePending}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-[9px] font-bold tracking-wider uppercase border border-transparent text-muted hover:border-danger/60 hover:text-danger transition-all disabled:opacity-50"
        >
          <Trash2 size={11} />
          Delete Row
        </button>
      </div>
      {expanded && (
        <div className="px-4 py-3">
          <JsonHighlight data={row} />
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

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
  const [confirmState, setConfirmState] = useState(null)

  const handleConfirm = () => {
    if (!confirmState) return
    if (confirmState.type === 'clear-table') onClearTable(confirmState.tableName)
    if (confirmState.type === 'delete-row')  onDeleteRow(confirmState.rowId)
    setConfirmState(null)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-auto gap-4">
      {/* Warning bar */}
      <div className="flex items-center gap-2.5 px-4 py-2 bg-warning/5 border border-warning/20 rounded-sm flex-shrink-0">
        <AlertTriangle size={14} className="text-warning flex-shrink-0" />
        <span className="text-[11px] font-semibold text-warning">
          These actions directly modify production data. Deletions are permanent.
        </span>
      </div>

      {/* Split panel */}
      <div
        className="flex border border-border overflow-hidden flex-shrink-0"
        style={{ minHeight: 360, height: '55vh' }}
      >
        {/* Table list */}
        <div className="w-60 flex-shrink-0 flex flex-col border-r border-border overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-border flex-shrink-0">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted">
              Managed Tables
            </span>
            <button
              onClick={onRefreshTables}
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold tracking-wider uppercase border border-border text-muted hover:text-text hover:border-muted transition-colors"
            >
              <RefreshCw size={10} />
              Refresh
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tablesLoading ? (
              <p className="text-xs text-muted p-3">Loading tables...</p>
            ) : (
              tables.map((table) => (
                <button
                  key={table.tableName}
                  onClick={() => onSelectTable(table.tableName)}
                  className={`w-full text-left px-3.5 py-2.5 border-b border-border transition-colors ${
                    selectedTable === table.tableName
                      ? 'bg-primary/8 border-l-2 border-l-primary pl-[12px]'
                      : 'hover:bg-surface'
                  }`}
                >
                  <p
                    className={`text-xs font-bold font-mono mb-0.5 ${
                      selectedTable === table.tableName ? 'text-primary' : 'text-text'
                    }`}
                  >
                    {table.tableName}
                  </p>
                  <p className="text-[10px] text-muted tabular-nums">
                    {table.rowCount} rows
                    <span className="ml-1.5 text-warning text-[9px]">pk:{table.primaryKey}</span>
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Row viewer */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface flex-shrink-0">
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase text-text font-mono">
                {selectedTable || '—'}
              </p>
              {primaryKey && (
                <p className="text-[10px] text-muted mt-0.5">Primary key: {primaryKey}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRefreshRows}
                disabled={!selectedTable}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-bold tracking-wider uppercase border border-border text-muted hover:text-text hover:border-muted transition-colors disabled:opacity-40"
              >
                <RefreshCw size={10} />
                Refresh
              </button>
              <button
                onClick={() => {
                  if (!selectedTable) return
                  setConfirmState({ type: 'clear-table', tableName: selectedTable })
                }}
                disabled={!selectedTable || clearTablePending}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-bold tracking-wider uppercase border border-danger/50 text-danger bg-danger/5 hover:bg-danger hover:text-white transition-colors disabled:opacity-40"
              >
                <Trash2 size={10} />
                Clear Table
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {rowsLoading ? (
              <p className="text-xs text-muted p-4">Loading rows...</p>
            ) : !rows.length ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-muted">
                  {selectedTable ? 'Table is empty' : 'Select a table'}
                </p>
              </div>
            ) : (
              rows.map((row) => (
                <DbRowItem
                  key={row[primaryKey]}
                  row={row}
                  primaryKey={primaryKey}
                  deletePending={false}
                  onDelete={(rowId) =>
                    setConfirmState({
                      type: 'delete-row',
                      rowId,
                      rowDescription: `${primaryKey}=${rowId}`,
                      tableName: selectedTable,
                    })
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Danger zones */}
      <div className="space-y-4 flex-shrink-0 pb-4">
        <DangerActionPanel
          title="Danger Zone: Reset All Reports to 0"
          description="Clears all incidents and report records while keeping user accounts and settings."
          confirmationText="RESET REPORTS"
          inputValue={reportsResetConfirmation}
          onInputChange={onReportsResetConfirmationChange}
          inputPlaceholder="RESET REPORTS"
          buttonLabel="Reset All Reports"
          pendingLabel="Resetting Reports..."
          isPending={resetReportsPending}
          onAction={onResetReports}
        />
        <DangerActionPanel
          title="Danger Zone: Clear All Managed Data"
          description="Clears all incidents, reports, users, staff applications, and related dashboard data."
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

      {/* Dialogs */}
      <ConfirmDialog
        visible={Boolean(confirmState)}
        title={confirmState?.type === 'clear-table' ? 'Clear Table?' : 'Delete Row?'}
        message={
          confirmState?.type === 'clear-table'
            ? `Clear all rows from "${confirmState?.tableName}"? This is a permanent production operation and cannot be undone.`
            : `Delete row ${confirmState?.rowDescription || ''} from "${confirmState?.tableName || ''}"? This is irreversible.`
        }
        confirmLabel={confirmState?.type === 'clear-table' ? 'Clear Table' : 'Delete Row'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}

export default DatabaseTab
