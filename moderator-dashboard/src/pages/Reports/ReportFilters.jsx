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
    <div className="bg-surface border-b border-border flex-shrink-0">
      {/* Single-row toolbar — search · filter tabs · sort btns · [bulk actions] · count */}
      <div className="px-4 h-[46px] flex items-center gap-0 overflow-x-auto">

        {/* Search */}
        <div className="relative flex-shrink-0 mr-4">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            size={12}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search reports..."
            className="w-[200px] pl-7 pr-3 py-1.5 text-xs bg-surface border border-border text-text
              placeholder:text-muted/60 focus:outline-none focus:border-border/80 transition-colors font-medium"
          />
        </div>

        {/* Status filter tabs — flat bordered chips, no bg fill on active */}
        <div className="flex flex-shrink-0">
          {STATUS_TABS.map((tab, idx) => (
            <button
              key={tab.value}
              onClick={() => onStatusFilterChange({ target: { value: tab.value } })}
              className={`px-3.5 py-[7px] text-[11px] font-bold uppercase tracking-[0.03em]
                border border-border transition-colors whitespace-nowrap
                ${idx !== STATUS_TABS.length - 1 ? 'border-r-0' : ''}
                ${statusFilter === tab.value
                  ? 'border-border text-text bg-surface/80'
                  : 'bg-transparent text-muted hover:text-text'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort buttons — bordered pair, no primary-color glow */}
        <div className="flex flex-shrink-0 ml-2">
          <button
            onClick={() => onSortModeChange('urgency')}
            title="Sort by urgency"
            className={`inline-flex items-center gap-1.5 px-3 py-[7px] text-[11px] font-bold uppercase
              tracking-[0.03em] border border-border border-r-0 transition-colors whitespace-nowrap
              ${sortMode === 'urgency' ? 'text-text bg-surface' : 'text-muted bg-transparent hover:text-text'}`}
          >
            <Zap size={10} />
            Urgency
          </button>
          <button
            onClick={() => onSortModeChange('time')}
            title="Sort by submission time"
            className={`inline-flex items-center gap-1.5 px-3 py-[7px] text-[11px] font-bold uppercase
              tracking-[0.03em] border border-border transition-colors whitespace-nowrap
              ${sortMode === 'time' ? 'text-text bg-surface' : 'text-muted bg-transparent hover:text-text'}`}
          >
            <Clock size={10} />
            Newest
          </button>
        </div>

        {/* Bulk actions — only visible when rows are checked */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <div className="h-4 w-px bg-border" />
            <span className="text-[11px] text-muted tabular-nums whitespace-nowrap">
              <span className="text-text font-semibold tabular-nums">{selectedCount}</span> selected
            </span>
            <button
              onClick={onBulkVerify}
              disabled={bulkActionPending === 'reject'}
              className="px-2.5 py-1 border border-success/40 text-success text-[11px] font-bold
                uppercase tracking-[0.03em] hover:bg-success/10 disabled:opacity-40 transition-colors"
            >
              {bulkActionPending === 'verify' ? 'Escalating…' : 'Bulk Escalate'}
            </button>
            <button
              onClick={onBulkReject}
              disabled={bulkActionPending === 'verify'}
              className="px-2.5 py-1 border border-danger/40 text-danger text-[11px] font-bold
                uppercase tracking-[0.03em] hover:bg-danger/10 disabled:opacity-40 transition-colors"
            >
              {bulkActionPending === 'reject' ? 'Rejecting…' : 'Bulk Reject'}
            </button>
          </div>
        )}

        {/* Report count — pushed right */}
        <span className="ml-auto pl-4 text-[11px] font-semibold text-muted tabular-nums whitespace-nowrap flex-shrink-0">
          {totalResults} report{totalResults !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

export default ReportFilters
