import React from 'react'
import { AlertTriangle, MapPin } from 'lucide-react'
import GoogleMapPanel from '../../components/GoogleMapPanel'
import { formatStatusLabel, getStatusHexColor, openMapsUrl } from '../../utils/incident'

function AlertsPanel({ alerts }) {
  if (!alerts.length) {
    return null
  }

  return (
    <div className="mb-6 space-y-3">
      {alerts.map((alert, index) => (
        <div
          key={`${alert.incidentId}-${index}`}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3"
        >
          <AlertTriangle size={20} />
          <div>
            <p className="font-semibold">Critical alert: {alert.title}</p>
            <p className="text-sm">
              Severity: {alert.severity?.toUpperCase()} · Status:{' '}
              <span style={{ color: getStatusHexColor(alert.status) }}>{formatStatusLabel(alert.status)}</span>
            </p>
            {Number.isFinite(Number(alert.latitude)) && Number.isFinite(Number(alert.longitude)) && (
              <div className="mt-2">
                <a
                  href={openMapsUrl(alert.latitude, alert.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline"
                >
                  <MapPin size={14} /> Locate Alert
                </a>
                <div className="mt-2 max-w-md">
                  <GoogleMapPanel
                    markers={[
                      {
                        id: `alert-${alert.incidentId}`,
                        lat: alert.latitude,
                        lng: alert.longitude,
                        title: alert.title || `Incident #${alert.incidentId}`,
                      },
                    ]}
                    center={{ lat: alert.latitude, lng: alert.longitude }}
                    zoom={15}
                    height={150}
                    autoFit={false}
                    emptyMessage="No alert coordinates available."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AlertsPanel
