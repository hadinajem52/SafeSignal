# AI Insights — LE-Grade Structured Briefing

**Date:** 2026-04-03
**Status:** Approved

## Problem

The current AI Insights card generates a metrics recitation (e.g., "SLA compliance is critically low at 21%, with only 4 incidents met. Assaults are the top category with 10 reports…"). Law enforcement users can already read those numbers from the dashboard. The card provides no operational guidance, no trend context, no actionable recommendations, and no priority ordering.

Root causes:
1. The prompt instructs Gemini to "write 2-3 sentences under 70 words referencing specific numbers" — this produces fact-listing, not analysis.
2. The data payload has no prior-period comparison, so Gemini cannot reason about trend direction.
3. The response is a single prose string — the frontend has no structure to render.

## Goal

Transform the AI Insights card into a structured 4-section LE briefing that answers:
- **What needs immediate action?** (Priority)
- **Is the situation improving or deteriorating?** (Trend)
- **Where and when should resources be concentrated?** (Pattern)
- **Where is the case pipeline stalling?** (Funnel Health)

## Scope

All use cases are covered by the existing period selector (7d/30d/90d/1y):
- Shift briefing (7d, tactical)
- Operational monitoring (30d)
- Command/strategic review (90d, 1y)

---

## Data Model Changes

### InsightsRequest (ml-service + backend)

Add 4 new optional fields alongside existing ones:

| Field | Type | Source | Purpose |
|---|---|---|---|
| `prev_period` | `{ total_incidents: int, sla_rate: float, top_category: str }` | Frontend: filter `allIncidents` to prior window | Enables trend comparison |
| `trend_direction` | `"rising" \| "falling" \| "stable"` | Frontend: compare first-half vs second-half of `trendLine` | Confirms trajectory for Gemini |
| `p75_response_min` | `float` | Frontend: `percentiles.p75` from `useAnalyticsData` | More operationally meaningful than average |
| `category_delta` | `{ category: str, current_count: int, prev_count: int, pct_change: float }` | Frontend: top category count in current vs prev period | Quantifies category trend |

**Prior period window computation** (frontend, inline in `index.jsx`):
```js
const periodDays = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period];
const periodMs = periodDays * 86400000;
const now = Date.now();
const prevIncidents = allIncidents.filter(i => {
  const t = new Date(i.created_at).getTime();
  return t >= now - 2 * periodMs && t < now - periodMs;
});
```

All 4 fields are optional — the endpoint degrades gracefully if any are absent.

### InsightsResponse (ml-service + backend)

**Before:**
```json
{ "insight": "string | null", "supported": true }
```

**After:**
```json
{
  "sections": {
    "priority": "string",
    "trend": "string",
    "pattern": "string",
    "funnel_health": "string"
  },
  "supported": true
}
```

`sections` is `null` when `supported: false` (local provider) or on generation failure.

---

## Prompt Design

Replace `_INSIGHTS_SYSTEM` in `ml-service/providers/gemini.py`:

```
You are an intelligence analyst briefing law enforcement officers using SafeSignal,
a public safety incident reporting platform.

You will receive aggregated analytics for a reporting period, plus a comparison
snapshot from the immediately preceding period of the same length.

Generate a structured 4-section briefing. Each section is 1-2 sentences.
Be direct, specific, and operational. Reference exact numbers.
Focus on what requires action — not what officers can already read from the charts.

Respond with ONLY a JSON object in this exact format — no extra text:
{
  "priority": "...",
  "trend": "...",
  "pattern": "...",
  "funnel_health": "..."
}

Section rules:
- priority: The single most urgent action item. Name the category, location, or
  overdue case count that requires immediate attention. If SLA breach rate exceeds
  20% of total incidents, lead with that and include the raw count.
- trend: Is the situation improving or deteriorating? Compare total incident volume
  and SLA rate against the prior period. State direction and magnitude with numbers.
  Use trend_direction to confirm the trajectory.
- pattern: Timing and geographic concentration that suggests resource reallocation.
  Name the peak day and hour, the dominant hotspot, and whether activity is
  concentrated or dispersed.
- funnel_health: Where is the pipeline stalling? Identify the stage with the
  largest drop-off. Flag if cases are stuck in verification or resolution is lagging.

Hard rules:
- Every section must contain at least one specific number
- Do not repeat the same statistic across sections
- Do not use vague language like "significant", "notable", or "leverage"
- Do not say "no change" without including the actual numbers
- p75_response_min is more operationally meaningful than the average — prefer it
  in priority or pattern when relevant
```

**Implementation notes:**
- `max_output_tokens`: 96 → **350** (4 sections × ~2 sentences)
- `generate_insights` return type: `Optional[str]` → `Optional[Dict]`
- Parsing: replace `_extract_insight_text` with `_extract_json` + `_require_keys(["priority", "trend", "pattern", "funnel_health"])`
- `_extract_insight_text` and `_validate_insight_text` become unused — delete them

---

## Frontend Card

### Props change

**Before:** `insight: string | null`
**After:** `sections: { priority, trend, pattern, funnel_health } | null`

### Rendering

4 labeled rows, each with a short label and section text. No card-within-card nesting — dense and scannable.

| Label | Color | Note |
|---|---|---|
| PRIORITY | Amber (`--dac-amber` or `#f59e0b`) | Action item |
| TREND | Blue with ▲/▼/— from `trend_direction` prop | Directional indicator |
| PATTERN | Muted (`--dac-muted`) | Standard |
| FUNNEL | Muted (`--dac-muted`) | Standard |

Rows separated by a thin rule (`1px solid var(--dac-border)`).

Skeleton loader (3 shimmer lines) unchanged.

### `index.jsx` changes

1. Compute `prev_period`, `trend_direction`, `p75_response_min`, `category_delta` inline after `useAnalyticsData` destructuring.
2. Add 4 new fields to `insightsPayload`.
3. Pass `trend_direction` through as a separate prop to `AIInsightsCard` for the ▲/▼/— indicator.
4. Change card mount: `insight=` → `sections=`.

---

## File Map

| Action | File | Change |
|---|---|---|
| Modify | `ml-service/providers/base.py` | Return type `Optional[str]` → `Optional[Dict]` |
| Modify | `ml-service/providers/local.py` | Return type annotation only |
| Modify | `ml-service/providers/gemini.py` | New prompt, new return type, delete `_extract_insight_text` / `_validate_insight_text`, bump `max_output_tokens` |
| Modify | `ml-service/main.py` | Expand `InsightsRequest`, change `InsightsResponse` to sections |
| Modify | `backend/src/utils/mlClient.js` | Pass through new request fields + new response shape |
| Modify | `backend/src/routes/stats.js` | Pass through 4 new fields from `req.body` |
| Modify | `moderator-dashboard/src/pages/DataAnalysisCenter/index.jsx` | Compute enrichment fields, update payload, update card props |
| Modify | `moderator-dashboard/src/pages/DataAnalysisCenter/components/AIInsightsCard.jsx` | New props, new section rendering |
| Modify | `moderator-dashboard/src/pages/DataAnalysisCenter/dac.css` | Section label styles |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Local provider (no Gemini) | `sections: null, supported: false` → card shows "AI insights unavailable for this provider" |
| `prev_period` data absent or zero incidents in prior window | Gemini receives empty prev_period; trend section uses available data only |
| Gemini returns malformed JSON | `_extract_json` retries up to 3 times; on exhaustion returns `null` → card shows error state |
| `sections` partially populated | `_require_keys` rejects response and retries — all 4 keys are required |
| Zero incidents in current period | `enabled: false` on query (existing guard) — card not rendered |
| Period changes | `queryKey: ["dac-insights", period]` triggers re-fetch (existing behavior) |

---

## Out of Scope

- Severity / risk score breakdown (not currently computed per-incident in the frontend)
- Reporter quality signals in the briefing
- Per-section refresh (all 4 sections regenerate together)
- Caching the enriched response server-side (5-minute React Query staleTime is sufficient)
