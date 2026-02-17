import React from 'react'
import { Filter, Search } from 'lucide-react'
import FilterDropdown from '../../components/FilterDropdown'
import SearchInput from '../../components/SearchInput'
import { MODERATOR_STATUS_FILTERS } from '../../constants/incident'

function ReportFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalResults,
  selectedCount,
  bulkActionPending,
  onBulkVerify,
  onBulkReject,
}) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-soft p-6 mb-6">
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-w-[280px]">
          <div className="col-span-1 md:col-span-2">
            <SearchInput
              label="Search Reports"
              icon={Search}
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Search by title or description..."
            />
          </div>
          <FilterDropdown
            label={
              <>
                <Filter className="inline mr-2" size={18} /> Filter by Status
              </>
            }
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={MODERATOR_STATUS_FILTERS}
          />
        </div>

        <div className="min-w-[280px]">
          <p className="text-sm text-muted mb-2 tabular-nums">
            {totalResults} reports{selectedCount ? ` • ${selectedCount} selected` : ''}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onBulkVerify}
              disabled={!selectedCount || bulkActionPending === 'reject'}
              className="px-3 py-2 rounded-lg bg-success hover:opacity-90 text-white text-sm font-semibold disabled:opacity-50"
            >
              {bulkActionPending === 'verify' ? 'Verifying...' : 'Bulk Verify'}
            </button>
            <button
              onClick={onBulkReject}
              disabled={!selectedCount || bulkActionPending === 'verify'}
              className="px-3 py-2 rounded-lg bg-danger hover:opacity-90 text-white text-sm font-semibold disabled:opacity-50"
            >
              {bulkActionPending === 'reject' ? 'Rejecting...' : 'Bulk Reject'}
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted mt-4">
        Shortcuts: <span className="font-semibold">V</span> verify, <span className="font-semibold">R</span> reject, <span className="font-semibold">N</span> next report
      </p>
    </div>
  )
}

export default ReportFilters
