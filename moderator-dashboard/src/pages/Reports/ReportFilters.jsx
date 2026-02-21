import React from 'react'
import { Clock, Filter, Search, Zap } from 'lucide-react'
import { MODERATOR_STATUS_FILTERS } from '../../constants/incident'

function ReportFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortMode,
  onSortModeChange,
  totalResults,
  selectedCount,
  bulkActionPending,
  onBulkVerify,
  onBulkReject,
}) {
  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl px-4 py-3">
      {/* Main row: search + filter + count + bulk actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search reports…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border text-text rounded-lg
              placeholder:text-muted/60 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-shadow"
          />
        </div>

        {/* Status filter */}
        <div className="relative min-w-[140px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
          <select
            value={statusFilter}
            onChange={onStatusFilterChange}
            className="w-full pl-8 pr-3 py-2 text-sm bg-surface border border-border text-text rounded-lg
              focus:ring-2 focus:ring-primary/30 focus:border-primary/50 appearance-none cursor-pointer transition-shadow"
          >
            {MODERATOR_STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort mode toggle */}
        <div className="flex items-center rounded-lg border border-border bg-surface overflow-hidden">
          <button
            onClick={() => onSortModeChange('urgency')}
            title="Sort by urgency"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              sortMode === 'urgency'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-text hover:bg-surface'
            }`}
          >
            <Zap size={13} />
            Urgency
          </button>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={() => onSortModeChange('time')}
            title="Sort by submission time"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              sortMode === 'time'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-text hover:bg-surface'
            }`}
          >
            <Clock size={13} />
            Newest
          </button>
        </div>

        {/* Separator + count */}
        <div className="h-6 w-px bg-border hidden sm:block" />
        <span className="text-xs text-muted tabular-nums whitespace-nowrap">
          {totalResults} report{totalResults !== 1 ? 's' : ''}
          {selectedCount > 0 && (
            <span className="text-primary font-semibold"> · {selectedCount} selected</span>
          )}
        </span>

        {/* Bulk actions — only visible when items are selected */}
        {selectedCount > 0 && (
          <>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="flex gap-2">
              <button
                onClick={onBulkVerify}
                disabled={bulkActionPending === 'reject'}
                className="px-3 py-1.5 rounded-lg bg-success/15 text-success text-xs font-semibold
                  hover:bg-success/25 disabled:opacity-40 transition-colors border border-success/20"
              >
                {bulkActionPending === 'verify' ? 'Escalating…' : 'Bulk Escalate'}
              </button>
              <button
                onClick={onBulkReject}
                disabled={bulkActionPending === 'verify'}
                className="px-3 py-1.5 rounded-lg bg-error/15 text-error text-xs font-semibold
                  hover:bg-error/25 disabled:opacity-40 transition-colors border border-error/20"
              >
                {bulkActionPending === 'reject' ? 'Rejecting…' : 'Bulk Reject'}
              </button>
            </div>
          </>
        )}

        {/* Keyboard shortcuts — pushed to far right */}
        <div className="ml-auto hidden lg:flex items-center gap-3 text-[11px] text-muted">
          {[['E', 'escalate'], ['R', 'reject'], ['N', 'next']].map(([key, action]) => (
            <span key={key} className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono font-bold text-text text-[10px]">
                {key}
              </kbd>
              {action}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ReportFilters
