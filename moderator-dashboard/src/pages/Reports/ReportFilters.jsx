import React from 'react'
import { Clock, Search, Zap } from 'lucide-react'

// Simplified tabs matching the moderator workflow screenshot.
const STATUS_TABS = [
  { value: 'all', label: 'All Reports' },
  { value: 'submitted,auto_flagged,auto_processed', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'police_closed', label: 'Closed' },
]

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
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Row 1: search + count + bulk actions + keyboard hints */}
      <div className="px-4 py-2.5 flex items-center gap-3 border-b border-border flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[340px]">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            size={13}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search reports…"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface border border-border text-text rounded
              placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow"
          />
        </div>

        {selectedCount > 0 && (
          <>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <span className="text-xs text-muted tabular-nums whitespace-nowrap">
              <span className="text-primary font-semibold">{selectedCount}</span> selected
            </span>
            <button
              onClick={onBulkVerify}
              disabled={bulkActionPending === 'reject'}
              className="px-3 py-1.5 rounded border border-success/30 text-success text-xs font-semibold
                hover:bg-success/10 disabled:opacity-40 transition-colors"
            >
              {bulkActionPending === 'verify' ? 'Escalating…' : 'Bulk Escalate'}
            </button>
            <button
              onClick={onBulkReject}
              disabled={bulkActionPending === 'verify'}
              className="px-3 py-1.5 rounded border border-danger/30 text-danger text-xs font-semibold
                hover:bg-danger/10 disabled:opacity-40 transition-colors"
            >
              {bulkActionPending === 'reject' ? 'Rejecting…' : 'Bulk Reject'}
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-muted tabular-nums whitespace-nowrap">
            {totalResults} report{totalResults !== 1 ? 's' : ''}
          </span>
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-muted">
            {[['E', 'escalate'], ['R', 'reject'], ['N', 'next']].map(([key, action]) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center size-5 rounded border border-border
                  bg-surface font-mono font-bold text-text text-[10px]">
                  {key}
                </kbd>
                <span>{action}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: filter tabs + sort toggle */}
      <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 flex-shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onStatusFilterChange({ target: { value: tab.value } })}
              className={`px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wide rounded
                transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'border border-primary text-primary bg-primary/10'
                  : 'border border-border text-muted hover:text-text hover:bg-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Sort toggle — same bordered sort-btn pattern as LE Interface */}
        <div className="flex-shrink-0 inline-flex rounded border border-border bg-surface overflow-hidden">
          <button
            onClick={() => onSortModeChange('urgency')}
            title="Sort by urgency"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-semibold
              uppercase tracking-wide transition-colors ${
              sortMode === 'urgency'
                ? 'bg-primary text-bg'
                : 'text-muted hover:text-text hover:bg-surface'
            }`}
          >
            <Zap size={11} />
            Urgency
          </button>
          <span className="inline-block h-5 w-px bg-border self-center" />
          <button
            onClick={() => onSortModeChange('time')}
            title="Sort by submission time"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-semibold
              uppercase tracking-wide transition-colors ${
              sortMode === 'time'
                ? 'bg-primary text-bg'
                : 'text-muted hover:text-text hover:bg-surface'
            }`}
          >
            <Clock size={11} />
            Newest
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportFilters
