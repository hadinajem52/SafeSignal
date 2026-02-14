import React from 'react'
import DetailSection from '../../components/DetailSection'
import DetailPanel from '../../components/DetailPanel'
import IncidentTimeline from '../../components/IncidentTimeline'
import DedupCandidatesPanel from '../../components/DedupCandidatesPanel'
import GoogleMapPanel from '../../components/GoogleMapPanel'
import SeverityBadge from '../../components/SeverityBadge'
import StatusBadge from '../../components/StatusBadge'
import { openMapsUrl } from '../../utils/incident'
import ReportActions from './ReportActions'

function ReportDetail({
  report,
  onClose,
  mlSummary,
  isMlLoading,
  dedupData,
  isDedupLoading,
  isMerging,
  updateCategoryPending,
  verifyPending,
  rejectPending,
  onMerge,
  onApplySuggestedCategory,
  onVerify,
  onReject,
}) {
  if (!report) {
    return null
  }

  return (
    <DetailPanel
      visible={!!report}
      title="Report Details"
      onClose={onClose}
      maxWidthClass="max-w-6xl"
    >
      <div className="flex-1 overflow-hidden flex">
        <div className="w-1/2 p-6 space-y-6 overflow-y-auto border-r">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{report.title}</h3>
            <div className="flex gap-3">
              <StatusBadge status={report.status} size="sm" />
              <span className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {report.category.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2">Description</h4>
            <p className="text-gray-700">{report.description}</p>
          </div>

          <DetailSection
            title="Location Context"
            headerRight={
              <a
                href={openMapsUrl(report.latitude, report.longitude)}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Open in Google Maps
              </a>
            }
          >
            <GoogleMapPanel
              markers={[
                {
                  id: `report-${report.id}`,
                  lat: report.latitude,
                  lng: report.longitude,
                  title: report.title || `Incident #${report.id}`,
                },
              ]}
              center={{ lat: report.latitude, lng: report.longitude }}
              height={220}
              zoom={15}
              autoFit={false}
              emptyMessage="No coordinates available for this report."
            />
          </DetailSection>

          <DetailSection
            title="ML Insights"
            headerRight={isMlLoading ? <span className="text-xs text-gray-500">Loading...</span> : null}
          >

            {!isMlLoading && !mlSummary ? <p className="text-sm text-gray-600">No ML data available.</p> : null}

            {mlSummary ? (
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Suggested category</span>
                  <span className="font-semibold text-gray-900">{mlSummary.predictedCategory || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Category confidence</span>
                  <span className="font-semibold text-gray-900">{mlSummary.categoryConfidence}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Risk score</span>
                  <span className={`font-semibold ${mlSummary.riskScore >= 0.8 ? 'text-red-600' : mlSummary.riskScore >= 0.5 ? 'text-amber-600' : 'text-gray-900'}`}>
                    {mlSummary.riskScore}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Toxicity</span>
                  <span className={`font-semibold ${mlSummary.isToxic ? 'text-red-600' : 'text-gray-900'}`}>
                    {mlSummary.isToxic ? `Flagged (${mlSummary.toxicityScore})` : mlSummary.toxicityScore}
                  </span>
                </div>

                {mlSummary.predictedCategory && mlSummary.predictedCategory !== report.category ? (
                  <button
                    onClick={() => onApplySuggestedCategory(mlSummary.predictedCategory)}
                    disabled={updateCategoryPending}
                    className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                  >
                    {updateCategoryPending ? 'Updating...' : 'Apply Suggested Category'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </DetailSection>

          <DedupCandidatesPanel
            dedup={dedupData}
            isLoading={isDedupLoading}
            isMerging={isMerging}
            sourceIncident={{
              incidentId: report.id,
              title: report.title,
              description: report.description,
              latitude: report.latitude,
              longitude: report.longitude,
            }}
            onMerge={onMerge}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Reported By</p>
              <p className="font-medium text-gray-900">{report.reporter}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium text-gray-900">{report.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date Reported</p>
              <p className="font-medium text-gray-900">{new Date(report.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Severity Level</p>
              <SeverityBadge severity={report.severity} display="text" />
            </div>
          </div>

          <ReportActions
            verifyPending={verifyPending}
            rejectPending={rejectPending}
            onVerify={onVerify}
            onReject={onReject}
            onClose={onClose}
          />
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-bold text-gray-900">Timeline & Communication</h3>
            <p className="text-sm text-gray-600 mt-1">Communicate with the reporter or add internal notes</p>
          </div>
          <div className="flex-1">
            <IncidentTimeline incidentId={report.id} />
          </div>
        </div>
      </div>
    </DetailPanel>
  )
}

export default ReportDetail
