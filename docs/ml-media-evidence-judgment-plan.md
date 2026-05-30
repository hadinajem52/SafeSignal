# ML Media Evidence Judgment Plan

## Summary

Add advisory-only multimodal ML judgment for report evidence. When an incident has submitted photos or video, the backend asynchronously asks the ML service whether the media supports, contradicts, or is inconclusive against the report description. When the incident is linked as a duplicate, the analysis also compares the duplicate media with the canonical/original report media.

## Assumptions

1. Photos and video are already uploaded through the existing mobile report flow.
2. Gemini is the only multimodal provider in scope; the local ML provider returns unsupported.
3. Media judgment is advisory only and never auto-verifies, rejects, dispatches, or merges reports.
4. Analysis runs asynchronously after report ML post-processing and can be retried by moderators.
5. Existing duplicate links trigger duplicate media comparison; low-confidence unlinked candidates are not analyzed by default.

## Implementation

- Store media judgment on `report_ml` with status, JSON result, error, input hash, and generated timestamp.
- Resolve only local stored incident media paths under `/uploads/incidents/*`.
- Send report metadata and media to `ml-service` through `POST /media/analyze-report` as multipart form data.
- Return media judgment fields from `GET /api/incidents/:id/ml`.
- Add `POST /api/incidents/:id/ml/media/retry` for moderator/admin retry.
- Show a compact Media Judgment panel in the moderator report detail view with recommendation, confidence, reasoning, duplicate media comparison, limitations, and retry on failure.

## Judgment Shape

- `overallVerdict`: `supports_report | contradicts_report | uncertain | insufficient_media`
- `validityRecommendation`: `likely_valid | needs_review | likely_invalid`
- `confidence`: `0..1`
- `descriptionAlignment`: matched details, missing details, contradictions, and reasoning.
- `duplicateMediaAlignment`: `same_incident | different_incident | uncertain | not_applicable`, confidence, and reasoning.
- `evidenceSummary`: photo count, video presence, observed scene, and limitations.

## Validation Plan

- Backend Jest coverage for status mapping, retry behavior, unsupported/failed ML handling, skipped no-media handling, and advisory-only behavior.
- ML service tests for no media, local unsupported, valid Gemini output, and invalid Gemini output.
- Dashboard build validation plus manual checks for pending, completed, failed, skipped, unsupported, retry, and duplicate-comparison states.

## References

- Gemini image understanding: https://ai.google.dev/gemini-api/docs/vision
- Gemini video understanding: https://ai.google.dev/gemini-api/docs/video-understanding
- Gemini Files API: https://ai.google.dev/gemini-api/docs/files
