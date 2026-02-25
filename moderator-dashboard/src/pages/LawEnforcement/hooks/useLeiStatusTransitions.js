import { useMutation } from "@tanstack/react-query";
import { leiAPI } from "../../../services/api";
import { formatStatusLabel } from "../../../utils/incidentUtils";
import { STATUS_ACTION_CONFIG } from "../constants";
import { canTransitionTo } from "../helpers";
import { useMemo, useState } from "react";

export default function useLeiStatusTransitions({
  queryClient,
  pushToast,
  setLeiAlerts,
  filteredIncidents,
}) {
  const [pendingTransition, setPendingTransition] = useState(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, payload }) => leiAPI.updateStatus(id, payload),
  });

  const validateTransition = (incident, status) => {
    if (!incident || !status) return false;
    if (canTransitionTo(incident, status)) return true;
    pushToast(
      `Invalid transition from ${incident?.status} to ${status}.`,
      "warning",
    );
    return false;
  };

  const runStatusUpdate = async (incident, status) => {
    if (!validateTransition(incident, status)) return;

    const payload =
      status === "police_closed"
        ? {
            status,
            closure_outcome: "resolved_handled",
            closure_details: {
              case_id: null,
              officer_notes: "Closed from LEI workflow",
            },
          }
        : { status };

    const result = await statusMutation.mutateAsync({
      id: incident.incident_id || incident.id,
      payload,
    });

    if (!result.success) {
      pushToast(result.error || `Failed to move to ${status}.`, "error");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["lei-incidents"] });
    queryClient.invalidateQueries({ queryKey: ["lei-incidents-snapshot"] });
    queryClient.invalidateQueries({
      queryKey: ["lei-incident", incident.incident_id || incident.id],
    });

    if (status !== "verified") {
      const incId = incident.incident_id || incident.id;
      setLeiAlerts((prev) =>
        prev.filter((a) => String(a.incidentId) !== String(incId)),
      );
    }

    pushToast(`Incident moved to ${formatStatusLabel(status)}.`);
  };

  const requestStatusUpdate = (incident, status) => {
    if (!validateTransition(incident, status)) return;
    setPendingTransition({ incident, status });
  };

  const confirmPendingTransition = async () => {
    if (!pendingTransition || statusMutation.isPending) return;
    await runStatusUpdate(pendingTransition.incident, pendingTransition.status);
    setPendingTransition(null);
  };

  const handleAlertDispatch = (alert) => {
    const match = filteredIncidents.find(
      (inc) => String(inc.id) === String(alert.incidentId),
    );
    const incident = match || {
      id: alert.incidentId,
      incident_id: alert.incidentId,
      status: alert.status,
    };
    requestStatusUpdate(incident, "dispatched");
  };

  const pendingActionConfig = useMemo(
    () =>
      pendingTransition?.status
        ? STATUS_ACTION_CONFIG[pendingTransition.status]
        : null,
    [pendingTransition],
  );

  return {
    statusMutation,
    requestStatusUpdate,
    pendingTransition,
    setPendingTransition,
    confirmPendingTransition,
    handleAlertDispatch,
    pendingActionConfig,
  };
}
