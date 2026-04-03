# AI Insights Structured Sections Implementation Plan

## TASK
- Replace the ML insights contract from a single `insight` string to structured `sections`.
- Propagate the new response shape from the FastAPI ML service through the backend proxy to the Data Analysis Center UI.
- Execute the ML service changes TDD-first.

## CONSTRAINTS
- Keep scope limited to the AI insights flow.
- Preserve `supported` semantics for non-Gemini providers.
- Remove old Gemini insight text extraction helpers and their tests.
- Render four labeled sections in the frontend instead of a single paragraph.

## NON-GOALS
- No broader analytics refactor.
- No unrelated CSS cleanup.
- No changes to non-insights ML endpoints.

## ASSUMPTIONS
1. The backend ML client file is `backend/src/utils/mlClient.js`.
2. The backend route file is `backend/src/routes/stats.js`.
3. The new `InsightsSections` model contains exactly four string fields: `priority`, `trend`, `pattern`, and `funnel_health`.
4. The four new optional enrichment fields belong on the ML service `InsightsRequest`.
5. Gemini generation failure should still produce a `503`, while unsupported providers return `supported=false`.

## EXISTING PATTERN TO FOLLOW
- `ml-service/main.py` owns the request and response contract for `/insights`.
- `ml-service/providers/base.py` defines provider method signatures.
- `backend/src/routes/stats.js` is a thin proxy that validates request shape and delegates to `mlClient`.
- `moderator-dashboard/src/pages/DataAnalysisCenter/index.jsx` builds the insights payload and renders `AIInsightsCard`.

## FILES / COMPONENTS INVOLVED
- `ml-service/tests/test_insights.py`
- `ml-service/main.py`
- `ml-service/providers/base.py`
- `ml-service/providers/local.py`
- `ml-service/providers/gemini.py`
- `backend/src/utils/mlClient.js`
- `backend/src/routes/stats.js`
- `moderator-dashboard/src/pages/DataAnalysisCenter/index.jsx`
- `moderator-dashboard/src/pages/DataAnalysisCenter/components/AIInsightsCard.jsx`
- `moderator-dashboard/src/pages/DataAnalysisCenter/dac.css`

## SIMPLEST VIABLE APPROACH
- Change the contract once at the ML service boundary and keep the same shape through every later layer.
- Keep the backend proxy thin: pass through the new optional metrics and return `{ sections, supported }`.
- Compute the extra analytics enrichment only in `index.jsx`, where the incident data already exists.

## REJECTED ALTERNATIVES
- Keep returning one string and split it later in the frontend.
  - Rejected because structure becomes implicit and fragile.
- Add a second endpoint for structured insights.
  - Rejected because `/insights` already owns this concern.
- Introduce reusable abstractions for one card.
  - Rejected because this is a single-purpose UI.

## REUSE DECISION
- Reuse the existing FastAPI response-model pattern in `ml-service/main.py`.
- Reuse the existing provider abstraction in `ml-service/providers/base.py`.
- Reuse existing DAC helpers and constants for response-time and status calculations instead of introducing new analytics utilities.
- Keep `moderator-dashboard/src/services/api/stats.js` unchanged unless a response-shape translation becomes necessary.

## CORRECTNESS CHECKLIST
- Input assumptions:
  - `period` remains one of `7d|30d|90d|1y`.
  - Gemini returns all four required section keys.
  - Previous-period SLA uses the same filtering rules as current-period SLA.
- Expected output:
  - Gemini returns `{ sections: { priority, trend, pattern, funnel_health }, supported: true }`.
  - Non-Gemini providers return `{ sections: null, supported: false }`.
- Edge cases:
  - Gemini returns malformed JSON or omits a section.
  - The selected period contains no incidents.
  - Previous-period comparisons have no data.
- Failure modes:
  - Gemini failure should raise `503`.
  - Unsupported providers should not raise.
  - Frontend should render supported-empty and unsupported-empty states safely.

## IMPLEMENTATION PLAN

### 1. Rewrite ML insights tests first
- Replace the contents of `ml-service/tests/test_insights.py`.
- Delete tests for `_extract_insight_text` and `_validate_insight_text`.
- Keep `_get_finish_reason_name` coverage.
- Add endpoint tests for:
  - non-Gemini provider returns `supported=false` and `sections is None`
  - Gemini generation failure raises `HTTPException(503)`
  - Gemini success returns `response.sections` with all expected fields
  - `InsightsRequest` rejects invalid `period`
- Run:
  - `cd ml-service && python -m pytest tests/test_insights.py -v`
- Confirm failure before changing implementation.

### 2. Update request and response models in `ml-service/main.py`
- Add a new `InsightsSections` Pydantic model.
- Expand `InsightsRequest` with the four optional enrichment fields needed by the new prompt.
- Replace `InsightsResponse.insight` with `sections: Optional[InsightsSections]`.
- Update `/insights` so:
  - non-Gemini returns `InsightsResponse(sections=None, supported=False)`
  - Gemini success returns `InsightsResponse(sections=InsightsSections(**result), supported=True)`

### 3. Update provider contracts
- In `ml-service/providers/base.py`, change `generate_insights` return type from `Optional[str]` to `Optional[Dict]`.
- Update the docstring to describe the structured sections payload.
- In `ml-service/providers/local.py`, keep the method returning `None`, but align the signature and docstring with the new contract.

### 4. Rewrite Gemini insights generation
- In `ml-service/providers/gemini.py`:
  - remove `_extract_insight_text`
  - remove `_validate_insight_text`
  - replace the old insights prompt with one that requires JSON output containing:
    - `priority`
    - `trend`
    - `pattern`
    - `funnel_health`
  - validate the returned dict and fail fast if required keys are missing
  - increase `max_output_tokens` so four sections fit reliably
  - preserve finish-reason checks and retry behavior
  - return a normalized dict instead of a single string

### 5. Run ML tests and verify pass
- Run:
  - `cd ml-service && python -m pytest tests/test_insights.py -v`
  - `cd ml-service && python -m pytest tests -v`
- Fix any fallout caused by the contract change before moving to JavaScript layers.

### 6. Update the backend ML client
- In `backend/src/utils/mlClient.js`:
  - update the JSDoc for `generateInsights`
  - document the new optional enrichment fields
  - return:
    - `sections: response.data?.sections ?? null`
    - `supported: response.data?.supported ?? false`

### 7. Update the backend stats route
- In `backend/src/routes/stats.js`:
  - destructure the four new optional fields from `req.body`
  - pass them through to `mlClient.generateInsights(...)`
  - keep required-field validation limited to `period`, `total_incidents`, and `kpis`

### 8. Enrich the DAC payload in `index.jsx`
- In `moderator-dashboard/src/pages/DataAnalysisCenter/index.jsx`:
  - import the needed helpers and constants for previous-period and SLA calculations
  - compute previous-period incidents for the same window length as the selected period
  - compute previous-period SLA using `ACTIONED_STATUSES` and `diffMinutes`
  - derive `trendDirection` from the trend line by comparing the first half vs the second half
  - read P75 from `percentiles[2]` and normalize units if needed
  - compute top-category current count, previous count, and percentage change
  - include the new enrichment fields in `insightsPayload`
  - pass `sections` and `trendDirection` into `AIInsightsCard`

### 9. Rewrite `AIInsightsCard.jsx`
- Replace the `insight` prop with `sections` and `trendDirection`.
- Keep the existing icons and `timeAgo` helper.
- Add constants for:
  - section labels
  - trend indicator symbols and style mapping
- Render four labeled rows:
  - Priority
  - Trend
  - Pattern
  - Funnel Health
- Preserve loading, error, unsupported, and empty states.

### 10. Add CSS for structured sections
- In `moderator-dashboard/src/pages/DataAnalysisCenter/dac.css`:
  - add styles for section rows, labels, values, and trend indicator state
  - use existing DAC CSS variables
  - avoid unrelated cleanup unless it blocks the new layout

## VALIDATION
- Automated tests run:
  - `cd ml-service && python -m pytest tests/test_insights.py -v`
  - `cd ml-service && python -m pytest tests -v`
- Manual checks:
  - run backend, ML service, and dashboard together
  - verify the DAC insights card renders four section rows for Gemini
  - verify refresh still works
  - verify unsupported provider renders the unsupported state
  - verify invalid `period` is rejected by the ML service
- Untested areas:
  - frontend behavior until manually exercised
  - exact Gemini prompt quality until run against the live model

## CHANGES MADE
- Added this plan document only.

## THINGS I DID NOT CHANGE
- `docs/future-uixi-plans.md`
  - Left untouched because the request was for a separate file.
- Any runtime code
  - This document is planning only.

## POTENTIAL CONCERNS
- The initial file-path notes were partially wrong; the actual backend files are under `backend/src`.
- If Gemini sometimes omits one of the four required keys, the implementation should retry rather than silently render partial content.
- The frontend enrichment logic should reuse the same SLA rules as the existing KPI logic, otherwise the generated sections may contradict the displayed metrics.
