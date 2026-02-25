import React from "react";
import { SEVERITY_COLOR } from "../constants";

function SeverityDots({ severity }) {
  const color = SEVERITY_COLOR[severity] || "#5C7390";
  const initials = severity ? severity[0].toUpperCase() : "?";
  return (
    <div className="lei-sev-badge">
      <div className="lei-sev-label" style={{ color }}>
        {initials}
      </div>
      <div className="lei-sev-dots">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="lei-sev-dot"
            style={{
              background: color,
              opacity: i === 2 ? 1 : i === 1 ? 0.55 : 0.25,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default SeverityDots;
