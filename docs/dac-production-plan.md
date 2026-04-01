# DAC Production-Ready Plan

## Problem Summary

The Data Analysis Center (DAC) has four blockers preventing production readiness:

1. **No trustworthy analytics model** — all metrics are computed client-side from raw incident rows, making them dependent on the fetch limit and vulnerable to skew.
2. **No scalable data strategy** — the page polls `GET /api/incidents?limit=500` every 30 seconds, sending large raw payloads for what is ultimately aggregated display data.
3. **No explicit error state / observability hooks** — a single failed fetch degrades silently; there is no structured logging or Sentry capture for DAC-specific failures.
4. **No meaningful test coverage** — neither the analytics computation logic nor the server endpoint has any tests.

---

## Track 1 — Server-Owned Analytics Endpoint

### 1.1 New file: `backend/src/services/analyticsService.js`

All computation moves to SQL. The service accepts `period` (`7d` | `30d` | `90d` | `1y`) and translates it to a `INTERVAL` for every query. No client-side math.

**Functions to implement:**

| Function | SQL technique | Returns |
|---|---|---|
| `getKpis(period)` | `COUNT`, `FILTER`, `AVG(EXTRACT(EPOCH FROM ...))` | `{ total, actioned, closed, avgResponseMin, slaRate, resolutionRate, avgTimeToCloseDays }` |
| `getResponseHistogram(period)` | `WIDTH_BUCKET` on response seconds | `[{ label, min, max, count, color }]` — 6 buckets matching current `HIST_BUCKETS` |
| `getTrendLine(period)` | `DATE_TRUNC` / `GENERATE_SERIES` + `LEFT JOIN` | `[{ bucketStart, count }]` — N buckets depending on period |
| `getCategoryTrend(period)` | `DATE_TRUNC` + `category` + `GENERATE_SERIES` | `{ [cat]: [count, count, ...] }` per window |
| `getHeatmap(period)` | `EXTRACT(dow)` + `EXTRACT(hour)` + `COUNT` | `number[7][24]` |
| `getFunnel(period)` | `status` groups as defined by `FUNNEL_STAGES` | `[{ label, count, color }]` |
| `getHotspots(period)` | `GROUP BY location_name ORDER BY COUNT DESC LIMIT 5` | `[{ name, count, pct }]` |
| `getReporterQuality(period)` | `reporter_id` + actioned / total ratio, `JOIN users` | `[{ id, name, initials, total, valid, pct, color }]` |
| `getSummary(period)` | Calls all above in `Promise.all` | Combined response object |

**Response shape:**

```json
{
  "meta": {
    "period": "30d",
    "total": 312,
    "generatedAt": "2026-04-01T10:00:00.000Z"
  },
  "kpis": { ... },
  "histogram": [ ... ],
  "percentiles": { "p25": 8, "p50": 22, "p75": 61, "p90": 180 },
  "trendLine": [ ... ],
  "categoryTrend": { ... },
  "catBucketLabels": [ ... ],
  "heatmap": [ [...], ... ],
  "funnel": [ ... ],
  "hotspots": [ ... ],
  "reporterQuality": [ ... ]
}
```

**Percentile computation:** Use PostgreSQL `PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ...)` — a single ordered-set aggregate replaces the client-side sort + index math.

**SLA definition:** Response time ≤ 30 minutes, using `created_at → updated_at` as the proxy (same as current; documented in the response with a `meta.responseTimeNote` field).

**Period-to-bucket mapping** (mirrors current `getPeriodBucketConfig`, now lives in the service):

| Period | Trend buckets | Trend interval | Cat windows | Cat interval |
|---|---|---|---|---|
| `7d` | 7 | `1 day` | 7 | `1 day` |
| `30d` | 30 | `1 day` | 4 | `7 days` |
| `90d` | 30 | `3 days` | 4 | `22.5 days` → `'22 hours 30 minutes'` |
| `1y` | 52 | `7 days` | 4 | `91 days` |

---

### 1.2 New file: `backend/src/routes/analytics.js`

Single route:

```
GET /api/analytics/summary?period=30d
Auth: authenticateToken + requireRole(['moderator', 'admin'])
```

- Validates `period` is one of `7d | 30d | 90d | 1y`; defaults to `30d`.
- Delegates entirely to `analyticsService.getSummary(period)`.
- Returns `{ status: 'OK', data: <summary> }`.
- Errors handled via existing `handleServiceError` pattern.
- Structured logger call on success: `logger.info('DAC analytics generated', { period, total: data.meta.total, durationMs })`.
- On uncaught error, Sentry captures automatically via existing `errorHandler` middleware.

---

### 1.3 Register route in `backend/src/index.js`

```js
const analyticsRoutes = require('./routes/analytics');
// ...
app.use('/api/analytics', analyticsRoutes);
```

---

## Track 2 — Frontend Data Strategy

### 2.1 New function: `moderator-dashboard/src/services/api/analytics.js`

```js
export const analyticsAPI = {
  getSummary: (period) =>
    requestData(() => api.get('/analytics/summary', { params: { period } }), 'Failed to fetch analytics'),
};
```

Export from `moderator-dashboard/src/services/api.js`.

---

### 2.2 Refactor `moderator-dashboard/src/pages/DataAnalysisCenter/index.jsx`

**Replace:**
```js
// Two separate queries: dac-incidents (500 rows, 30s poll) + dac-users
```

**With:**
```js
const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
  queryKey: ['dac-analytics', period],
  queryFn: () => analyticsAPI.getSummary(period),
  staleTime: 120_000,
  refetchInterval: 120_000,
  refetchOnWindowFocus: true,
});
```

- `queryKey` includes `period` so switching period triggers an immediate refetch.
- Remove the `allIncidents.length >= 500` truncation banner. Replace with `data?.meta.total` shown in the topbar subtitle: `{user?.region || 'All Regions'} · {data?.meta.total ?? '…'} incidents · Analysis View`.
- Add "as of" timestamp using `dataUpdatedAt`: shown in topbar when data is stale (>2 min).
- Single `isError` banner: `⚠ Failed to load analytics — {error?.message}. Retrying…`

---

### 2.3 Refactor `moderator-dashboard/src/pages/DataAnalysisCenter/hooks/useAnalyticsData.js`

The hook becomes a **thin adapter** — no computation, no `useMemo` math. It maps the server response shape to the prop shapes expected by each card component.

```js
export function useAnalyticsData({ data, period }) {
  // data is the server response or undefined
  const safe = data ?? {};
  return {
    incidents:       [],                     // no longer needed by components
    kpis:            safe.kpis ?? DEFAULT_KPIS,
    histogramData:   safe.histogram ?? [],
    histMax:         Math.max(...(safe.histogram ?? []).map(b => b.count), 1),
    percentiles:     buildPercentileRows(safe.percentiles),   // pure shape mapping
    trendLine:       (safe.trendLine ?? []).map(b => b.count),
    trendMax:        Math.max(...(safe.trendLine ?? []).map(b => b.count), 1),
    trendTotal:      safe.meta?.total ?? 0,
    trendWeeklyAvg:  safe.meta?.weeklyAvg ?? '0.0',
    trendXLabels:    buildTrendXLabels(safe.trendLine, period),
    peakLabel:       buildPeakLabel(safe.trendLine, period),
    heatmap:         safe.heatmap ?? Array.from({ length: 7 }, () => Array(24).fill(0)),
    heatMax:         Math.max(...(safe.heatmap ?? []).flatMap(r => r), 1),
    heatPeak:        buildHeatPeak(safe.heatmap),
    funnelData:      safe.funnel ?? [],
    catTrend:        safe.categoryTrend ?? {},
    catMax:          buildCatMax(safe.categoryTrend),
    activeCats:      buildActiveCats(safe.categoryTrend),
    catBucketLabels: safe.catBucketLabels ?? [],
    hotspots:        safe.hotspots ?? [],
    reporterStats:   safe.reporterQuality ?? [],
  };
}
```

All `buildX` helpers are **pure functions** at the top of the file — no React imports, no hooks. They are the only logic remaining in the frontend for this feature and are trivially testable.

---

### 2.4 Remove dead client-side computation from `useAnalyticsData.js`

The following imports and functions are deleted entirely once the server owns the computation:

- `filterByPeriod`, `diffMinutes`, `getPeriodMs` (from helpers)
- `HIST_BUCKETS`, `DAYS_LABELS` (from constants — keep `DAYS_LABELS` for `buildHeatPeak` label lookup)
- `ACTIONED_STATUSES`, `CLOSED_STATUSES`, `FUNNEL_STAGES`
- `CAT_DISPLAY` (still needed for color/label lookups in card components — keep there)
- All `useMemo` blocks computing kpis, histogram, trend, category, heatmap, funnel, hotspots, reporterStats

---

## Track 3 — Error State & Observability

### 3.1 Backend logging contract

`analyticsService.getSummary` wraps all `Promise.all` in a `try/catch` that:
- Logs `logger.error('Analytics summary failed', { period, error: err.message })` before rethrowing.
- Sentry captures automatically via `errorHandler` middleware (already registered).
- On success logs `logger.info('Analytics summary', { period, durationMs, total })`.

No new Sentry calls needed — the existing `errorHandler` at the bottom of `index.js` already calls `Sentry.Handlers.errorHandler()`.

### 3.2 Frontend error UX

| State | UI |
|---|---|
| `isLoading && !data` | Existing `dac-loading` spinner |
| `isError` | Single `dac-error-banner` with message + "Retrying in 2 min" |
| `data` stale > 5 min | Topbar subtitle shows "⚠ data may be stale" in amber |
| `data.meta.total` present | Topbar shows total count instead of hard-coded region string |

### 3.3 Remove the two separate error banners

`incError` and `usersError` banners are deleted — they were artifacts of the two-query approach. Replaced by the single `isError` banner above.

---

## Track 4 — Test Coverage

### 4.1 Install test frameworks

**Backend** — add to `devDependencies`:
```
jest
```
Add to `package.json` scripts:
```json
"test": "jest --testPathPattern=src/"
```
Add Jest config in `package.json`:
```json
"jest": {
  "testEnvironment": "node"
}
```

**Frontend (moderator-dashboard)** — add to `devDependencies`:
```
vitest
@vitest/coverage-v8
```
Add to `package.json` scripts:
```json
"test": "vitest run",
"test:coverage": "vitest run --coverage"
```

---

### 4.2 Backend: `backend/src/services/analyticsService.test.js`

Tests use Jest with a mocked `db` module (`jest.mock('../config/database')`).

| Test | What it asserts |
|---|---|
| `getKpis – empty dataset` | All KPI values are zero / `'0'`, no division errors |
| `getKpis – SLA calculation` | Given actioned incidents where half are ≤30 min, `slaRate` = 50 |
| `getKpis – resolution rate` | 3 closed / 10 total → `resolutionRate` = 30 |
| `getResponseHistogram – bucket assignment` | A 7-min response lands in the `5–15 min` bucket |
| `getResponseHistogram – overflow` | A 500-min response lands in the `> 4hr` bucket |
| `getTrendLine – correct bucket count` | `7d` → 7 items, `1y` → 52 items |
| `getTrendLine – zero padding` | Periods with no incidents return all-zero array, not empty |
| `getCategoryTrend – structure` | Returns an object keyed by all categories, each with correct window count |
| `getSummary – shape` | Returns object with all required top-level keys |
| `getSummary – meta.period matches input` | `getSummary('90d')` → `meta.period === '90d'` |

---

### 4.3 Frontend: `moderator-dashboard/src/pages/DataAnalysisCenter/hooks/useAnalyticsData.test.js`

Tests use Vitest. The adapter's pure helper functions are imported directly (no React, no hooks):

| Test | What it asserts |
|---|---|
| `buildPercentileRows – formats minutes` | `{ p50: 22 }` → `{ val: 22, unit: 'min' }` |
| `buildPercentileRows – formats hours` | `{ p75: 90 }` → `{ val: '1.5', unit: 'hr' }` |
| `buildHeatPeak – finds correct cell` | Grid with peak at `[2][14]` → `peakDow=2, peakHour=14` |
| `buildActiveCats – filters zeros` | Category with all-zero values is excluded |
| `buildActiveCats – respects slice(6)` | Returns at most 6 categories |
| `buildCatMax – handles empty` | Returns 1 (floor) when no category data |
| `buildPeakLabel – returns dash for zeros` | All-zero trendLine → `'—'` |
| `buildTrendXLabels – 7d` | Returns 7 labels |
| `buildTrendXLabels – 1y` | Returns 6 abbreviated week labels |

---

## File Changeset Summary

### New files

| File | Purpose |
|---|---|
| `backend/src/services/analyticsService.js` | All SQL aggregations for DAC |
| `backend/src/routes/analytics.js` | `GET /api/analytics/summary` route handler |
| `moderator-dashboard/src/services/api/analytics.js` | Frontend API client for analytics endpoint |
| `backend/src/services/analyticsService.test.js` | Jest unit tests for analytics service |
| `moderator-dashboard/src/pages/DataAnalysisCenter/hooks/useAnalyticsData.test.js` | Vitest unit tests for adapter helpers |

### Modified files

| File | Change |
|---|---|
| `backend/src/index.js` | Register `/api/analytics` route |
| `backend/package.json` | Add `jest` dev dependency + test script |
| `moderator-dashboard/src/services/api.js` | Export `analyticsAPI` |
| `moderator-dashboard/package.json` | Add `vitest` dev dependency + test scripts |
| `moderator-dashboard/src/pages/DataAnalysisCenter/index.jsx` | Replace two queries with single analytics query; update topbar; simplify error state |
| `moderator-dashboard/src/pages/DataAnalysisCenter/hooks/useAnalyticsData.js` | Strip all computation; become pure adapter with testable helper functions |

### Unchanged files

All DAC card components (`CategoryTrendCard`, `ResponseTimeCards`, `HeatmapCard`, `FunnelCard`, `SLACard`, `KpiRow`, `HotspotsCard`, `ReporterQualityCard`, `TrendLine`, `Tooltip`) receive the same prop shapes — no changes required.

---

## What This Does Not Do

- Does not add a caching layer (Redis/CDN) — the 2-minute `staleTime` + PostgreSQL aggregations are sufficient at current scale. Caching is a follow-on concern once query latency is measured.
- Does not add pagination to the analytics endpoint — the endpoint returns a fixed summary shape, not raw rows.
- Does not change the SLA definition (≤30 min, `created_at → updated_at` proxy) — that is a product decision, not an engineering one.
- Does not add E2E or integration tests — those require a test database fixture, which is a separate infrastructure concern.
