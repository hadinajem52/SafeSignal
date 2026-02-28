import React from "react";
import GoogleMapPanel from "../../../components/GoogleMapPanel";

const SEVERITY_COLOR = {
  critical: "#A855F7",
  high:     "#E5484D",
  medium:   "#F5A623",
  low:      "#3B9EFF",
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

const CATEGORY_LABEL = {
  theft:                "T",
  assault:              "A",
  vandalism:            "V",
  suspicious_activity:  "S",
  traffic_incident:     "Tr",
  noise_complaint:      "N",
  fire:                 "F",
  medical_emergency:    "M",
  hazard:               "H",
  other:                "?",
};

const CATEGORY_DISPLAY_NAME = {
  theft:                "Theft",
  assault:              "Assault",
  vandalism:            "Vandalism",
  suspicious_activity:  "Suspicious",
  traffic_incident:     "Traffic",
  noise_complaint:      "Noise",
  fire:                 "Fire",
  medical_emergency:    "Medical",
  hazard:               "Hazard",
  other:                "Other",
};

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

      const severityLabel = inc.severity ? inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1) : "";
      const categoryName = CATEGORY_DISPLAY_NAME[inc.category] || inc.category || "";
      return {
        id: `ops-${inc.incident_id || inc.id}`,
        lat: coordinates.latitude,
        lng: coordinates.longitude,
        title: [
          inc.title || `Incident #${inc.incident_id || inc.id}`,
          severityLabel && `Severity: ${severityLabel}`,
          categoryName && `Type: ${categoryName}`,
          inc.status && `Status: ${inc.status.replace(/_/g, " ")}`,
        ].filter(Boolean).join(" · "),
        color: SEVERITY_COLOR[inc.severity] || "#5C7390",
        label: CATEGORY_LABEL[inc.category] || "?",
        severity: inc.severity,
        category: inc.category,
        meta: {
          incidentId: inc.incident_id || inc.id,
          title: inc.title || `Incident #${inc.incident_id || inc.id}`,
          severityLabel: severityLabel || "Unknown",
          severityColor: SEVERITY_COLOR[inc.severity] || "#5C7390",
          categoryName: categoryName || "Unknown",
          categoryLabel: CATEGORY_LABEL[inc.category] || "?",
          status: inc.status ? inc.status.replace(/_/g, " ") : "—",
          date: inc.incident_date || inc.created_at || null,
        },
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
        <div className="lei-ops-map-legend">
          {SEVERITY_ORDER.map((sev) => (
            <span key={sev} className="lei-ops-map-legend-item">
              <span
                className="lei-ops-map-legend-dot"
                style={{ background: SEVERITY_COLOR[sev] }}
              />
              <span className="lei-ops-map-legend-label">{sev}</span>
            </span>
          ))}
          <span className="lei-ops-map-legend-sep" />
          {Object.entries(CATEGORY_LABEL).map(([cat, ltr]) => (
            <span key={cat} className="lei-ops-map-legend-cat">
              <span
                className="lei-ops-map-legend-cat-dot"
                style={{ background: "var(--le-surface-2, var(--le-border))" }}
              >
                {ltr}
              </span>
              <span>{CATEGORY_DISPLAY_NAME[cat]}</span>
            </span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <GoogleMapPanel
          markers={markers}
          height="100%"
          autoFit
          showClusters={false}
          emptyMessage="No active incidents with coordinates."
        />
      </div>
    </div>
  );
}

export default OpsMapView;
