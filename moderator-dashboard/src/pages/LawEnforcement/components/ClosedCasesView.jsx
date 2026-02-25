import React from "react";
import { useQuery } from "@tanstack/react-query";
import SeverityBadge from "../../../components/SeverityBadge";
import { SEVERITY_VARIANTS } from "../../../utils/incidentUtils";
import { leiAPI } from "../../../services/api";

function ClosedCasesView() {
  const { data: closedIncidents = [], isLoading } = useQuery({
    queryKey: ["lei-incidents", "police_closed"],
    queryFn: async () => {
      const result = await leiAPI.getAll({ status: "police_closed" });
      return result.success ? result.data : [];
    },
  });

  return (
    <div className="lei-closed-wrap">
      <div className="lei-section-label" style={{ marginBottom: 16 }}>
        Closed Cases ({closedIncidents.length})
      </div>
      <table className="lei-closed-table">
        <thead>
          <tr>
            <th>Incident</th>
            <th>Sev</th>
            <th>Reporter</th>
            <th>Closed At</th>
            <th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: 24 }}>
                Loading…
              </td>
            </tr>
          ) : closedIncidents.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: 24 }}>
                No closed cases.
              </td>
            </tr>
          ) : (
            closedIncidents.map((inc) => (
              <tr key={inc.incident_id}>
                <td>
                  <div className="lei-closed-title">{inc.title}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--le-text-dim)",
                      marginTop: 2,
                      maxWidth: 280,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {inc.description}
                  </div>
                </td>
                <td>
                  <SeverityBadge
                    severity={inc.severity}
                    variant={SEVERITY_VARIANTS.LAW_ENFORCEMENT}
                    display="initial"
                  />
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>
                  {inc.username || "Unknown"}
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>
                  {inc.updated_at
                    ? new Date(inc.updated_at).toLocaleDateString()
                    : "—"}
                </td>
                <td style={{ textTransform: "capitalize" }}>
                  {inc.closure_outcome?.replace(/_/g, " ") || "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ClosedCasesView;
