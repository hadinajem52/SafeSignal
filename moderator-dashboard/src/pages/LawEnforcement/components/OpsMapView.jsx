import React from "react";
import GoogleMapPanel from "../../../components/GoogleMapPanel";

function OpsMapView({ incidents }) {
  const markers = incidents
    .filter(
      (inc) =>
        Number.isFinite(Number(inc.latitude)) &&
        Number.isFinite(Number(inc.longitude)),
    )
    .map((inc) => ({
      id: `ops-${inc.incident_id || inc.id}`,
      lat: inc.latitude,
      lng: inc.longitude,
      title: inc.title || `Incident #${inc.incident_id}`,
    }));

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--le-bg)",
      }}
    >
      <div className="lei-ops-map-header">
        <div className="lei-ops-map-title">
          All Active Incidents — {markers.length} with coordinates
        </div>
        <div className="lei-ops-map-sub">
          Live spatial overview of active incidents.
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <GoogleMapPanel
          markers={markers}
          height="100%"
          autoFit
          showClusters={markers.length > 10}
          emptyMessage="No active incidents with coordinates."
        />
      </div>
    </div>
  );
}

export default OpsMapView;
