import React from 'react'
import { BadgeCheck, MapPin } from 'lucide-react'
import DetailPanel from '../../components/DetailPanel'
import DetailSection from '../../components/DetailSection'
import IncidentTimeline from '../../components/IncidentTimeline'
import GoogleMapPanel from '../../components/GoogleMapPanel'
import StatusBadge from '../../components/StatusBadge'
import { CLOSURE_OUTCOMES } from '../../constants/incident'
import {
  formatCategoryLabel,
  getSeverityColor,
  openMapsUrl,
  SEVERITY_VARIANTS,
} from '../../utils/incident'
import CaseActions from './CaseActions'

function IncidentDetail({
  incident,
  actionLog,
  userRole,
  onClose,
  canTransitionTo,
  statusMutationPending,
  onStatusUpdate,
  closeOutcome,
  onCloseOutcomeChange,
  caseId,
  onCaseIdChange,
  closeNotes,
  onCloseNotesChange,
  onCloseCase,
}) {
  if (!incident) {
    return null
  }

  return (
    <DetailPanel
      visible={!!incident}
      title="Incident Detail"
      subtitle="Operational view for responders"
      headerClassName="from-blue-700 to-blue-800"
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">{incident.title}</h3>
          <div className="flex flex-wrap gap-3">
            <StatusBadge status={incident.status} size="sm" />
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {formatCategoryLabel(incident.category)}
            </span>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium bg-gray-50 ${getSeverityColor(incident.severity, SEVERITY_VARIANTS.LAW_ENFORCEMENT)}`}
            >
              {incident.severity.toUpperCase()} SEVERITY
            </span>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-gray-900 mb-2">Description</h4>
          <p className="text-gray-700">{incident.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Reporter Identity</p>
            <p className="font-medium text-gray-900">{incident.username}</p>
            <p className="text-sm text-gray-600">{incident.email}</p>
            <p className="text-xs text-gray-500 mt-2">
              Anonymous to public: {incident.is_anonymous ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Location</p>
            <p className="font-medium text-gray-900">{incident.location_name || 'Exact Coordinates'}</p>
            <p className="text-sm text-gray-600">
              {incident.latitude}, {incident.longitude}
            </p>
            <a
              href={openMapsUrl(incident.latitude, incident.longitude)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-blue-600 text-sm hover:underline"
            >
              <MapPin size={14} /> Open in Maps
            </a>
          </div>
        </div>

        <DetailSection title="Evidence Package">
          {incident.photo_urls?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {incident.photo_urls.map((url, index) => (
                <img
                  key={`${url}-${index}`}
                  src={url}
                  alt="Incident evidence"
                  className="w-full h-32 object-cover rounded-lg border"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No media attached.</p>
          )}
        </DetailSection>

        <DetailSection title="Operational Map">
          <GoogleMapPanel
            markers={[
              {
                id: `lei-${incident.incident_id}`,
                lat: incident.latitude,
                lng: incident.longitude,
                title: incident.title || `Incident #${incident.incident_id}`,
              },
            ]}
            center={{ lat: incident.latitude, lng: incident.longitude }}
            zoom={15}
            height={260}
            autoFit={false}
            emptyMessage="No coordinates available for this incident."
          />
        </DetailSection>

        <CaseActions
          userRole={userRole}
          incidentStatus={incident.status}
          statusMutationPending={statusMutationPending}
          canTransitionTo={canTransitionTo}
          onStatusUpdate={onStatusUpdate}
          closeOutcome={closeOutcome}
          onCloseOutcomeChange={onCloseOutcomeChange}
          caseId={caseId}
          onCaseIdChange={onCaseIdChange}
          closeNotes={closeNotes}
          onCloseNotesChange={onCloseNotesChange}
          onCloseCase={onCloseCase}
          closureOutcomes={CLOSURE_OUTCOMES}
        />

        <DetailSection title="Timeline & Communication">
          <IncidentTimeline incidentId={incident.incident_id} />
        </DetailSection>

        <DetailSection title="Chain of Custody">
          {actionLog.length ? (
            <ul className="space-y-3">
              {actionLog.map((entry) => (
                <li key={entry.action_id} className="flex items-start gap-3">
                  <BadgeCheck className="text-blue-600 mt-0.5" size={16} />
                  <div>
                    <p className="text-sm text-gray-800">
                      {entry.action_type.replace(/_/g, ' ')}
                      {entry.moderator_name ? ` · ${entry.moderator_name}` : ''}
                    </p>
                    {entry.notes ? <p className="text-xs text-gray-500">{entry.notes}</p> : null}
                    <p className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No actions recorded.</p>
          )}
        </DetailSection>
      </div>
    </DetailPanel>
  )
}

export default IncidentDetail
