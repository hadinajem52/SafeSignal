# Community Feed — Implementation Plan

> **Goal**: Surface LE-disclosed, officially closed incident reports in a community feed embedded on the Home screen. The Map screen switches to show only those disclosed pins. `ContributionsGrid` moves to the Account screen.
>
> Each phase is independently verifiable and does **not** break existing functionality if the next phase hasn't started yet.

---

## Phase 1 — Database: Add Disclosure Columns

**Risk**: None — additive-only migrations, no existing column is modified.

### 1.1 — `backend/src/database/init.js`

Add two new columns to the `incidents` table and an associated index inside `initDatabase()`:

```sql
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS is_disclosed BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS is_location_fuzzed BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_incidents_feed
  ON incidents (is_disclosed, status, updated_at DESC)
  WHERE is_disclosed = TRUE;
```

Place these blocks alongside the existing `ALTER TABLE` statements in `initDatabase()` (after the `incidents_closure_outcome_check` block, before the index section).

**Verify**: Run `node backend/src/database/init.js` and confirm no errors. Query `\d incidents` in psql — both columns should appear with `DEFAULT FALSE`.

---

## Phase 2 — Backend: Feed Endpoint + LEI Status Update

**Risk**: Low — new route added without touching any existing route. LEI PATCH gains two optional fields; omitting them preserves current behaviour.

### 2.1 — New service function in `backend/src/services/incidentService.js`

Add `getPublicFeed(filters)` near the end of the file, just before `module.exports`:

```js
/**
 * Get publicly disclosed, LE-closed incidents for the community feed.
 * If is_location_fuzzed = TRUE, apply ±150m jitter to lat/lng.
 * The fuzz flag is never returned to the client.
 */
async function getPublicFeed({ category, closure_outcome, severity, lat, lng, radius, sort, limit = 20, offset = 0 }) {
  const conditions = [
    `i.is_disclosed = TRUE`,
    `i.status IN ('police_closed', 'resolved', 'published')`,
    `i.closure_outcome IS NOT NULL`,
    `i.is_draft = FALSE`,
  ];
  const params = [];
  let p = 1;

  if (category) { conditions.push(`i.category = $${p++}`); params.push(category); }
  if (closure_outcome) { conditions.push(`i.closure_outcome = $${p++}`); params.push(closure_outcome); }
  if (severity) { conditions.push(`i.severity = $${p++}`); params.push(severity); }

  let geoJoin = '';
  if (lat && lng && radius) {
    geoJoin = `AND ST_DWithin(i.location, ST_SetSRID(ST_MakePoint($${p++}::float, $${p++}::float), 4326)::geography, $${p++})`;
    params.push(parseFloat(lng), parseFloat(lat), parseFloat(radius));
  }

  const orderBy = sort === 'severity'
    ? `CASE i.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END ASC, i.updated_at DESC`
    : `i.updated_at DESC`;

  const rows = await db.manyOrNone(
    `SELECT
       i.incident_id, i.title, i.category, i.severity, i.status,
       i.closure_outcome, i.closure_details,
       i.location_name, i.photo_urls,
       i.incident_date, i.updated_at AS closed_at,
       -- Apply jitter when fuzzed; never expose the flag itself
       CASE WHEN i.is_location_fuzzed
         THEN i.latitude  + (random() - 0.5) * 0.0027
         ELSE i.latitude
       END AS latitude,
       CASE WHEN i.is_location_fuzzed
         THEN i.longitude + (random() - 0.5) * 0.0027
         ELSE i.longitude
       END AS longitude
     FROM incidents i
     WHERE ${conditions.join(' AND ')} ${geoJoin}
     ORDER BY ${orderBy}
     LIMIT $${p++} OFFSET $${p++}`,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  );

  const total = await db.one(
    `SELECT COUNT(*) AS total FROM incidents i
     WHERE ${conditions.join(' AND ')} ${geoJoin}`,
    params
  );

  return { incidents: rows, total: parseInt(total.total, 10) };
}
```

Export it alongside the other functions:
```js
module.exports = {
  // ... existing exports ...
  getPublicFeed,
};
```

### 2.2 — Update `updateLEIStatus` in `backend/src/services/incidentService.js`

Find the `updateLEIStatus` function (search for `'police_closed'` or `closure_outcome` inside the service). Add `is_disclosed` and `is_location_fuzzed` as optional parameters and write them to the DB only when provided:

```js
// Add to function signature:
async function updateLEIStatus(incidentId, status, closure_outcome, closure_details, user, { isDisclosed, isLocationFuzzed } = {}) {

// In the UPDATE query, add to SET clause when values are provided:
//   is_disclosed = COALESCE($N, is_disclosed),
//   is_location_fuzzed = COALESCE($N, is_location_fuzzed),
```

Pass the two optional booleans as `NULL` when not provided, so `COALESCE` preserves the existing value — existing callers stay unaffected.

### 2.3 — New route in `backend/src/routes/incidents.js`

Add this new route **before** the generic `GET /:id` route (to avoid route-order conflict):

```js
/**
 * @route   GET /api/incidents/feed
 * @desc    Get publicly disclosed LE-closed incidents (community feed)
 * @access  Private (any authenticated user)
 */
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const { category, closure_outcome, severity, lat, lng, radius, sort, limit = 20, offset = 0 } = req.query;

    const result = await incidentService.getPublicFeed({
      category,
      closure_outcome,
      severity,
      lat, lng, radius,
      sort,
      limit,
      offset,
    });

    res.json({
      status: 'OK',
      data: result.incidents,
      count: result.incidents.length,
      total: result.total,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch community feed');
  }
});
```

### 2.4 — Update LEI PATCH route in `backend/src/routes/incidents.js`

In the existing `PATCH /lei/:id/status` body validation, add two optional fields:

```js
body('is_disclosed').optional().isBoolean(),
body('is_location_fuzzed').optional().isBoolean(),
```

Pass them to `incidentService.updateLEIStatus`:

```js
const updatedIncident = await incidentService.updateLEIStatus(
  req.params.id,
  req.body.status,
  req.body.closure_outcome,
  req.body.closure_details,
  req.user,
  {
    isDisclosed: req.body.is_disclosed,
    isLocationFuzzed: req.body.is_location_fuzzed,
  }
);
```

**Verify**:
- `GET /api/incidents/feed` returns `[]` (no disclosed incidents yet — correct).
- `PATCH /api/incidents/lei/:id/status` with `{ is_disclosed: true, is_location_fuzzed: false }` updates the row.
- `GET /api/incidents/feed` now returns that incident.
- Old PATCH calls without those fields still work.

---

## Phase 3 — Mobile: API Client + `useFeed` Hook

**Risk**: None — new files only, nothing imported yet.

### 3.1 — New file: `FinalProject/src/services/feedAPI.js`

```js
import api from './apiClient';

export const feedAPI = {
  async getPublicFeed(params = {}) {
    try {
      const { category, closure_outcome, severity, lat, lng, radius, sort, limit = 20, offset = 0 } = params;
      const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });

      if (category)        query.append('category', category);
      if (closure_outcome) query.append('closure_outcome', closure_outcome);
      if (severity)        query.append('severity', severity);
      if (lat)             query.append('lat', String(lat));
      if (lng)             query.append('lng', String(lng));
      if (radius)          query.append('radius', String(radius));
      if (sort)            query.append('sort', sort);

      const response = await api.get(`/incidents/feed?${query.toString()}`);

      if (response.data.status === 'OK') {
        return {
          success: true,
          incidents: response.data.data.map(normalizeIncident),
          total: response.data.total,
        };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to load feed' };
    }
  },
};

function normalizeIncident(i) {
  const lat = Number(i.latitude);
  const lng = Number(i.longitude);
  return {
    ...i,
    id: i.incident_id,
    location: Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null,
    locationName: i.location_name || '',
    closedAt: i.closed_at,
    closureOutcome: i.closure_outcome,
    closureDetails: i.closure_details,
  };
}
```

Re-export from `FinalProject/src/services/api.js`:

```js
export { feedAPI } from './feedAPI';
```

### 3.2 — New file: `FinalProject/src/hooks/useFeed.js`

```js
import { useCallback, useEffect, useRef, useState } from 'react';
import { feedAPI } from '../services/feedAPI';

const PAGE_SIZE = 15;

export default function useFeed(filters = {}) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const activeRequest = useRef(0);

  const fetchPage = useCallback(async (offset = 0, isRefresh = false) => {
    const reqId = ++activeRequest.current;
    try {
      if (isRefresh) setRefreshing(true);
      else if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const result = await feedAPI.getPublicFeed({ ...filters, limit: PAGE_SIZE, offset });
      if (activeRequest.current !== reqId) return;

      if (!result.success) { setError(result.error); return; }
      setIncidents(prev => offset === 0 ? result.incidents : [...prev, ...result.incidents]);
      setTotal(result.total);
    } catch (e) {
      if (activeRequest.current === reqId) setError('Failed to load feed');
    } finally {
      if (activeRequest.current === reqId) {
        setLoading(false); setRefreshing(false); setLoadingMore(false);
      }
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line

  useEffect(() => { fetchPage(0); }, [fetchPage]);

  const refresh = useCallback(() => fetchPage(0, true), [fetchPage]);
  const loadMore = useCallback(() => {
    if (loadingMore || incidents.length >= total) return;
    fetchPage(incidents.length);
  }, [fetchPage, incidents.length, loadingMore, total]);

  return { incidents, loading, refreshing, loadingMore, error, total, refresh, loadMore };
}
```

**Verify**: Import `useFeed` in a scratch component and confirm it hits `GET /api/incidents/feed` correctly.

---

## Phase 4 — Mobile: `FeedCard` + `CommunityFeed` Components

**Risk**: None — new components, not yet mounted anywhere.

### 4.1 — New file: `FinalProject/src/screens/Home/FeedCard.js`

A themed card showing: category icon, title, severity badge, closure outcome pill, relative time, and location name.

Key design points:
- Reuse `SeverityBadge` from `../../components`
- Reuse `CATEGORY_DISPLAY` from `../../../../constants/incident`
- Outcome pill colours:
  - `resolved_handled` → green (`theme.success`)
  - `arrest_made` → red (`theme.error`)
  - `false_alarm` → gray (`theme.textSecondary`)
  - `report_filed` → blue (`theme.primary`)
- Shield icon + "Closed by Law Enforcement" sub-label
- `onPress` prop → navigates to `IncidentDetailScreen`

```js
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, SeverityBadge } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import incidentConstants from '../../../../constants/incident';
import { formatRelativeTime } from '../../utils/dateUtils'; // or equivalent

const { CATEGORY_DISPLAY } = incidentConstants;

const OUTCOME_STYLES = {
  resolved_handled: { label: 'Resolved',      color: 'success' },
  arrest_made:      { label: 'Arrest Made',   color: 'error'   },
  false_alarm:      { label: 'False Alarm',   color: 'muted'   },
  report_filed:     { label: 'Report Filed',  color: 'primary' },
};

const FeedCard = ({ incident, onPress }) => {
  const { theme } = useTheme();
  const cat = CATEGORY_DISPLAY[incident.category] || CATEGORY_DISPLAY.other;
  const outcome = OUTCOME_STYLES[incident.closureOutcome] || { label: incident.closureOutcome, color: 'muted' };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => onPress(incident)}
      activeOpacity={0.82}
    >
      {/* Category + Severity row */}
      <View style={styles.topRow}>
        <View style={[styles.categoryChip, { backgroundColor: `${cat.mapColor}22` }]}>
          <Ionicons name={cat.mapIcon} size={13} color={cat.mapColor} />
          <AppText variant="caption" style={{ color: cat.mapColor, marginLeft: 4 }}>{cat.label}</AppText>
        </View>
        <SeverityBadge severity={incident.severity} />
      </View>

      {/* Title */}
      <AppText variant="body" style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {incident.title}
      </AppText>

      {/* Outcome + meta row */}
      <View style={styles.metaRow}>
        <View style={[styles.outcomePill, { backgroundColor: `${theme[outcome.color] || theme.textSecondary}22` }]}>
          <AppText variant="caption" style={{ color: theme[outcome.color] || theme.textSecondary }}>
            {outcome.label}
          </AppText>
        </View>
        <View style={styles.metaRight}>
          <Ionicons name="shield-checkmark-outline" size={11} color={theme.textSecondary} />
          <AppText variant="caption" style={[styles.metaText, { color: theme.textSecondary }]}>
            {formatRelativeTime(incident.closedAt)}
          </AppText>
        </View>
      </View>

      {/* Location */}
      {incident.locationName ? (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={11} color={theme.textSecondary} />
          <AppText variant="caption" style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
            {incident.locationName}
          </AppText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  title: { marginBottom: 10, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outcomePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { marginLeft: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 3 },
});

export default FeedCard;
```

### 4.2 — New file: `FinalProject/src/screens/Home/CommunityFeed.js`

Section component that owns its filter chips and renders `FeedCard` list:

```js
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import useFeed from '../../hooks/useFeed';
import FeedCard from './FeedCard';

const FILTERS = [
  { label: 'All',        value: null },
  { label: 'Resolved',   value: 'resolved_handled' },
  { label: 'Arrest',     value: 'arrest_made' },
  { label: 'False Alarm',value: 'false_alarm' },
  { label: 'Filed',      value: 'report_filed' },
];

const CommunityFeed = ({ navigation }) => {
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState(null);
  const { incidents, loading, refreshing, loadingMore, error, refresh, loadMore } = useFeed(
    activeFilter ? { closure_outcome: activeFilter } : {}
  );

  const handleCardPress = (incident) => {
    navigation.navigate('IncidentDetail', { incident });
  };

  return (
    <View style={styles.wrapper}>
      {/* Section header */}
      <View style={styles.header}>
        <AppText variant="h3" style={{ color: theme.text }}>Community Feed</AppText>
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={item => item.label}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const active = activeFilter === item.value;
          return (
            <TouchableOpacity
              style={[styles.chip, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.card }]}
              onPress={() => setActiveFilter(item.value)}
            >
              <AppText variant="caption" style={{ color: active ? '#fff' : theme.text }}>{item.label}</AppText>
            </TouchableOpacity>
          );
        }}
        style={styles.chipList}
      />

      {/* Feed list */}
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
      ) : error ? (
        <AppText variant="bodySmall" style={{ color: theme.error, textAlign: 'center', marginTop: 16 }}>
          {error}
        </AppText>
      ) : incidents.length === 0 ? (
        <AppText variant="bodySmall" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 16 }}>
          No resolved reports yet. Check back later.
        </AppText>
      ) : (
        incidents.map(incident => (
          <FeedCard key={incident.id} incident={incident} onPress={handleCardPress} />
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chipList: { marginBottom: 12 },
  chips: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
});

export default CommunityFeed;
```

**Verify**: Render `<CommunityFeed navigation={...} />` in a test screen — cards appear if Phase 2 is complete and at least one incident is disclosed.

---

## Phase 5 — Mobile: Home Screen Restructure

**Risk**: Medium — modifies `HomeScreen.js`. Do this phase in one commit so it's easy to revert.

### 5.1 — `FinalProject/src/screens/Home/HomeScreen.js`

Changes:
1. **Remove** imports for `ContributionsGrid`, `QuickActions`, `RecentActivity`
2. **Add** import for `CommunityFeed`
3. **Remove** the three JSX blocks (`<ContributionsGrid>`, `<QuickActions>`, `<RecentActivity>`)
4. **Add** `<CommunityFeed navigation={navigation} />` after `<TrendingSection>`

The `recentActivity` data key from `useDashboardData` is no longer consumed — that's fine, unused data.

**Before (lines 15–21 imports)**:
```js
import ContributionsGrid from './ContributionsGrid';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
```

**After**:
```js
import CommunityFeed from './CommunityFeed';
```

**Before (lines 124–135 JSX)**:
```jsx
<ContributionsGrid userStats={dashboardData?.userStats} />
<QuickActions navigation={navigation} ... />
<RecentActivity recentActivity={...} onPress={...} />
```

**After**:
```jsx
<CommunityFeed navigation={navigation} />
```

**Verify**: Home screen loads. Pull-to-refresh works. Tapping a card opens `IncidentDetailScreen`. `ContributionsGrid`, `QuickActions`, `RecentActivity` files are **not deleted** — they're simply no longer imported here (safe to move/delete later).

---

## Phase 6 — Mobile: Move `ContributionsGrid` to Account Screen

**Risk**: Low — additive change to `AccountScreen.js`. Do **not** import `useDashboardData` here; it triggers GPS, safety-score queries, and React Query cache logic that Account does not need.

### 6.1 — New file: `FinalProject/src/hooks/useUserStats.js`

A minimal hook that calls `GET /api/stats/dashboard` without coordinates (so no geo-processing overhead on the backend) and returns only `userStats`.

```js
import { useEffect, useState } from 'react';
import { statsAPI } from '../services/api';

export default function useUserStats() {
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    statsAPI.getDashboardStats()          // no lat/lng → no nearest-incidents calculation
      .then(result => {
        if (cancelled) return;
        if (result.success) setUserStats(result.data?.userStats ?? null);
        else setError(result.error);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { userStats, loading, error };
}
```

`userStats` shape: `{ totalReports, verifiedReports, resolvedReports, pendingReports }` — populated for every authenticated user regardless of location.

### 6.2 — `FinalProject/src/screens/Account/AccountScreen.js`

```js
import ContributionsGrid from '../Home/ContributionsGrid';
import useUserStats from '../../hooks/useUserStats';

// Inside component:
const { userStats } = useUserStats();

// In JSX, after <ProfileHeader>:
<ContributionsGrid userStats={userStats} />
```

**Verify**: Account screen renders the contributions grid with real counts. No location prompt is triggered. Home screen no longer renders `ContributionsGrid`.

---

## Phase 7 — Mobile: Dual-Mode Map

**Risk**: Medium — modifies `MapScreen.js` data-fetching and rendering. The existing active-incidents path is **preserved**; the feed mode is additive behind a toggle.

### Design decision

The map serves two distinct needs that must coexist:

| Mode | Icon | Data source | What is shown | Location precision |
|---|---|---|---|---|
| **Active Reports** (default) | `radio-button-on-outline` | `incidentAPI.getMapIncidents` | Category type only, no title or details | Always fuzzed client-side (radius circle, not exact pin) |
| **Resolved Reports** (toggle) | `shield-checkmark-outline` | `feedAPI.getPublicFeed` | Full incident info on tap (title, closure outcome, details) | Exact unless LEI set `is_location_fuzzed` at disclosure time (already handled by backend jitter in Phase 2.1) |

`TimeframeSelector` stays visible and functional in Active Reports mode. It is **hidden** (not removed) in Resolved Reports mode — the feed is not time-bounded.

### 7.1 — Add map mode state to `MapScreen.js`

```js
import { feedAPI } from '../../services/feedAPI';
// Keep: import { incidentAPI } from '../../services/api';

const MAP_MODES = { ACTIVE: 'active', RESOLVED: 'resolved' };

// Inside component:
const [mapMode, setMapMode] = useState(MAP_MODES.ACTIVE);
```

### 7.2 — Dual fetch paths in `fetchIncidents()`

```js
const fetchIncidents = useCallback(async (isRefresh = false) => {
  // ... existing requestId guard and loading state setup ...

  let result;
  if (mapMode === MAP_MODES.ACTIVE) {
    const params = { timeframe: selectedTimeframe };
    if (selectedCategory) params.category = selectedCategory;
    result = await incidentAPI.getMapIncidents(params);
  } else {
    result = await feedAPI.getPublicFeed({ category: selectedCategory || undefined });
  }

  if (!result.success) { setError(result.error || 'Failed to load incidents'); return; }

  const filteredIncidents = result.incidents.filter((incident) => {
    const latitude = Number(incident?.location?.latitude);
    const longitude = Number(incident?.location?.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude);
  });
  setIncidents(filteredIncidents);
  // ... rest of existing fitToCoordinates logic ...
}, [mapMode, selectedCategory, selectedTimeframe, preferences.locationServices]);
```

### 7.3 — Active Reports mode: fuzzed radius circles

In `MapCanvas` (or directly in `MapScreen` if simpler), when `mapMode === MAP_MODES.ACTIVE`, render each incident as a `<Circle>` instead of a `<Marker>`:

```js
// radius: 150 m — enough to indicate neighbourhood without exposing exact address
<Circle
  key={incident.id}
  center={{ latitude: incident.location.latitude, longitude: incident.location.longitude }}
  radius={150}
  strokeColor={`${cat.mapColor}80`}
  fillColor={`${cat.mapColor}22`}
/>
```

Tapping the circle (use `<Marker>` with a transparent icon centred on the same coords, or handle `onPress` on the `Circle` if the map library supports it) opens a minimal bottom-sheet showing **only the category label and icon** — no title, no severity, no location name.

> **Note**: React Native Maps `<Circle>` does not fire `onPress` natively on Android. Use a transparent `<Marker>` co-located at the same coordinates as the interaction target, with the `<Circle>` purely decorative beneath it.

### 7.4 — Add mode toggle to map header

Add a two-segment toggle button in the `filterHeader` view, between `CategoryFilterBar` and `TimeframeSelector`:

```jsx
<View style={mapStyles.modeToggle}>
  <TouchableOpacity
    style={[mapStyles.modeButton, mapMode === MAP_MODES.ACTIVE && { backgroundColor: theme.primary }]}
    onPress={() => setMapMode(MAP_MODES.ACTIVE)}
  >
    <Ionicons name="radio-button-on-outline" size={13} color={mapMode === MAP_MODES.ACTIVE ? '#fff' : theme.text} />
    <AppText variant="caption" style={{ color: mapMode === MAP_MODES.ACTIVE ? '#fff' : theme.text, marginLeft: 4 }}>Active</AppText>
  </TouchableOpacity>
  <TouchableOpacity
    style={[mapStyles.modeButton, mapMode === MAP_MODES.RESOLVED && { backgroundColor: theme.primary }]}
    onPress={() => setMapMode(MAP_MODES.RESOLVED)}
  >
    <Ionicons name="shield-checkmark-outline" size={13} color={mapMode === MAP_MODES.RESOLVED ? '#fff' : theme.text} />
    <AppText variant="caption" style={{ color: mapMode === MAP_MODES.RESOLVED ? '#fff' : theme.text, marginLeft: 4 }}>Resolved</AppText>
  </TouchableOpacity>
</View>

{/* Hide timeframe selector in Resolved mode */}
{mapMode === MAP_MODES.ACTIVE && (
  <TimeframeSelector selectedTimeframe={selectedTimeframe} onSelectTimeframe={setSelectedTimeframe} />
)}
```

Add the corresponding styles to `mapStyles`:
```js
modeToggle: { flexDirection: 'row', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, alignSelf: 'center', marginBottom: 6 },
modeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5 },
```

### 7.5 — `IncidentMapDetail` in Resolved mode

The existing `IncidentMapDetail` component receives a `selectedIncident` object. In Resolved mode, the feed-normalised incident already has `closureOutcome`, `closureDetails`, and `locationName`. Ensure `IncidentMapDetail` renders these fields when present (they may already be handled if the component is data-driven). If they are absent from the current props interface, add them as optional display rows — do not change the component's core layout.

**Verify**:
- Active mode: circles appear for all verified incidents, tapping shows category only, `TimeframeSelector` is visible.
- Resolved mode: standard markers appear for disclosed incidents, tapping opens full details, `TimeframeSelector` is hidden.
- Switching modes re-fetches; category filter applies in both modes.
- A disclosed incident with `is_location_fuzzed = TRUE` shows a shifted location in Resolved mode (backend-applied jitter from Phase 2.1).

---

## Phase 8 — Moderator Dashboard: Publish + Fuzz Toggles

**Risk**: Low — UI addition to the LEI status update form. Backend already accepts the fields (Phase 2.4).

### 8.1 — Moderator dashboard LEI status update form

In the LEI case status-update modal/form, add two toggle controls:

| Toggle | Field sent | Default |
|---|---|---|
| "Publish to Community Feed" | `is_disclosed: true/false` | `false` |
| "Fuzz Location for Privacy" | `is_location_fuzzed: true/false` | `false` |

"Fuzz Location" should be **disabled** (greyed out) when "Publish to Community Feed" is off.

Include a short helper text: *"Once published, this report will appear in the mobile Community Feed visible to all citizens."*

The form already calls `PATCH /api/incidents/lei/:id/status` — just include `is_disclosed` and `is_location_fuzzed` in the request body.

**Verify**: Toggle on in dashboard → `is_disclosed = TRUE` written to DB → mobile feed shows the card.

---

## Rollout Checklist

| Phase | What changed | How to verify |
|---|---|---|
| 1 | DB columns `is_disclosed`, `is_location_fuzzed` | `\d incidents` in psql |
| 2 | `GET /api/incidents/feed` route, LEI PATCH update | Curl / Postman tests |
| 3 | `feedAPI.js`, `useFeed.js` | Unit test / scratch screen |
| 4 | `FeedCard.js`, `CommunityFeed.js` | Visual check in isolated screen |
| 5 | `HomeScreen.js` restructured | Home screen loads, feed visible |
| 6 | `ContributionsGrid` in AccountScreen via `useUserStats` | Account screen shows contributions, no GPS triggered |
| 7 | Dual-mode map: Active (fuzzed circles) + Resolved (feed pins) | Both modes fetch correctly; toggle switches data source; circles appear in Active mode |
| 8 | Moderator dashboard publish toggles | End-to-end: toggle → feed card appears |

---

## Files Touched — Summary

```
backend/src/database/init.js                   Phase 1
backend/src/services/incidentService.js        Phase 2
backend/src/routes/incidents.js                Phase 2
FinalProject/src/services/feedAPI.js           Phase 3  (new)
FinalProject/src/services/api.js               Phase 3
FinalProject/src/hooks/useFeed.js              Phase 3  (new)
FinalProject/src/screens/Home/FeedCard.js      Phase 4  (new)
FinalProject/src/screens/Home/CommunityFeed.js Phase 4  (new)
FinalProject/src/screens/Home/HomeScreen.js    Phase 5
FinalProject/src/hooks/useUserStats.js             Phase 6  (new)
FinalProject/src/screens/Account/AccountScreen.js  Phase 6
FinalProject/src/screens/Map/MapScreen.js           Phase 7
moderator-dashboard  (LEI form)                Phase 8
```

**Files not touched / not deleted**: `QuickActions.js`, `RecentActivity.js`, `ContributionsGrid.js` remain on disk — they are simply unimported after Phase 5. Delete them in a cleanup commit after confirming nothing else references them.
