import React from 'react'
import { Filter, Search } from 'lucide-react'
import FilterDropdown from '../../components/FilterDropdown'
import SearchInput from '../../components/SearchInput'
import { MODERATOR_STATUS_FILTERS } from '../../constants/incident'

function ReportFilters({ searchTerm, onSearchChange, statusFilter, onStatusFilterChange }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </div>
  )
}

export default ReportFilters
