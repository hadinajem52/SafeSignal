import { useMutation } from "@tanstack/react-query";
import { leiAPI } from "../../../services/api";
import { CLOSURE_OUTCOMES } from "../../../constants/incident";
import { formatStatusLabel } from "../../../utils/incidentUtils";
import { STATUS_ACTION_CONFIG } from "../constants";
import { canTransitionTo } from "../helpers";
import { useCallback, useMemo, useState } from "react";

const DEFAULT_CLOSURE_OUTCOME = CLOSURE_OUTCOMES[0].value;

function getClosureDetailsFields(closureDetails) {
  if (!closureDetails || typeof closureDetails !== "object") {
    return { caseId: "", officerNotes: "" };
  }

  return {
    caseId: closureDetails.case_id || "",
    officerNotes: closureDetails.officer_notes || "",
  };
}

export default function useLeiStatusTransitions({
  queryClient,
  pushToast,
  setLeiAlerts,
  filteredIncidents,
}) {
  const [pendingTransition, setPendingTransition] = useState(null);
  const [isDisclosed, setIsDisclosed] = useState(false);
  const [isLocationFuzzed, setIsLocationFuzzed] = useState(false);
  const [closureOutcome, setClosureOutcome] = useState(DEFAULT_CLOSURE_OUTCOME);
  const [caseId, setCaseId] = useState("");
  const [officerNotes, setOfficerNotes] = useState("");

  const syncDisclosureOptions = useCallback((incident = null) => {
    const closureDetails = getClosureDetailsFields(incident?.closure_details);
    setIsDisclosed(Boolean(incident?.is_disclosed));
    setIsLocationFuzzed(Boolean(incident?.is_location_fuzzed));
    setClosureOutcome(incident?.closure_outcome || DEFAULT_CLOSURE_OUTCOME);
    setCaseId(closureDetails.caseId);
    setOfficerNotes(closureDetails.officerNotes);
  }, []);

  const statusMutation = useMutation({
    mutationFn: ({ action, id, payload }) =>
      action === "disclosure"
        ? leiAPI.updateDisclosureSettings(id, payload)
        : leiAPI.updateStatus(id, payload),
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

    if (status === "police_closed" && closureOutcome === "report_filed" && !caseId.trim()) {
      pushToast("Case ID is required when outcome is Report Filed.", "warning");
      return;
    }

    const payload =
      status === "police_closed"
        ? {
            status,
            closure_outcome: closureOutcome,
            closure_details: {
              case_id: closureOutcome === "report_filed" ? caseId.trim() : null,
              officer_notes: officerNotes.trim() || null,
            },
            is_disclosed: isDisclosed,
            is_location_fuzzed: isLocationFuzzed,
          }
        : { status };

    const result = await statusMutation.mutateAsync({
      action: "status",
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

  const requestDisclosureUpdate = (incident) => {
    if (!incident || incident.status !== "police_closed") {
      pushToast("Disclosure settings can only be updated for closed cases.", "warning");
      return;
    }

    setPendingTransition({
      incident,
      actionKey: "police_closed_update",
    });
  };

  const runDisclosureUpdate = async (incident) => {
    const result = await statusMutation.mutateAsync({
      action: "disclosure",
      id: incident.incident_id || incident.id,
      payload: {
        is_disclosed: isDisclosed,
        is_location_fuzzed: isLocationFuzzed,
      },
    });

    if (!result.success) {
      pushToast(result.error || "Failed to update community feed settings.", "error");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["lei-incidents"] });
    queryClient.invalidateQueries({ queryKey: ["lei-incidents-snapshot"] });
    queryClient.invalidateQueries({
      queryKey: ["lei-incident", incident.incident_id || incident.id],
    });

    pushToast("Community feed settings updated.");
  };

  const requestStatusUpdate = (incident, status) => {
    if (!validateTransition(incident, status)) return;
    if (status !== "police_closed") {
      syncDisclosureOptions();
    }
    setPendingTransition({
      incident,
      status,
      actionKey: status,
    });
  };

  const confirmPendingTransition = async () => {
    if (!pendingTransition || statusMutation.isPending) return;
    if (pendingTransition.actionKey === "police_closed_update") {
      await runDisclosureUpdate(pendingTransition.incident);
    } else {
      await runStatusUpdate(pendingTransition.incident, pendingTransition.status);
    }
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
      pendingTransition?.actionKey
        ? STATUS_ACTION_CONFIG[pendingTransition.actionKey]
        : null,
    [pendingTransition],
  );

  return {
    statusMutation,
    requestStatusUpdate,
    requestDisclosureUpdate,
    pendingTransition,
    setPendingTransition,
    confirmPendingTransition,
    handleAlertDispatch,
    pendingActionConfig,
    isDisclosed,
    setIsDisclosed,
    isLocationFuzzed,
    setIsLocationFuzzed,
    closureOutcome,
    setClosureOutcome,
    caseId,
    setCaseId,
    officerNotes,
    setOfficerNotes,
    syncDisclosureOptions,
  };
}
