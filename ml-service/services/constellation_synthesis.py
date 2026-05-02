import json
from typing import Dict, Optional


CONFIDENCE_STATES = {
    "single_report",
    "corroborated",
    "mixed_signals",
    "activity_not_confirmed",
    "likely_ended",
}

ONGOING_ASSESSMENTS = {"ongoing", "likely_ended", "unknown", "unclear"}

SYSTEM_PROMPT = """\
You are a witness-signal synthesis system for a public safety platform.

Given a short-lived witness constellation, determine the current confidence state.

Return ONLY a JSON object in this exact shape:
{
  "confidence_state": "single_report|corroborated|mixed_signals|activity_not_confirmed|likely_ended",
  "confidence_score": <float 0-1>,
  "summary": "privacy-safe summary without verbatim note text",
  "supporting_signals": <integer>,
  "contradicting_signals": <integer>,
  "ongoing_assessment": "ongoing|likely_ended|unknown|unclear",
  "anomaly_flagged": <true|false>,
  "cluster_match_incident_ids": [<integer>, ...]
}

Rules:
- Never include verbatim witness note content in the summary.
- Check whether each non-flagged note is consistent with its selected signal_type.
- Downweight signals whose non-flagged notes clearly contradict their selected signal_type.
- Flag anomalies only when the signals look coordinated, spammy, or internally impossible.
- cluster_match_incident_ids must always be present, even when empty.
- Do not invent incident IDs.
"""


def build_prompt(payload: Dict) -> str:
    return (
        f"{SYSTEM_PROMPT}\n\n---\n\n"
        "Constellation payload JSON:\n"
        f"{json.dumps(payload, separators=(',', ':'), default=str)}"
    )


def normalize_result(result: Dict) -> Dict:
    if not isinstance(result, dict):
        raise ValueError("Constellation synthesis result must be an object")

    confidence_state = result.get("confidence_state")
    ongoing_assessment = result.get("ongoing_assessment")
    confidence_score = float(result.get("confidence_score"))

    if confidence_state not in CONFIDENCE_STATES:
        raise ValueError(f"Invalid confidence_state: {confidence_state}")
    if ongoing_assessment not in ONGOING_ASSESSMENTS:
        raise ValueError(f"Invalid ongoing_assessment: {ongoing_assessment}")
    if confidence_score < 0 or confidence_score > 1:
        raise ValueError("confidence_score must be in [0, 1]")

    cluster_ids = result.get("cluster_match_incident_ids", [])
    if not isinstance(cluster_ids, list):
        raise ValueError("cluster_match_incident_ids must be a list")

    return {
        "confidence_state": confidence_state,
        "confidence_score": round(confidence_score, 3),
        "summary": str(result.get("summary") or "").strip() or None,
        "supporting_signals": int(result.get("supporting_signals") or 0),
        "contradicting_signals": int(result.get("contradicting_signals") or 0),
        "ongoing_assessment": ongoing_assessment,
        "anomaly_flagged": bool(result.get("anomaly_flagged")),
        "cluster_match_incident_ids": [int(value) for value in cluster_ids],
    }


async def synthesize_constellation(provider, payload: Dict) -> Optional[Dict]:
    synthesize = getattr(provider, "synthesize_constellation", None)
    if not callable(synthesize):
        raise RuntimeError("Provider does not support constellation synthesis")

    prompt = build_prompt(payload)
    result = await synthesize(prompt)
    if result is None:
        raise RuntimeError("Provider does not support constellation synthesis")

    return normalize_result(result)
