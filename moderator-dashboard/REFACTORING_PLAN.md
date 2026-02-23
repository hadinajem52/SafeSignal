# Moderator Dashboard — Refactoring Plan

> **Purpose:** A safe, incremental refactoring guide organized into phases.  
> Each phase is independently deployable and verifiable — nothing should break between phases.  
> Run a visual smoke-test in the browser after every phase before proceeding.

---

## 📊 Current State Audit

| File | Lines | Bytes | Problem |
|---|---|---|---|
| `pages/DataAnalysisCenter/index.jsx` | **907** | 52 KB | 🔴 God component — CSS + constants + sub-components + data hooks + render all in one file |
| `pages/Users.jsx` | ~1050 | 39 KB | 🔴 Monolith (out of scope here, separate effort) |
| `pages/Dashboard.jsx` | 506 | 27 KB | 🟠 Inline CSS string + mixed concerns |
| `pages/Login.jsx` | ~650 | 26 KB | 🟠 Large, but self-contained (lower priority) |
| `pages/DataAnalysisCenter/sections/ModeratorDashboard.jsx` | 302 | 13.5 KB | 🟡 OK, minor duplication |
| `pages/DataAnalysisCenter/sections/AdminDashboard.jsx` | 208 | 9.8 KB | 🟡 Duplicates category logic from ModeratorDashboard |
| `pages/DataAnalysisCenter/sections/LeiDashboard.jsx` | 227 | 10.2 KB | 🟡 OK — uses shared components correctly |

### Root Problems Identified

1. **`DataAnalysisCenter/index.jsx` is a single 907-line God component** containing:
   - ~170 lines of raw CSS embedded as a JS template string (`DAC_STYLE`)
   - 7 pure utility functions (`filterByPeriod`, `heatColor`, `trendPath`, `diffMinutes`, etc.)
   - 5 data constants (`ACTIONED_STATUSES`, `CLOSED_STATUSES`, `FUNNEL_STAGES`, `CAT_DISPLAY`, `HIST_BUCKETS`)
   - 3 sub-components (`SLAGauge`, `Tooltip`, `TrendLine`) defined inline
   - 10+ `useMemo` blocks doing heavy data computation directly inside the render component

2. **Two parallel, incompatible CSS systems:**
   - `Dashboard.jsx` → `DASH_CSS` (CSS-in-JS string, `dash-*` class prefix)
   - `DataAnalysisCenter/index.jsx` → `DAC_STYLE` (CSS-in-JS string, `dac-*` class prefix)
   - All `sections/` files → Tailwind utility classes
   - This means the same app has 3 different styling approaches with no shared tokens.

3. **Logic duplication across section files:**
   - `AdminDashboard.jsx` re-implements the category bar logic already in `ModeratorDashboard.jsx`
   - Both `AdminDashboard` and `ModeratorDashboard` have identical "Platform Status" and "User Metrics" panels
   - `timeframe` label rendering (`'all' && 'All time'`, `'24h' && 'Last 24 Hours'`) is copy-pasted in all 3 section files

4. **No custom hooks** — all data fetching + transformation is co-located with render logic

5. **No shared constants file** — `STATUS_CFG` in `Dashboard.jsx`, `CAT_DISPLAY` in `index.jsx`, `STATUS_BG` in `LeiDashboard.jsx` all define related status/color mappings with no shared source of truth

---

## 🗂 Target File Structure (End State)

```
src/
├── App.jsx                              ← Unchanged
├── index.css                            ← Unchanged (global base)
│
├── constants/                           ← NEW
│   ├── incidentStatuses.js              ← ACTIONED_STATUSES, CLOSED_STATUSES, STATUS_CFG
│   └── categoryConfig.js                ← CAT_DISPLAY, CAT_COLORS
│
├── utils/                               ← Existing, expand
│   └── dateUtils.js                     ← Existing (keep)
│
├── components/                          ← Existing shared components
│   ├── index.js                         ← Existing barrel
│   └── ...                             ← All existing files (unchanged)
│
├── layouts/
│   ├── Layout.jsx                       ← Unchanged
│   └── Navigation.jsx                   ← Unchanged
│
├── pages/
│   ├── Dashboard.jsx                    ← REFACTORED: CSS extracted, sub-components split out
│   │
│   └── DataAnalysisCenter/
│       ├── index.jsx                    ← REFACTORED: slim orchestrator (~60 lines)
│       ├── roleConfig.js                ← Existing (unchanged)
│       │
│       ├── dac.css                      ← NEW: extracted from DAC_STYLE string (~170 lines)
│       │
│       ├── hooks/                       ← NEW
│       │   └── useAnalyticsData.js      ← All useMemo/derived state extracted here
│       │
│       ├── components/                  ← Existing, expanded
│       │   ├── index.js                 ← NEW barrel export
│       │   ├── BigStatTile.jsx          ← Existing (unchanged)
│       │   ├── IncidentRow.jsx          ← Existing (unchanged)
│       │   ├── QuickActionCard.jsx      ← Existing (unchanged)
│       │   ├── SectionCard.jsx          ← Existing (unchanged)
│       │   ├── SparklineChart.jsx       ← Existing (unchanged)
│       │   ├── UIStates.jsx             ← Existing (unchanged)
│       │   ├── Tooltip.jsx              ← NEW: extracted from index.jsx
│       │   ├── TrendLine.jsx            ← NEW: extracted from index.jsx
│       │   ├── SLAGauge.jsx             ← NEW: extracted from index.jsx
│       │   ├── HeatmapCard.jsx          ← NEW: extracted section block from index.jsx
│       │   ├── FunnelCard.jsx           ← NEW: extracted section block from index.jsx
│       │   ├── HotspotsCard.jsx         ← NEW: extracted section block from index.jsx
│       │   ├── ReporterQualityCard.jsx  ← NEW: extracted section block from index.jsx
│       │   ├── KpiRow.jsx               ← NEW: extracted section block from index.jsx
│       │   ├── ResponseTimeCards.jsx    ← NEW: extracted section block from index.jsx
│       │   ├── constants.js             ← Existing (expand)
│       │   └── helpers.js               ← Existing (expand with DAC helpers)
│       │
│       └── sections/
│           ├── ModeratorDashboard.jsx   ← Minor cleanup: extract shared timeframe helper
│           ├── AdminDashboard.jsx       ← Minor cleanup: remove duplicated category logic
│           └── LeiDashboard.jsx         ← Minor cleanup: remove duplicated timeframe labels
```

---

## 🚦 Phased Refactoring Plan

Each phase has:
- **Goal** — what is being done and why
- **Steps** — exact actions in order
- **Verification** — how to confirm nothing broke
- **Rollback** — what to revert if something breaks

---

## Phase 1 — Foundation: Shared Constants

**Goal:** Create a shared `constants/` folder to stop duplication of status configs and category colors. This is purely additive — nothing is deleted yet, so zero risk.

**Estimated effort:** 30–45 min  
**Risk level:** 🟢 Very Low (additive only, no existing imports change)

### Steps

#### 1.1 — Create `src/constants/incidentStatuses.js`

Move these out of `DataAnalysisCenter/index.jsx` and `Dashboard.jsx`:

```js
// src/constants/incidentStatuses.js

export const ACTIONED_STATUSES = new Set([
  'verified', 'dispatched', 'on_scene', 'investigating',
  'police_closed', 'published', 'resolved', 'archived',
])

export const CLOSED_STATUSES = new Set([
  'police_closed', 'resolved', 'archived',
])

// From Dashboard.jsx STATUS_CFG
export const STATUS_CFG = {
  rejected:      { label: 'Rejected',   color: '#E5484D', border: '#E5484D' },
  police_closed: { label: 'Closed',     color: '#30A46C', border: '#30A46C' },
  verified:      { label: 'Verified',   color: '#3B9EFF', border: '#3B9EFF' },
  submitted:     { label: 'Pending',    color: '#F5A623', border: '#F5A623' },
  in_review:     { label: 'In Review',  color: '#F5A623', border: '#F5A623' },
  dispatched:    { label: 'Dispatched', color: '#3B9EFF', border: '#3B9EFF' },
  resolved:      { label: 'Resolved',   color: '#30A46C', border: '#30A46C' },
}

export function getStatusCfg(status) {
  return STATUS_CFG[status] || { label: status || 'Unknown', color: '#3D4F65', border: '#3D4F65' }
}

export const FUNNEL_STAGES = [
  { label: 'Received',   match: () => true,    color: 'var(--dac-blue)' },
  { label: 'Verified',   match: s => ACTIONED_STATUSES.has(s), color: 'var(--dac-blue)' },
  { label: 'Dispatched', match: s => ['dispatched','on_scene','investigating','police_closed','resolved','archived'].includes(s), color: 'var(--dac-amber)' },
  { label: 'On Scene',   match: s => ['on_scene','investigating','police_closed','resolved','archived'].includes(s), color: 'var(--dac-amber)' },
  { label: 'Closed',     match: s => CLOSED_STATUSES.has(s), color: 'var(--dac-green)' },
]
```

#### 1.2 — Create `src/constants/categoryConfig.js`

```js
// src/constants/categoryConfig.js

// From DataAnalysisCenter/index.jsx CAT_DISPLAY
export const CAT_DISPLAY = {
  theft:               { label: 'Theft',     color: 'var(--dac-red)'   },
  assault:             { label: 'Assault',   color: '#C87533'           },
  vandalism:           { label: 'Vandalism', color: 'var(--dac-amber)' },
  suspicious_activity: { label: 'Suspicious', color: '#8B6FBF'         },
  traffic_incident:    { label: 'Traffic',   color: 'var(--dac-blue)'  },
  noise_complaint:     { label: 'Noise',     color: '#5BA4CF'           },
  fire:                { label: 'Fire',      color: '#E85D04'           },
  medical_emergency:   { label: 'Medical',   color: '#2ECC71'           },
  hazard:              { label: 'Hazard',    color: '#FFC300'           },
  other:               { label: 'Other',     color: 'var(--dac-muted)' },
}

// From Dashboard.jsx CAT_COLORS
export const CAT_COLORS = [
  '#E5484D', '#F5A623', '#3B9EFF', '#30A46C', '#3D4F65', '#3B9EFF', '#F5A623',
]
```

#### 1.3 — Create a shared `formatTimeframe` utility

This label pattern is copy-pasted in all 3 section files:

```js
// Add to src/utils/dateUtils.js (or a new src/utils/formatters.js)

export function formatTimeframeLabel(timeframe) {
  const MAP = {
    all:  'All time',
    '24h': 'Last 24 Hours',
    '7d':  'Last 7 Days',
    '30d': 'Last 30 Days',
    ytd:  'Year to Date',
  }
  return MAP[timeframe] ?? timeframe
}
```

### Verification ✅

- No imports have changed. The new files are not imported anywhere yet.
- `npm run dev` should start with no errors.
- All pages should look and function exactly as before.

### Rollback 🔄

Simply delete the new files. No other file was touched.

---

## Phase 2 — Extract CSS from `DataAnalysisCenter/index.jsx`

**Goal:** Remove the 170-line `DAC_STYLE` string from `index.jsx` and move it to a real `.css` file. This is the highest-impact, zero-logic-change step.

**Estimated effort:** 20–30 min  
**Risk level:** 🟢 Low (CSS content doesn't change, only where it lives)

### Steps

#### 2.1 — Create `src/pages/DataAnalysisCenter/dac.css`

Create a new file and paste the **exact content** of the `DAC_STYLE` template string (lines 7–172 of `index.jsx`) into it as a proper CSS file. Remove the JS template string delimiters.

```css
/* src/pages/DataAnalysisCenter/dac.css */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

.dac {
  --dac-bg:       #07090B;
  /* ... paste full content here ... */
}
```

#### 2.2 — Update `index.jsx`

- Remove the `DAC_STYLE` constant (lines 7–172)
- Remove the `<style>{DAC_STYLE}</style>` JSX tag
- Add at the top: `import './dac.css'`

```jsx
// BEFORE (index.jsx top)
const DAC_STYLE = `...170 lines...`
// ...
return (
  <>
    <style>{DAC_STYLE}</style>
    <Tooltip tip={tip}/>
    ...
  </>
)

// AFTER
import './dac.css'
// ...
return (
  <>
    <Tooltip tip={tip}/>
    ...
  </>
)
```

### Verification ✅

- Navigate to `/data-analysis-center` in the browser
- **The page must look pixel-identical** — same colors, fonts, spacing, hover effects
- Check that the topbar, KPI cards, heatmap, and all chart sections render correctly
- Open DevTools → Network tab → confirm `dac.css` is loaded

### Rollback 🔄

- Delete `dac.css`
- Restore `DAC_STYLE` constant and `<style>` tag in `index.jsx`

---

## Phase 3 — Extract Sub-Components from `index.jsx`

**Goal:** The three inline sub-components (`SLAGauge`, `Tooltip`, `TrendLine`) defined inside `index.jsx` should each live in their own file under `components/`.

**Estimated effort:** 45–60 min  
**Risk level:** 🟢 Low (pure extraction, no logic changes)

### Steps

#### 3.1 — Create `components/SLAGauge.jsx`

Cut the `SLAGauge` function (lines 240–258 of original `index.jsx`) into a new file:

```jsx
// src/pages/DataAnalysisCenter/components/SLAGauge.jsx
export default function SLAGauge({ pct }) {
  const color = pct >= 80 ? 'var(--dac-green)' : pct >= 60 ? 'var(--dac-amber)' : 'var(--dac-red)'
  return (
    <svg width="120" height="68" viewBox="0 0 120 68">
      {/* ... exact same SVG content ... */}
    </svg>
  )
}
```

#### 3.2 — Create `components/Tooltip.jsx`

Cut the `Tooltip` function (lines 260–278) into a new file:

```jsx
// src/pages/DataAnalysisCenter/components/Tooltip.jsx
export default function Tooltip({ tip }) {
  if (!tip) return null
  // ... exact same content ...
}
```

#### 3.3 — Create `components/TrendLine.jsx`

Cut the `TrendLine` function (lines 280–327) into a new file. It depends on `trendPath` and `trendArea` helpers, so also import those (see Phase 4 for the full helper extraction — for now, just copy the two helpers into TrendLine.jsx temporarily):

```jsx
// src/pages/DataAnalysisCenter/components/TrendLine.jsx
import { useState } from 'react'

function trendPath(data, W, H, maxVal) { /* ... */ }
function trendArea(data, W, H, maxVal) { /* ... */ }

export default function TrendLine({ data, color, maxVal, height, showTip, moveTip, hideTip }) {
  // ... exact same content ...
}
```

> **Note:** The temporary duplication of `trendPath`/`trendArea` in `TrendLine.jsx` will be cleaned up in Phase 4.

#### 3.4 — Update `index.jsx` imports

```jsx
// Add these imports to index.jsx
import SLAGauge from './components/SLAGauge'
import Tooltip  from './components/Tooltip'
import TrendLine from './components/TrendLine'

// Remove the inline function definitions for SLAGauge, Tooltip, TrendLine
```

### Verification ✅

- Navigate to `/data-analysis-center`
- The SLA gauge semicircle must render correctly
- Hovering chart bars must show the tooltip
- The 30-day trend line must render with hover crosshair functionality
- All interactions must work identically to before

### Rollback 🔄

- Remove the 3 new component files
- Restore the 3 function definitions back in `index.jsx`
- Remove the 3 new imports from `index.jsx`

---

## Phase 4 — Extract Helpers and Constants into `components/helpers.js`

**Goal:** Move all pure utility functions and DAC-specific constants from `index.jsx` into the existing `components/helpers.js` and `components/constants.js` files. Also clean up the temporary helper duplication from Phase 3.

**Estimated effort:** 30 min  
**Risk level:** 🟢 Low (pure functions, easy to verify)

### Steps

#### 4.1 — Add DAC helpers to `components/helpers.js`

Move these from `index.jsx` into `helpers.js`:

```js
// Add to DataAnalysisCenter/components/helpers.js

export function getPeriodMs(period) {
  const day = 86400000
  return { '7d': 7 * day, '30d': 30 * day, '90d': 90 * day, '1y': 365 * day }[period] ?? 30 * day
}

export function filterByPeriod(items, period) {
  const cutoff = Date.now() - getPeriodMs(period)
  return items.filter(i => new Date(i.created_at).getTime() >= cutoff)
}

export function diffMinutes(a, b) {
  return (new Date(b) - new Date(a)) / 60000
}

export function heatColor(val, max) {
  if (val === 0) return 'var(--dac-surface2)'
  const t = val / max
  if (t < 0.25) return 'rgba(59,158,255,0.15)'
  if (t < 0.5)  return 'rgba(59,158,255,0.4)'
  if (t < 0.75) return 'rgba(245,166,35,0.5)'
  return 'rgba(229,72,77,0.7)'
}

export function trendPath(data, W, H, maxVal) {
  const step = W / Math.max(data.length - 1, 1)
  return data.map((v, i) => {
    const x = i * step
    const y = H - (v / (maxVal || 1)) * H * 0.92
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

export function trendArea(data, W, H, maxVal) {
  return trendPath(data, W, H, maxVal) + ` L ${W} ${H} L 0 ${H} Z`
}
```

#### 4.2 — Add DAC constants to `components/constants.js`

Move these from `index.jsx` into `constants.js`:

```js
// Add to DataAnalysisCenter/components/constants.js

export const HIST_BUCKETS = [
  { label: '0-5m',   max: 5,        color: 'var(--dac-green)' },
  { label: '5-15m',  max: 15,       color: 'var(--dac-green)' },
  { label: '15-30m', max: 30,       color: 'var(--dac-blue)'  },
  { label: '30-60m', max: 60,       color: 'var(--dac-blue)'  },
  { label: '1-2h',   max: 120,      color: 'var(--dac-amber)' },
  { label: '2-4h',   max: 240,      color: 'var(--dac-amber)' },
  { label: '>4h',    max: Infinity, color: 'var(--dac-red)'   },
]

export const DAYS_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
```

#### 4.3 — Update `TrendLine.jsx` to use shared helpers

Remove the temporary duplicated `trendPath`/`trendArea` from `TrendLine.jsx` and import from `helpers.js`:

```jsx
// TrendLine.jsx
import { trendPath, trendArea } from './helpers'
```

#### 4.4 — Update `index.jsx` to import from helpers/constants

```jsx
// Replace inline definitions in index.jsx with imports:
import { filterByPeriod, diffMinutes, heatColor, trendPath, trendArea } from './components/helpers'
import { HIST_BUCKETS, DAYS_LABELS } from './components/constants'
```

#### 4.5 — Update `index.jsx` to use shared global constants (Phase 1 payoff)

```jsx
// Replace inline constants in index.jsx with the global ones from Phase 1:
import { ACTIONED_STATUSES, CLOSED_STATUSES, FUNNEL_STAGES } from '../../constants/incidentStatuses'
import { CAT_DISPLAY } from '../../constants/categoryConfig'
```

### Verification ✅

- Navigate to `/data-analysis-center` — all charts and cards render correctly
- Test period selector (7d, 30d, 90d, 1y) — data updates correctly
- Hover any chart element — tooltip appears correctly
- The `index.jsx` file should now be meaningfully shorter (no inline constants or helpers)

### Rollback 🔄

- Restore the inline constants/helpers in `index.jsx`
- Remove the new exports from `helpers.js` and `constants.js`
- Restore `trendPath`/`trendArea` inline in `TrendLine.jsx`

---

## Phase 5 — Extract the Custom Data Hook

**Goal:** Move all 10+ `useMemo` computation blocks out of the `DataAnalysisCenter` component into a dedicated `useAnalyticsData` hook. This is the most impactful step for maintainability.

**Estimated effort:** 60–90 min  
**Risk level:** 🟡 Medium (logic moves, but behavior must remain identical)

### Steps

#### 5.1 — Create `hooks/useAnalyticsData.js`

Create a new directory `DataAnalysisCenter/hooks/` and the file:

```js
// src/pages/DataAnalysisCenter/hooks/useAnalyticsData.js
import { useMemo } from 'react'
import { filterByPeriod, diffMinutes } from '../components/helpers'
import { HIST_BUCKETS, DAYS_LABELS } from '../components/constants'
import { ACTIONED_STATUSES, CLOSED_STATUSES, FUNNEL_STAGES } from '../../../constants/incidentStatuses'
import { CAT_DISPLAY } from '../../../constants/categoryConfig'

export function useAnalyticsData({ allIncidents, allUsers, period }) {
  const incidents = useMemo(
    () => filterByPeriod(allIncidents.filter(i => !i.is_draft), period),
    [allIncidents, period]
  )

  const kpis = useMemo(() => {
    // ... exact same kpi computation logic from index.jsx ...
  }, [incidents])

  const histogramData = useMemo(() => {
    // ... exact same histogram computation ...
  }, [kpis.responseTimes])

  const percentiles = useMemo(() => {
    // ... exact same percentile computation ...
  }, [kpis.responseTimes])

  const trendLine = useMemo(() => {
    // ... exact same 30-day trend computation ...
  }, [allIncidents])

  const heatmap = useMemo(() => {
    // ... exact same heatmap grid computation ...
  }, [incidents])

  const funnelData = useMemo(() => {
    // ... exact same funnel computation ...
  }, [incidents])

  const catTrend = useMemo(() => {
    // ... exact same category trend computation ...
  }, [allIncidents])

  const hotspots = useMemo(() => {
    // ... exact same hotspot computation ...
  }, [incidents])

  const reporterStats = useMemo(() => {
    // ... exact same reporter quality computation ...
  }, [incidents, allUsers])

  return {
    incidents,
    kpis,
    histogramData,
    percentiles,
    trendLine,
    heatmap,
    funnelData,
    catTrend,
    hotspots,
    reporterStats,
  }
}
```

#### 5.2 — Update `index.jsx` to use the hook

Replace all the `useMemo` blocks in `index.jsx` with a single hook call:

```jsx
// BEFORE (index.jsx): ~100 lines of useMemo blocks
const incidents = useMemo(...)
const kpis = useMemo(...)
// ... 8 more useMemo blocks ...

// AFTER
import { useAnalyticsData } from './hooks/useAnalyticsData'

const {
  incidents, kpis, histogramData, percentiles,
  trendLine, heatmap, funnelData, catTrend, hotspots, reporterStats,
} = useAnalyticsData({ allIncidents, allUsers, period })
```

After this step, `index.jsx` should be under 200 lines.

### Verification ✅

- Test every time period (7d, 30d, 90d, 1y) — KPI numbers must match before/after
- Verify heatmap renders with correct day/hour data
- Verify funnel bar widths are proportional
- Verify hotspot list is sorted correctly
- Open React DevTools → confirm hook renders are efficient (no unnecessary re-renders)

### Rollback 🔄

- Delete `hooks/useAnalyticsData.js`
- Restore all `useMemo` blocks directly into `index.jsx`

---

## Phase 6 — Extract Large JSX Sections into Chart Cards

**Goal:** Break the remaining large JSX render in `index.jsx` into focused card components. Each card is a self-contained visual block.

**Estimated effort:** 90–120 min  
**Risk level:** 🟡 Medium (JSX moves, props interface must be carefully defined)

### Steps

#### 6.1 — Create `components/KpiRow.jsx`

Extract the KPI grid block (the 4-card grid: Avg Response, SLA, Resolution Rate, Avg Time to Close).

```jsx
// Props: { kpis }
export default function KpiRow({ kpis }) { ... }
```

#### 6.2 — Create `components/ResponseTimeCards.jsx`

Extract the 2-column grid containing the histogram and 30-day trend line.

```jsx
// Props: { kpis, histogramData, histMax, percentiles, trendLine, trendMax, trendTotal, peakLabel, showTip, moveTip, hideTip }
export default function ResponseTimeCards({ ... }) { ... }
```

#### 6.3 — Create `components/HeatmapCard.jsx`

Extract the heatmap section (the full `dac-card` with the grid, hour row, and legend).

```jsx
// Props: { heatmap, heatMax, peakDow, peakHour, peakCount, showTip, moveTip, hideTip }
export default function HeatmapCard({ ... }) { ... }
```

#### 6.4 — Create `components/FunnelCard.jsx`

Extract the Case Resolution Funnel card.

```jsx
// Props: { funnelData, showTip, moveTip, hideTip }
export default function FunnelCard({ ... }) { ... }
```

#### 6.5 — Create `components/CategoryTrendCard.jsx`

Extract the Incidents by Category chart card.

```jsx
// Props: { catTrend, catMax, activeCats, showTip, moveTip, hideTip }
export default function CategoryTrendCard({ ... }) { ... }
```

#### 6.6 — Create `components/SLACard.jsx`

Extract the SLA Compliance card (with the gauge).

```jsx
// Props: { kpis }
export default function SLACard({ kpis }) { ... }
```

#### 6.7 — Create `components/HotspotsCard.jsx`

Extract the Repeat Incident Hotspots card.

```jsx
// Props: { hotspots, period, showTip, moveTip, hideTip }
export default function HotspotsCard({ ... }) { ... }
```

#### 6.8 — Create `components/ReporterQualityCard.jsx`

Extract the Reporter Signal Quality card.

```jsx
// Props: { reporterStats, showTip, moveTip, hideTip }
export default function ReporterQualityCard({ ... }) { ... }
```

#### 6.9 — Update `index.jsx` to use all new card components

After this step, the render section of `index.jsx` should look like:

```jsx
return (
  <>
    <Tooltip tip={tip} />
    <div className="dac" style={{ margin: '-2rem', minHeight: '100vh' }}>
      {/* TOPBAR */}
      <div className="dac-topbar">...</div>

      <div className="dac-scroll">
        {loading && <div className="dac-loading">Loading analytics data…</div>}

        <SectionHeader title="Key Performance Indicators" meta={`Last ${period} · ${incidents.length} reports`} />
        <KpiRow kpis={kpis} />

        <SectionHeader title="Response Time Distribution" meta="Cases by time-to-dispatch" />
        <ResponseTimeCards {...responseTimeProps} />

        <SectionHeader title="Incident Heatmap" meta="Hour × Day — incident frequency" />
        <HeatmapCard {...heatmapProps} />

        <SectionHeader title="Case Funnel & Resolution" />
        <div className="dac-grid-3col">
          <FunnelCard funnelData={funnelData} {...tipProps} />
          <CategoryTrendCard {...categoryProps} />
          <SLACard kpis={kpis} />
        </div>

        <SectionHeader title="Geographic & Signal Intelligence" />
        <div className="dac-grid-2">
          <HotspotsCard hotspots={hotspots} period={period} {...tipProps} />
          <ReporterQualityCard reporterStats={reporterStats} {...tipProps} />
        </div>
      </div>
    </div>
  </>
)
```

### Verification ✅

- Full visual regression test — every chart section must look identical
- Test all tooltip interactions on all chart cards
- Test period switching — all charts update accordingly
- Test with no data (empty state should show loading messages correctly)

### Rollback 🔄

- Remove the 8 new card component files
- Restore the full JSX sections back into `index.jsx`

---

## Phase 7 — Clean Up `Dashboard.jsx`

**Goal:** Apply the same CSS extraction pattern to `Dashboard.jsx` to make it consistent with the DAC approach.

**Estimated effort:** 30–45 min  
**Risk level:** 🟢 Low

### Steps

#### 7.1 — Create `src/pages/dashboard.css`

Move the `DASH_CSS` string (lines 9–154) into a proper CSS file:

```css
/* src/pages/dashboard.css */
.dash-section-row { ... }
.dash-stat-grid { ... }
/* ... all dash-* classes ... */
```

#### 7.2 — Update `Dashboard.jsx`

```jsx
// Remove: const DASH_CSS = `...`
// Remove: <style>{DASH_CSS}</style>
// Add:    import './dashboard.css'
```

#### 7.3 — Update `Dashboard.jsx` to use shared constants

```jsx
// Replace inline STATUS_CFG and getStatusCfg with:
import { STATUS_CFG, getStatusCfg } from '../constants/incidentStatuses'
// Replace inline CAT_COLORS with:
import { CAT_COLORS } from '../constants/categoryConfig'
```

### Verification ✅

- Navigate to `/` (Dashboard page) — must look pixel-identical
- Stat cards, map, activity feed, category bars all render correctly
- Status chips on recent reports show correct colors

### Rollback 🔄

- Restore `DASH_CSS` string and `<style>` tag
- Remove `dashboard.css`
- Restore inline `STATUS_CFG`, `getStatusCfg`, `CAT_COLORS`

---

## Phase 8 — Deduplicate `sections/` Files

**Goal:** Remove the copy-pasted logic that appears across `ModeratorDashboard.jsx`, `AdminDashboard.jsx`, and `LeiDashboard.jsx`.

**Estimated effort:** 45 min  
**Risk level:** 🟡 Medium (shared logic must be carefully tested for each role)

### Steps

#### 8.1 — Create a shared `TimeframeLabel` helper

Use the `formatTimeframeLabel` function created in Phase 1.3 and replace the repeated conditional chains in all 3 section files:

```jsx
// In all 3 section files, replace:
{timeframe === 'all' && 'All time'}
{timeframe === '24h' && 'Last 24 Hours'}
{timeframe === '7d' && 'Last 7 Days'}
{timeframe === '30d' && 'Last 30 Days'}
{timeframe === 'ytd' && 'Year to Date'}

// With:
import { formatTimeframeLabel } from '../../../utils/dateUtils'
{formatTimeframeLabel(timeframe)}
```

#### 8.2 — Extract shared `CategoryBarList` from Admin/Moderator dashboards

Both `AdminDashboard.jsx` and `ModeratorDashboard.jsx` render an `Incident Categories` section card with an identical bar chart list. Extract this into a shared component:

```jsx
// src/pages/DataAnalysisCenter/components/CategoryBarList.jsx
export default function CategoryBarList({ incidents, maxCategories = 6, accentColor = 'bg-primary' }) {
  // shared category bar logic
}
```

Then update both `AdminLeft` and `ModeratorLeft` to import and use `CategoryBarList`.

#### 8.3 — Extract shared `PlatformStatusCard`

Both `AdminLeft` and `ModeratorLeft` render a `Platform Status` section card. Extract it:

```jsx
// src/pages/DataAnalysisCenter/components/PlatformStatusCard.jsx
export default function PlatformStatusCard({ stats, extras = [] }) {
  // base status items + extras (admin adds "Applications")
}
```

### Verification ✅

- Navigate as Moderator → check Dashboard sidebar: categories and platform status render
- Navigate as Admin → check Dashboard sidebar: categories, platform status, and applications count render
- Navigate as LEI → check Dashboard sidebar: no regression
- Switch timeframes — subtitle labels update correctly for all roles

### Rollback 🔄

- Restore the copy-pasted code in the 3 section files
- Delete `CategoryBarList.jsx` and `PlatformStatusCard.jsx`

---

## Phase 9 — Create Barrel Exports (Final Cleanup)

**Goal:** Add clean `index.js` barrel files to `components/` to simplify imports across the board.

**Estimated effort:** 20 min  
**Risk level:** 🟢 Very Low

### Steps

#### 9.1 — Create `DataAnalysisCenter/components/index.js`

```js
// src/pages/DataAnalysisCenter/components/index.js
export { default as BigStatTile }          from './BigStatTile'
export { default as CategoryBarList }      from './CategoryBarList'
export { default as CategoryTrendCard }    from './CategoryTrendCard'
export { default as FunnelCard }           from './FunnelCard'
export { default as HeatmapCard }          from './HeatmapCard'
export { default as HotspotsCard }         from './HotspotsCard'
export { default as IncidentRow }          from './IncidentRow'
export { default as KpiRow }               from './KpiRow'
export { default as PlatformStatusCard }   from './PlatformStatusCard'
export { default as QuickActionCard }      from './QuickActionCard'
export { default as ReporterQualityCard }  from './ReporterQualityCard'
export { default as ResponseTimeCards }    from './ResponseTimeCards'
export { default as SectionCard }          from './SectionCard'
export { default as SLACard }              from './SLACard'
export { default as SLAGauge }             from './SLAGauge'
export { default as SparklineChart }       from './SparklineChart'
export { default as Tooltip }              from './Tooltip'
export { default as TrendLine }            from './TrendLine'
export * from './UIStates'
```

#### 9.2 — Update imports in `index.jsx` and section files

Replace relative deep imports with the barrel:

```jsx
// Before:
import SLAGauge from './components/SLAGauge'
import Tooltip  from './components/Tooltip'
import TrendLine from './components/TrendLine'
import KpiRow from './components/KpiRow'
// ...

// After:
import { SLAGauge, Tooltip, TrendLine, KpiRow, /* etc */ } from './components'
```

### Verification ✅

- `npm run dev` starts clean with no import errors
- All pages render without console errors

---

## 📋 Phase Summary & Checklist

| Phase | What | Risk | Time |
|---|---|---|---|
| **1** | Create shared `constants/` files | 🟢 Very Low | 30–45 min |
| **2** | Extract `DAC_STYLE` → `dac.css` | 🟢 Low | 20–30 min |
| **3** | Extract `SLAGauge`, `Tooltip`, `TrendLine` components | 🟢 Low | 45–60 min |
| **4** | Extract helpers and constants from `index.jsx` | 🟢 Low | 30 min |
| **5** | Extract `useAnalyticsData` custom hook | 🟡 Medium | 60–90 min |
| **6** | Extract 8 chart card components | 🟡 Medium | 90–120 min |
| **7** | Clean up `Dashboard.jsx` | 🟢 Low | 30–45 min |
| **8** | Deduplicate `sections/` files | 🟡 Medium | 45 min |
| **9** | Add barrel exports | 🟢 Very Low | 20 min |

**Total estimated effort:** ~7–9 hours, spread across sessions

---

## 🏁 Expected End State Metrics

| File | Before | After |
|---|---|---|
| `DataAnalysisCenter/index.jsx` | 907 lines | ~60–80 lines |
| `DataAnalysisCenter/hooks/useAnalyticsData.js` | (new) | ~120 lines |
| `DataAnalysisCenter/components/*` | 8 files | 18 files (all focused, <100 lines each) |
| `DataAnalysisCenter/dac.css` | (embedded) | ~170 lines in proper CSS |
| `pages/Dashboard.jsx` | 506 lines | ~350 lines |
| `pages/dashboard.css` | (embedded) | ~145 lines in proper CSS |
| Duplicated logic | 3 files | 0 files (shared components) |

---

## ✅ General Rules Throughout Refactoring

1. **One phase at a time** — commit and verify before moving on
2. **Never change behavior** — only move code, never edit logic during extraction
3. **Keep prop interfaces explicit** — document what each new component expects
4. **Test with all 3 roles** — moderator, admin, and law enforcement after every phase
5. **If it breaks, roll back immediately** — don't try to fix forward during extraction phases
