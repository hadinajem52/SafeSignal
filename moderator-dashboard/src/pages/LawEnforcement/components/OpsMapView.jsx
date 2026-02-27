import React from "react";
import GoogleMapPanel from "../../../components/GoogleMapPanel";

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getCoordinates = (incident) => {
  const latitude =
    toNumber(incident?.latitude) ??
    toNumber(incident?.lat) ??
    toNumber(incident?.location?.latitude) ??
    toNumber(incident?.location?.lat);

  const longitude =
    toNumber(incident?.longitude) ??
    toNumber(incident?.lng) ??
    toNumber(incident?.location?.longitude) ??
    toNumber(incident?.location?.lng);

  if (latitude === null || longitude === null) {
    return null;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
};

function OpsMapView({ incidents }) {
  const markers = incidents
    .map((inc) => {
      const coordinates = getCoordinates(inc);
      if (!coordinates) return null;

      return {
        id: `ops-${inc.incident_id || inc.id}`,
        lat: coordinates.latitude,
        lng: coordinates.longitude,
        title: inc.title || `Incident #${inc.incident_id || inc.id}`,
      };
    })
    .filter(Boolean);

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
