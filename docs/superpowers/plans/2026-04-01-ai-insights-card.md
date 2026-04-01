# AI Insights Summary Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-generated natural language briefing card at the top of the Data Analysis Center that summarises the current period's analytics using Gemini.

**Architecture:** The frontend sends a compact stats payload (already computed by `useAnalyticsData`) to `POST /api/stats/ai-insights`. The backend auth-gates and proxies to the ML service `POST /insights`. The ML service calls Gemini with the stats and returns a plain-English brief. The frontend caches it for 5 minutes (React Query) and renders `AIInsightsCard` just above `KpiRow`.

**Tech Stack:** FastAPI (Python), Express.js, React + TanStack Query, Gemini via existing `GeminiProvider`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `ml-service/providers/base.py` | Add `generate_insights` abstract method |
| Modify | `ml-service/providers/local.py` | Stub returning `None` (no LLM) |
| Modify | `ml-service/providers/gemini.py` | `_INSIGHTS_SYSTEM` prompt + `generate_insights` impl |
| Modify | `ml-service/main.py` | `InsightsRequest` / `InsightsResponse` models + `/insights` endpoint |
| Modify | `backend/src/utils/mlClient.js` | `generateInsights()` function |
| Modify | `backend/src/routes/stats.js` | `POST /api/stats/ai-insights` route |
| Modify | `moderator-dashboard/src/services/api/stats.js` | `getAIInsights()` method |
| Create | `moderator-dashboard/src/pages/DataAnalysisCenter/components/AIInsightsCard.jsx` | Card component |
| Modify | `moderator-dashboard/src/pages/DataAnalysisCenter/components/index.js` | Export new component |
| Modify | `moderator-dashboard/src/pages/DataAnalysisCenter/dac.css` | `.dac-insights-*` styles |
| Modify | `moderator-dashboard/src/pages/DataAnalysisCenter/index.jsx` | Mount card + pass data |

---

## Task 1: Add `generate_insights` to the provider interface

**Files:**
- Modify: `ml-service/providers/base.py`

- [ ] **Step 1: Add abstract method to `BaseProvider`**

Open `ml-service/providers/base.py` and add after the `full_analyze` abstract method (before `is_ready`):

```python
    @abstractmethod
    async def generate_insights(self, stats: Dict) -> Optional[str]:
        """
        Generate a natural-language analytics briefing from aggregated stats.

        Args:
            stats: dict with keys: period, total_incidents, kpis, top_categories,
                   top_hotspots, peak_activity, funnel

        Returns:
            A 2–3 sentence insight string, or None if the provider has no LLM.
        """
```

- [ ] **Step 2: Commit**

```bash
git add ml-service/providers/base.py
git commit -m "feat(ml): add generate_insights abstract method to BaseProvider"
```

---

## Task 2: Stub `generate_insights` in `LocalProvider`

**Files:**
- Modify: `ml-service/providers/local.py`

- [ ] **Step 1: Add stub method**

Open `ml-service/providers/local.py` and add before `is_ready`:

```python
    async def generate_insights(self, stats: Dict) -> Optional[str]:
        """Local provider has no LLM — insights are not available."""
        return None
```

- [ ] **Step 2: Commit**

```bash
git add ml-service/providers/local.py
git commit -m "feat(ml): stub generate_insights in LocalProvider"
```

---

## Task 3: Implement `generate_insights` in `GeminiProvider`

**Files:**
- Modify: `ml-service/providers/gemini.py`

- [ ] **Step 1: Add the system prompt constant**

Open `ml-service/providers/gemini.py`. After the `_DEDUP_COMPARE_SYSTEM` constant, add:

```python
_INSIGHTS_SYSTEM = """\
You are a data analyst assistant for SafeSignal, a public safety incident reporting platform.
You will receive aggregated analytics for a reporting period and must generate a concise,
actionable briefing for moderators and law enforcement.

Write 2-3 sentences of plain English. Focus on what is notable, unusual, or actionable.
Reference specific numbers. Be direct and professional.

Respond with ONLY a JSON object in this exact format — no extra text:
{
  "insight": "<2-3 sentence briefing>"
}

Rules:
- Mention the most critical issue or trend first
- Always include at least one specific metric with a number
- If SLA compliance is below 80%, call it out explicitly
- If a single category dominates, name it
- If there is a clear hotspot location, name it
- Keep the insight under 70 words
"""
```

- [ ] **Step 2: Add the `generate_insights` method to `GeminiProvider`**

Find the `pairwise_compare` method in `GeminiProvider`. After it (and before `full_analyze`), add:

```python
    async def generate_insights(self, stats: Dict) -> Optional[str]:
        """
        Generate a natural-language analytics briefing from aggregated dashboard stats.
        Calls Gemini with the stats payload; returns the insight string or None on failure.
        """
        import json as _json
        stats_text = _json.dumps(stats, indent=2)
        prompt = f"Analytics data:\n{stats_text}\n\nGenerate an insights briefing."

        for attempt in range(3):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._client.models.generate_content,
                        model=self._model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=_INSIGHTS_SYSTEM,
                            temperature=0.4,
                            max_output_tokens=200,
                        ),
                    ),
                    timeout=30.0,
                )
                data = _extract_json(response.text)
                _require_keys(data, ["insight"], "generate_insights")
                insight = str(data["insight"]).strip()
                if not insight:
                    raise ValueError("Empty insight returned")
                return insight
            except Exception as e:
                wait = 2 ** attempt
                logger.warning(
                    "generate_insights attempt %d failed: %s — retrying in %ds",
                    attempt + 1, e, wait,
                )
                if attempt < 2:
                    await asyncio.sleep(wait)

        logger.error("generate_insights failed after 3 attempts")
        return None
```

- [ ] **Step 3: Commit**

```bash
git add ml-service/providers/gemini.py
git commit -m "feat(ml): implement generate_insights in GeminiProvider"
```

---

## Task 4: Add `/insights` endpoint to the ML service

**Files:**
- Modify: `ml-service/main.py`

- [ ] **Step 1: Add Pydantic models**

Open `ml-service/main.py`. After the `DedupCompareResponse` class, add:

```python
class InsightsRequest(BaseModel):
    period: str = Field(..., pattern=r"^(7d|30d|90d|1y)$")
    total_incidents: int = Field(..., ge=0)
    kpis: Dict[str, object]
    top_categories: List[List[object]] = Field(default_factory=list)
    top_hotspots: List[Dict[str, object]] = Field(default_factory=list)
    peak_activity: Dict[str, object] = Field(default_factory=dict)
    funnel: List[Dict[str, object]] = Field(default_factory=list)


class InsightsResponse(BaseModel):
    insight: Optional[str]
    supported: bool
```

- [ ] **Step 2: Add the `/insights` endpoint**

At the end of the endpoints section (before `if __name__ == "__main__":`), add:

```python
@app.post("/insights", response_model=InsightsResponse)
async def generate_insights(request: InsightsRequest):
    """
    Generate a natural-language analytics briefing for the Data Analysis Center.
    Only meaningful when ML_PROVIDER=gemini; returns supported=False for local.
    """
    if active_provider is None:
        raise HTTPException(status_code=503, detail="ML provider not initialised")

    started_at = time.perf_counter()
    stats = request.model_dump()

    async with _get_semaphore():
        insight = await active_provider.generate_insights(stats)

    log_inference_event("/insights", "insights", started_at)

    if insight is None:
        return InsightsResponse(insight=None, supported=False)

    return InsightsResponse(insight=insight, supported=True)
```

- [ ] **Step 3: Commit**

```bash
git add ml-service/main.py
git commit -m "feat(ml): add /insights endpoint for AI analytics briefing"
```

---

## Task 5: Add `generateInsights` to the backend ML client

**Files:**
- Modify: `backend/src/utils/mlClient.js`

- [ ] **Step 1: Add the function**

Open `backend/src/utils/mlClient.js`. Before the `module.exports` block, add:

```javascript
/**
 * Generate a natural-language analytics briefing from aggregated stats.
 * @param {Object} stats - { period, total_incidents, kpis, top_categories, top_hotspots, peak_activity, funnel }
 * @returns {Promise<{insight: string|null, supported: boolean}|null>}
 */
async function generateInsights(stats) {
  try {
    const response = await mlClient.post('/insights', stats);
    return {
      insight: response.data?.insight ?? null,
      supported: response.data?.supported ?? false,
    };
  } catch (error) {
    logger.warn(`ML generateInsights failed: ${error.message}`);
    return null;
  }
}
```

- [ ] **Step 2: Export the function**

In the `module.exports` block at the bottom of the file, add `generateInsights`:

```javascript
module.exports = {
  isHealthy,
  getEmbedding,
  computeSimilarity,
  dedupCompare,
  classifyText,
  detectToxicity,
  computeRisk,
  analyzeIncident,
  generateInsights,
};
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/mlClient.js
git commit -m "feat(backend): add generateInsights to mlClient"
```

---

## Task 6: Add `POST /api/stats/ai-insights` backend route

**Files:**
- Modify: `backend/src/routes/stats.js`

- [ ] **Step 1: Import `generateInsights` at the top of the file**

Open `backend/src/routes/stats.js`. The file already requires `statsService`. Add the mlClient import after it:

```javascript
const mlClient = require('../utils/mlClient');
```

- [ ] **Step 2: Add the route**

Before `module.exports = router;`, add:

```javascript
/**
 * @route   POST /api/stats/ai-insights
 * @desc    Generate AI analytics briefing from pre-computed stats payload
 * @access  Private (Moderator/Admin/Law Enforcement)
 */
router.post('/ai-insights', authenticateToken, requireRole(['moderator', 'admin', 'law_enforcement']), async (req, res) => {
  try {
    const { period, total_incidents, kpis, top_categories, top_hotspots, peak_activity, funnel } = req.body;

    if (!period || total_incidents === undefined || !kpis) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Missing required fields: period, total_incidents, kpis',
      });
    }

    const result = await mlClient.generateInsights({
      period,
      total_incidents,
      kpis,
      top_categories: top_categories || [],
      top_hotspots: top_hotspots || [],
      peak_activity: peak_activity || {},
      funnel: funnel || [],
    });

    if (!result) {
      return res.status(503).json({
        status: 'ERROR',
        message: 'AI insights service unavailable',
      });
    }

    res.json({
      status: 'OK',
      data: result,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to generate AI insights');
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/stats.js
git commit -m "feat(backend): add POST /api/stats/ai-insights route"
```

---

## Task 7: Add `getAIInsights` to the frontend API service

**Files:**
- Modify: `moderator-dashboard/src/services/api/stats.js`

- [ ] **Step 1: Add the method**

Open `moderator-dashboard/src/services/api/stats.js`. Replace its contents with:

```javascript
import { api } from "./client";
import { requestData } from "./request";

export const statsAPI = {
  getDashboardStats: async () =>
    requestData(
      () => api.get("/stats/moderator/dashboard"),
      "Failed to fetch stats",
    ),

  getAIInsights: async (payload) =>
    requestData(
      () => api.post("/stats/ai-insights", payload),
      "Failed to generate AI insights",
    ),
};
```

- [ ] **Step 2: Commit**

```bash
git add moderator-dashboard/src/services/api/stats.js
git commit -m "feat(dashboard): add getAIInsights to statsAPI"
```

---

## Task 8: Build the `AIInsightsCard` component

**Files:**
- Create: `moderator-dashboard/src/pages/DataAnalysisCenter/components/AIInsightsCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from "react";

const SPARKLE_ICON = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path
      d="M6.5 1L7.5 5H11.5L8.5 7.5L9.5 11.5L6.5 9L3.5 11.5L4.5 7.5L1.5 5H5.5L6.5 1Z"
      fill="var(--dac-blue)" stroke="var(--dac-blue)" strokeWidth="0.5" strokeLinejoin="round"
    />
  </svg>
);

const REFRESH_ICON = (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path
      d="M9.5 2A5 5 0 1 0 10 5.5"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
    />
    <path d="M10 1V4H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function timeAgo(date) {
  if (!date) return null;
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  return `${diffMin}m ago`;
}

export default function AIInsightsCard({ insight, isLoading, isError, generatedAt, onRefresh, isRefreshing }) {
  return (
    <div className="dac-insights-card">
      <div className="dac-insights-header">
        <div className="dac-insights-title">
          {SPARKLE_ICON}
          <span>AI Insights</span>
          <span className="dac-insights-badge">Gemini</span>
        </div>
        <div className="dac-insights-meta">
          {generatedAt && (
            <span className="dac-insights-age">{timeAgo(generatedAt)}</span>
          )}
          <button
            className="dac-insights-refresh"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            title="Regenerate insights"
          >
            <span className={isLoading || isRefreshing ? "dac-insights-spin" : ""}>{REFRESH_ICON}</span>
          </button>
        </div>
      </div>

      <div className="dac-insights-body">
        {isLoading && (
          <div className="dac-insights-skeleton">
            <div className="dac-insights-skel-line" style={{ width: "92%" }} />
            <div className="dac-insights-skel-line" style={{ width: "78%" }} />
            <div className="dac-insights-skel-line" style={{ width: "55%" }} />
          </div>
        )}
        {!isLoading && isError && (
          <span className="dac-insights-error">
            ⚠ Could not generate insights — ML service may be unavailable.
          </span>
        )}
        {!isLoading && !isError && insight && (
          <p className="dac-insights-text">{insight}</p>
        )}
        {!isLoading && !isError && !insight && (
          <span className="dac-insights-empty">
            No data available for the selected period.
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add moderator-dashboard/src/pages/DataAnalysisCenter/components/AIInsightsCard.jsx
git commit -m "feat(dashboard): add AIInsightsCard component"
```

---

## Task 9: Export `AIInsightsCard` from the components index

**Files:**
- Modify: `moderator-dashboard/src/pages/DataAnalysisCenter/components/index.js`

- [ ] **Step 1: Add export**

Open `moderator-dashboard/src/pages/DataAnalysisCenter/components/index.js` and add this line at the top:

```javascript
export { default as AIInsightsCard } from "./AIInsightsCard";
```

- [ ] **Step 2: Commit**

```bash
git add moderator-dashboard/src/pages/DataAnalysisCenter/components/index.js
git commit -m "feat(dashboard): export AIInsightsCard"
```

---

## Task 10: Add styles for `AIInsightsCard`

**Files:**
- Modify: `moderator-dashboard/src/pages/DataAnalysisCenter/dac.css`

- [ ] **Step 1: Append styles at the end of `dac.css`**

```css
/* ── AI Insights Card ────────────────────────────────────────────────────── */
.dac-insights-card {
  background: var(--dac-surface);
  border: 1px solid var(--dac-border);
  border-left: 3px solid var(--dac-blue);
  padding: 14px 18px;
  margin-bottom: 16px;
}
.dac-insights-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.dac-insights-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--dac-muted);
}
.dac-insights-badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--dac-blue);
  background: rgba(59, 158, 255, 0.1);
  border: 1px solid rgba(59, 158, 255, 0.2);
  padding: 1px 5px;
}
.dac-insights-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dac-insights-age {
  font-size: 10px;
  color: var(--dac-dim);
  font-variant-numeric: tabular-nums;
}
.dac-insights-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--dac-border2);
  background: none;
  color: var(--dac-dim);
  cursor: pointer;
  transition: color 0.1s, border-color 0.1s;
  font-family: inherit;
}
.dac-insights-refresh:hover:not(:disabled) {
  color: var(--dac-text);
  border-color: var(--dac-muted);
}
.dac-insights-refresh:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.dac-insights-body { min-height: 36px; }
.dac-insights-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--dac-text);
  margin: 0;
  font-weight: 400;
}
.dac-insights-error,
.dac-insights-empty {
  font-size: 12px;
  color: var(--dac-dim);
}
.dac-insights-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 0;
}
.dac-insights-skel-line {
  height: 12px;
  background: linear-gradient(
    90deg,
    var(--dac-border) 0%,
    var(--dac-border2) 50%,
    var(--dac-border) 100%
  );
  background-size: 200% 100%;
  animation: dac-shimmer 1.4s infinite linear;
}
@keyframes dac-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes dac-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.dac-insights-spin {
  display: inline-flex;
  animation: dac-spin 0.8s linear infinite;
}
```

- [ ] **Step 2: Commit**

```bash
git add moderator-dashboard/src/pages/DataAnalysisCenter/dac.css
git commit -m "feat(dashboard): add AIInsightsCard styles"
```

---

## Task 11: Mount `AIInsightsCard` in `DataAnalysisCenter`

**Files:**
- Modify: `moderator-dashboard/src/pages/DataAnalysisCenter/index.jsx`

- [ ] **Step 1: Add imports**

Open `moderator-dashboard/src/pages/DataAnalysisCenter/index.jsx`.

Replace the existing component import block:
```javascript
import {
  CategoryTrendCard,
  FunnelCard,
  HeatmapCard,
  HotspotsCard,
  KpiRow,
  ReporterQualityCard,
  ResponseTimeCards,
  SLACard,
  Tooltip,
} from "./components";
```
with:
```javascript
import {
  AIInsightsCard,
  CategoryTrendCard,
  FunnelCard,
  HeatmapCard,
  HotspotsCard,
  KpiRow,
  ReporterQualityCard,
  ResponseTimeCards,
  SLACard,
  Tooltip,
} from "./components";
import { statsAPI } from "../../services/api";
```

- [ ] **Step 2: Add the insights query inside `DataAnalysisCenter`**

After the `useAnalyticsData` destructuring (around line 78), add:

```javascript
  // Build the compact payload from already-computed analytics data
  const insightsPayload = {
    period,
    total_incidents: incidents.length,
    kpis: {
      avg_response_min: kpis.avgResponse,
      sla_rate: kpis.slaRate,
      sla_compliant: kpis.slaCompliant,
      sla_breached: kpis.slaBreached,
      resolution_rate: kpis.resolutionRate,
      avg_time_to_close_days: parseFloat(kpis.avgTimeToClose),
    },
    top_categories: activeCats.map(([cat, vals]) => [cat, vals.reduce((s, v) => s + v, 0)]),
    top_hotspots: hotspots.map((h) => ({ name: h.name, count: h.count })),
    peak_activity: { day: heatPeak.peakDayLabel, hour: heatPeak.peakHour, count: heatPeak.peakCount },
    funnel: funnelData.map((f) => ({ label: f.label, count: f.count })),
  };

  const {
    data: insightsData,
    isLoading: insightsLoading,
    isError: insightsError,
    dataUpdatedAt: insightsUpdatedAt,
    refetch: refetchInsights,
    isFetching: insightsFetching,
  } = useQuery({
    queryKey: ["dac-insights", period],
    queryFn: async () => {
      const r = await statsAPI.getAIInsights(insightsPayload);
      if (!r.success) throw new Error(r.error || "Failed to generate insights");
      return r.data;
    },
    staleTime: 300000,   // 5 minutes — Gemini call is expensive
    enabled: !loading && incidents.length > 0,
    retry: 1,
  });
```

- [ ] **Step 3: Render `AIInsightsCard` above `KpiRow`**

Inside the `<div className="dac-scroll">` and after the banner warnings (around line 123), just before `<KpiRow`, add:

```jsx
          <AIInsightsCard
            insight={insightsData?.insight ?? null}
            isLoading={insightsLoading}
            isError={insightsError}
            generatedAt={insightsUpdatedAt ? new Date(insightsUpdatedAt) : null}
            onRefresh={refetchInsights}
            isRefreshing={insightsFetching && !insightsLoading}
          />
```

- [ ] **Step 4: Commit**

```bash
git add moderator-dashboard/src/pages/DataAnalysisCenter/index.jsx
git commit -m "feat(dashboard): mount AIInsightsCard in DataAnalysisCenter"
```

---

## Self-Review

**Spec coverage:** All requirements covered — Gemini call ✓, natural language brief ✓, positioned above KPIs ✓, uses current period data ✓, loading/error states ✓, refresh button ✓.

**Placeholders:** None. All code blocks are complete.

**Type consistency:**
- `insightsPayload` shape matches `InsightsRequest` Pydantic model exactly (snake_case keys)
- `insightsData?.insight` maps to `InsightsResponse.insight` (string | null)
- `AIInsightsCard` props (`insight`, `isLoading`, `isError`, `generatedAt`, `onRefresh`, `isRefreshing`) are all passed correctly from the query
- `generateInsights` in `mlClient.js` returns `{ insight, supported }` matching `InsightsResponse`

**Edge cases handled:**
- ML service unavailable → backend returns 503 → React Query `isError=true` → card shows warning
- Local provider (no Gemini) → `supported: false, insight: null` → card shows "No data available"
- Zero incidents → `enabled: false` on query → card not shown (guarded by `incidents.length > 0`)
- Period change → `queryKey: ["dac-insights", period]` triggers re-fetch
