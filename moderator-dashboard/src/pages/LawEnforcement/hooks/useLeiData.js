import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { leiAPI } from "../../../services/api";

export default function useLeiData({
  statusFilter,
  searchTerm,
  sortMode,
  selectedIncidentId,
  leiAlerts,
}) {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["lei-incidents", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const result = await leiAPI.getAll(params);
      return result.success ? result.data : [];
    },
  });

  const { data: allLeiIncidents = [] } = useQuery({
    queryKey: ["lei-incidents-snapshot"],
    queryFn: async () => {
      const result = await leiAPI.getAll({});
      return result.success ? result.data : [];
    },
  });

  const { data: incidentDetail } = useQuery({
    queryKey: ["lei-incident", selectedIncidentId],
    queryFn: async () => {
      const result = await leiAPI.getById(selectedIncidentId);
      return result.success ? result.data : null;
    },
    enabled: Boolean(selectedIncidentId),
  });

  const filteredIncidents = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return incidents
      .filter((inc) => {
        const t = (inc.title || "").toLowerCase();
        const d = (inc.description || "").toLowerCase();
        return t.includes(q) || d.includes(q);
      })
      .sort((a, b) => {
        if (sortMode === "time") {
          return (
            new Date(b.incident_date || b.created_at) -
            new Date(a.incident_date || a.created_at)
          );
        }
        const rank = { critical: 1, high: 2, medium: 3, low: 4 };
        const diff = (rank[a.severity] || 5) - (rank[b.severity] || 5);
        if (diff !== 0) return diff;
        return (
          new Date(b.incident_date || b.created_at) -
          new Date(a.incident_date || a.created_at)
        );
      })
      .map((inc) => ({
        ...inc,
        id: inc.incident_id,
        reportedAt: inc.incident_date || inc.created_at,
      }));
  }, [incidents, searchTerm, sortMode]);

  const selectedIncident =
    incidentDetail?.incident ||
    filteredIncidents.find((inc) => inc.id === selectedIncidentId);
  const actionLog = incidentDetail?.actions || [];

  const displayAlerts = useMemo(() => {
    const derived = allLeiIncidents
      .filter(
        (inc) =>
          ["critical", "high"].includes(inc.severity) &&
          inc.status === "verified",
      )
      .map((inc) => ({
        incidentId: inc.incident_id,
        title: inc.title,
        severity: inc.severity,
        status: inc.status,
        latitude: inc.latitude,
        longitude: inc.longitude,
      }));
    const combined = [...leiAlerts, ...derived];
    const seen = new Set();
    return combined
      .filter((a) => {
        const k = String(a.incidentId);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 8);
  }, [allLeiIncidents, leiAlerts]);

  return {
    isLoading,
    filteredIncidents,
    allLeiIncidents,
    selectedIncident,
    actionLog,
    displayAlerts,
  };
}
