import React from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import FilterDropdown from '../../components/FilterDropdown'
import LoadingState from '../../components/LoadingState'
import SearchInput from '../../components/SearchInput'
import SeverityBadge from '../../components/SeverityBadge'
import StatusBadge from '../../components/StatusBadge'
import { LEI_STATUS_FILTERS } from '../../constants/incident'
import { SEVERITY_VARIANTS } from '../../utils/incident'

function IncidentTable({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  isLoading,
  incidents,
  onSelectIncident,
}) {
  return (
    <>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2">
            <SearchInput
              label="Search Incidents"
              icon={Search}
              value={searchTerm}
              onChange={onSearchTermChange}
              placeholder="Search by title or description..."
            />
          </div>
          <FilterDropdown
            label="Filter by Status"
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={LEI_STATUS_FILTERS}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
              onClick={() => onSelectIncident(incident.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{incident.title}</h3>
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{incident.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span>📍 {incident.location_name || `${incident.latitude}, ${incident.longitude}`}</span>
                    <span>👤 {incident.username}</span>
                    <span>📅 {new Date(incident.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <SeverityBadge
                  severity={incident.severity}
                  variant={SEVERITY_VARIANTS.LAW_ENFORCEMENT}
                  display="initial"
                />
              </div>
            </div>
          ))}

          {incidents.length === 0 && (
            <EmptyState icon={AlertTriangle} message="No incidents found matching your criteria" />
          )}
        </div>
      )}
    </>
  )
}

export default IncidentTable
