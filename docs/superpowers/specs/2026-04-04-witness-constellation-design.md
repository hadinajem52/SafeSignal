# Witness Constellation — Design Spec
**Date:** 2026-04-04
**Status:** Approved for implementation — v4 (post-review hardening)

---

## 1. Overview

Witness Constellation turns a single SafeSignal incident report into a temporary, privacy-safe corroboration zone. When a qualifying incident is submitted, nearby users receive a push notification asking whether they noticed unusual activity in that area and time window. Their one-tap responses are compiled by an AI layer that synthesizes them into a structured confidence state surfaced across the app — on the map, in My Reports, on the Home screen, and in the incident detail view.

This is not a chatbot or a summary card feature. It is a community trust signal that makes SafeSignal feel like a live sensing network rather than a form submission app.

---

## 2. Scope

### Included
- Constellation data model (three new tables)
- Eligibility evaluation on incident creation
- Push notification infrastructure: FCM integration via `expo-notifications` (Expo-compatible), push token registration, server-side targeting
- In-app witness response screen (WitnessPromptScreen)
- AI synthesis endpoint in the ML service: note interpretation, confidence state, anomaly detection, cross-incident clustering
- Constellation confidence state surfaced on: Map, My Reports, Incident Detail, Home
- Privacy hardening: strip reporter identity from public incident endpoint, location consent gating, note PII stripping
- Abuse controls: rate limiting on both corroboration submissions and constellation creation, velocity cap, duplicate submission prevention

### Excluded
- Open-ended witness chat
- Audio or photo corroboration
- Predictive policing or forecasting
- Moderator dashboard UI (moderation happens via existing admin tools)
- Cross-constellation merging (beyond clustering signal)

---

## 3. Data Model

### Canonical timestamp rule

All `TIMESTAMP` columns in this feature use `TIMESTAMPTZ` (UTC-aware). All application code writes UTC. All API responses serialize as ISO 8601 with a `Z` suffix (e.g., `"2026-04-04T10:00:00Z"`). No timezone-naive timestamps are introduced.

### Canonical location precision rules

| Purpose | Precision | Approx. resolution |
|---|---|---|
| User last-known location (stored on `users`) | 2 decimal places | ~1.1 km |
| Witness device location (stored on `incident_corroborations`) | 2 decimal places | ~1.1 km |
| Anomaly detection "coarse grid cell" | 2 decimal places (same as above) | ~1.1 km |
| Incident center coordinates (stored on `incident_constellations`) | 8 decimal places | Full precision (copied from incident) |

The same 2-decimal rounding rule applies everywhere user location is stored. "Same coarse grid cell" in Section 7 means identical values after rounding both lat and lng to 2 decimal places.

### New table: `incident_constellations`

```sql
CREATE TABLE incident_constellations (
  constellation_id      SERIAL PRIMARY KEY,
  incident_id           INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  status                VARCHAR(20) DEFAULT 'active'
                          CHECK (status IN ('active', 'expired', 'flagged')),
  center_latitude       DECIMAL(10, 8) NOT NULL,
  center_longitude      DECIMAL(11, 8) NOT NULL,
  radius_meters         INTEGER NOT NULL DEFAULT 500,
  opens_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL,
  confidence_state      VARCHAR(30) DEFAULT 'single_report'
                          CHECK (confidence_state IN (
                            'single_report', 'corroborated', 'mixed_signals',
                            'activity_not_confirmed', 'likely_ended'
                          )),
  confidence_score      DECIMAL(4, 3) DEFAULT 0.0,
  summary               TEXT,
  supporting_signals    INTEGER DEFAULT 0,
  contradicting_signals INTEGER DEFAULT 0,
  ongoing_assessment    VARCHAR(20) DEFAULT 'unknown'
                          CHECK (ongoing_assessment IN ('ongoing', 'likely_ended', 'unknown', 'unclear')),
  last_synthesized_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_constellations_incident ON incident_constellations(incident_id)
  WHERE status = 'active';
CREATE INDEX idx_constellations_location ON incident_constellations
  USING gist(ST_SetSRID(ST_MakePoint(center_longitude, center_latitude), 4326)::geography);
CREATE INDEX idx_constellations_expires_at ON incident_constellations(expires_at);
```

### New table: `incident_corroborations`

```sql
CREATE TABLE incident_corroborations (
  corroboration_id         SERIAL PRIMARY KEY,
  constellation_id         INTEGER NOT NULL
                             REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE,
  user_id                  INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  signal_type              VARCHAR(30) NOT NULL
                             CHECK (signal_type IN (
                               'saw_something', 'heard_something',
                               'nothing_unusual', 'not_sure', 'already_left'
                             )),
  note                     TEXT,
  note_flagged_pii         BOOLEAN DEFAULT FALSE,
  distance_meters          INTEGER,
  submitted_at             TIMESTAMPTZ DEFAULT NOW(),
  device_latitude_rounded  DECIMAL(6, 2),
  device_longitude_rounded DECIMAL(7, 2),
  UNIQUE (constellation_id, user_id)
);

CREATE INDEX idx_corroborations_constellation ON incident_corroborations(constellation_id);
```

### New table: `constellation_cluster_links`

Stores cross-incident cluster matches detected by the ML synthesis pass. Read by moderators only.

```sql
CREATE TABLE constellation_cluster_links (
  id                       SERIAL PRIMARY KEY,
  constellation_id         INTEGER NOT NULL
                             REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE,
  linked_constellation_id  INTEGER NOT NULL
                             REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE,
  detected_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (constellation_id, linked_constellation_id),
  CHECK (constellation_id < linked_constellation_id)
);

CREATE INDEX idx_cluster_links_constellation ON constellation_cluster_links(constellation_id);
CREATE INDEX idx_cluster_links_linked ON constellation_cluster_links(linked_constellation_id);
```

The `CHECK (constellation_id < linked_constellation_id)` constraint enforces canonical ordering — the lower ID is always `constellation_id`. Before inserting, the backend sorts the two IDs: `const [a, b] = [id1, id2].sort((x, y) => x - y)`. This prevents both `(A, B)` and `(B, A)` from being stored.

The backend persists one row per detected pair after each ML synthesis call that returns a non-empty `cluster_match_incident_ids`. Cluster links are never exposed via citizen-facing API endpoints.

### Schema change: `users` table

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS push_token            TEXT,
  ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_known_latitude   DECIMAL(6, 2),
  ADD COLUMN IF NOT EXISTS last_known_longitude  DECIMAL(7, 2),
  ADD COLUMN IF NOT EXISTS location_updated_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_consent      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS location_consent_at   TIMESTAMPTZ;
```

**Precision:** User location is stored at 2 decimal places (~1.1 km grid). This is coarser than the existing `incidents` coordinate precision and is intentional.

---

## 4. Location Privacy Governance

Stored user location (`last_known_latitude`, `last_known_longitude`) is sensitive. The following rules govern it.

### Consent
- Location is only stored when `location_consent = TRUE` on the user record.
- Consent is requested once, on first app launch after the feature is enabled. The prompt explains that coarse location is used to notify the user of nearby incidents and is never shown to other users.
- The user can revoke consent at any time via Account settings. On revocation, `last_known_latitude`, `last_known_longitude`, and `location_updated_at` are immediately set to `NULL`. `location_consent` is set to `FALSE`.

### Retention
- Location columns are cleared (set to `NULL`) if `location_updated_at` is older than **30 days** with no new update. A nightly background job enforces this.
- When a user account is deleted, all location columns are included in the cascade delete.

### Access control
- `last_known_latitude` and `last_known_longitude` are **never** returned in any API response. They exist only for server-side queries.
- Push token is similarly internal-only and never returned in any API response.
- The following server-side callsites are the **only** permitted readers of location columns:
  1. `constellationService.notifyNearbyUsers()` — targeting query on constellation creation
  2. `statsService.getNearbyConstellationsForUser(userId)` — Home screen count of nearby constellations needing response
  3. `constellationService.isUserInRadius(userId, constellationId)` — read authz check for `GET /api/constellations/:id` only
- In-radius is **not** checked at write time for `POST /api/constellations/:id/corroborate`. Location columns are not read during corroboration submission.
- No other service, route handler, or utility may read these columns. Any new reader requires an explicit addition to this list.

### Targeting query filter
The targeting query (Section 5.4) includes `location_consent = TRUE` as a mandatory filter. Users who have not consented are never targeted.

---

## 5. Eligibility Rules

### Constellation creation
A constellation is created when all of the following are true:
- `is_draft = false`
- `latitude` and `longitude` are valid non-null values
- `incident_date` is within the last 30 minutes
- The incident is not marked toxic or abusive by the existing ML pipeline
- No active constellation already exists for this incident
- The reporting user has not created more than **2 constellations in the past 60 minutes** (rate limit on constellation creation — prevents presence-probing abuse)

Constellations expire after **2 hours** by default.

### Why the per-user constellation rate limit matters
Without it, a malicious user can file rapid reports to trigger push prompts across a target area and infer who is currently nearby based on response patterns. The 2-per-hour cap significantly raises the cost of this attack without impacting legitimate reporters.

---

## 6. Push Notification Infrastructure

### 6.1 Mobile stack: expo-notifications

The app uses **Expo ~54** with a bare/custom dev client workflow. The correct push token library for this stack is `expo-notifications`, not `@react-native-firebase/messaging`. FCM is still the backend delivery provider — `expo-notifications` obtains an FCM-compatible token on Android and an APNs token on iOS, both of which the `firebase-admin` SDK can dispatch to.

Mobile dependencies required:
- `expo-notifications` (token registration, foreground notification handling)
- No new native Firebase SDK needed on the mobile side

### 6.2 FCM Backend Integration

The backend uses **`firebase-admin`** to dispatch push notifications server-side. Credentials are provided via `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable (JSON string of the service account).

A new utility `backend/src/utils/fcmClient.js` wraps the FCM `messaging().send()` call with error handling and logging.

### 6.3 Push Token Registration

The canonical token strategy is **raw device tokens via `getDevicePushTokenAsync()`** from `expo-notifications`. This returns an FCM token on Android and an APNs token on iOS, both of which `firebase-admin` can dispatch to directly. `getExpoPushTokenAsync()` is **not used** — it routes through Expo's relay service and is incompatible with direct `firebase-admin` dispatch.

On app startup (after location consent is confirmed), the mobile app:
1. Calls `Notifications.getDevicePushTokenAsync()` from `expo-notifications`
2. Sends `{ token, platform: 'android' | 'ios' }` to `PATCH /api/users/me/push-token`
3. Backend saves the token and `push_token_updated_at` to the user record

The `platform` field is stored so `fcmClient.js` can select the correct `firebase-admin` send path (`messaging().send()` with `token` for FCM, same API for APNs via the admin SDK).

Token is refreshed via the `addPushTokenListener` callback from `expo-notifications`.

### 6.4 Location Update

When `location_consent = TRUE`, on app startup and foreground resume, the mobile app:
1. Reads current position via `expo-location` (already installed)
2. Rounds to 2 decimal places before sending
3. Sends rounded coordinates to `PATCH /api/users/me/location`

Location is never sent if consent has not been granted.

### 6.5 Targeting Query

When a constellation is created, `constellationService.notifyNearbyUsers()` runs:

```sql
SELECT user_id, push_token
FROM users
WHERE push_token IS NOT NULL
  AND push_token_updated_at > NOW() - INTERVAL '7 days'
  AND location_consent = TRUE
  AND location_updated_at > NOW() - INTERVAL '24 hours'
  AND ST_DWithin(
    ST_SetSRID(ST_MakePoint(last_known_longitude, last_known_latitude), 4326)::geography,
    ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geography,
    $radius_meters
  )
  AND user_id != $reporter_id
  AND is_suspended = FALSE
LIMIT 200
```

Notification payload:

```json
{
  "title": "Activity reported nearby",
  "body": "Did you notice anything unusual in this area recently?",
  "data": {
    "type": "witness_prompt",
    "constellation_id": "123",
    "coarse_latitude": "37.78",
    "coarse_longitude": "-122.42"
  }
}
```

The `coarse_latitude` and `coarse_longitude` in the payload are rounded to **2 decimal places**. No address, reporter identity, or incident details are included.

---

## 7. Witness Response Flow (Mobile)

### New screen: `WitnessPromptScreen`

Receives `constellationId` as a navigation parameter (from notification tap or in-app card).

UI:
- Neutral heading: "Did you notice anything unusual nearby?"
- Coarse map anchor showing approximate area (no address)
- 5 one-tap signal buttons:
  - Saw something similar
  - Heard something unusual
  - Passed by, nothing unusual
  - Already left the area
  - Not sure
- Optional single-line text input for a note (max 280 characters)
- Skip button
- Submit completes in one tap; note is optional

On submit, calls `constellationAPI.submitCorroboration({ constellationId, signalType, note, deviceLocation })`.

### Note handling at submission

The following sequence runs in order on every corroboration submission that includes a note:

1. **Trim and truncate** to 280 characters on the mobile side before the request is sent.
2. **PII scan** on the backend (email regex, phone number regex). Evaluated before persistence.
3. **Toxicity check** via the existing ML service `/toxicity` endpoint. Evaluated before persistence. Covers threats, harassment, self-harm indicators, and extremist content.
4. **Persist** the raw note text and set `note_flagged_pii`:
   - `TRUE` if the PII scan matched, OR the toxicity check returned `is_toxic = true` or `is_severe = true`
   - `FALSE` otherwise
   - The raw note is always stored. Flagging does not prevent storage — it prevents the note from being used in synthesis or summaries.
5. **Synthesis input gate:** Only notes with `note_flagged_pii = FALSE` are included in the ML synthesis payload. Flagged notes are replaced with `null` before the synthesis call.
6. Notes are **never displayed verbatim** to any user regardless of flag state. They are synthesis input only.

### New service: `constellationAPI.js`

- `submitCorroboration({ constellationId, signalType, note, deviceLocation })`
- `getConstellationStatus(constellationId)`

### Navigation

`WitnessPromptScreen` is registered in `AppNavigator.js`. When a user taps a `witness_prompt` push notification, the app navigates to this screen with `constellationId`.

---

## 8. AI Synthesis

### 8.1 Confidence State: Source of Truth and Precedence

**The ML service is the primary source of truth for `confidence_state` and `confidence_score`.** The deterministic rules in Section 9 are the **fallback** used when the ML service is unavailable or returns an error.

Precedence order:
1. ML synthesis result — used when the ML service returns a valid response
2. Deterministic fallback (Section 9) — used when ML call fails or times out
3. Previous persisted state — used when both ML and fallback are unavailable (no regression)

The backend logs which path was taken for every synthesis run. This is important for debugging confidence state disagreements.

### 8.2 New ML Endpoint: `POST /constellations/synthesize`

Added to `ml-service/main.py`.

**Input:**

```json
{
  "constellation_id": 123,
  "incident_metadata": {
    "category": "suspicious_activity",
    "severity": "medium",
    "incident_date": "2026-04-04T10:00:00Z"
  },
  "corroborations": [
    {
      "signal_type": "saw_something",
      "note": "There was a car parked with the engine running",
      "note_flagged_pii": false,
      "distance_meters": 120,
      "submitted_at": "2026-04-04T10:08:00Z"
    }
  ],
  "opens_at": "2026-04-04T10:02:00Z",
  "current_time": "2026-04-04T10:20:00Z"
}
```

Notes with `note_flagged_pii: true` are replaced with `null` before being sent to the ML service.

**Output:**

```json
{
  "confidence_state": "corroborated",
  "confidence_score": 0.81,
  "summary": "Three nearby users reported similar activity within 12 minutes of the original report.",
  "supporting_signals": 3,
  "contradicting_signals": 1,
  "ongoing_assessment": "unclear",
  "anomaly_flagged": false,
  "cluster_match_incident_ids": []
}
```

The `summary` field must never include verbatim note content. The ML service is instructed to produce aggregate descriptions only (e.g., "Three users reported similar activity" not "A user wrote: car parked with engine running").

`cluster_match_incident_ids` may be returned directly by the ML service, or derived by the backend during the same synthesis trigger using active constellation metadata already stored in the system. This does not change the external behavior: the backend persists cluster links, does not merge constellations, and never exposes them on citizen-facing surfaces.

### 8.3 Synthesis Responsibilities

**Note interpretation:** When a corroboration includes a non-PII-flagged note, the AI checks whether the note content is consistent with the chosen signal type. A note that contradicts the signal is flagged and the signal is downweighted in the confidence score.

**Evidence summarization:** Produces one aggregate human-readable sentence from the full set of signals. No individual witness details or note content are reproduced.

**Anomaly detection:** If 5+ signals arrive within 60 seconds from the same coarse grid cell (2-decimal lat/lng), `anomaly_flagged` is set to `true`. The constellation status is set to `flagged` and held for moderator review. Its confidence score does not increase beyond the pre-flag value.

**Cross-incident clustering:** If another active constellation within 300 meters shares overlapping signal timing (within 30 minutes), the synthesis pass yields `cluster_match_incident_ids`. This may come from the ML response or from backend post-processing during the same synthesis trigger. The backend records this link without merging the constellations; it is surfaced to moderators only, never to citizens.

### 8.4 Synthesis Trigger

Synthesis runs:
- After every new corroboration is submitted (async, immediately after persistence)
- On a 5-minute interval for active constellations with unprocessed changes

---

## 9. Confidence State: Deterministic Fallback

These rules are used **only when ML synthesis fails**. When ML is available, its output takes precedence.

| State | Condition |
|---|---|
| `single_report` | 0 corroborations received |
| `corroborated` | ≥3 supporting signals AND supporting > contradicting AND fallback score ≥ 0.65 |
| `mixed_signals` | Contradicting signals ≥ 40% of total |
| `activity_not_confirmed` | Majority signal type is `nothing_unusual` |
| `likely_ended` | Majority signal type is `already_left` or `nothing_unusual` AND constellation is >60 min old |

Supporting signal types: `saw_something`, `heard_something`
Contradicting signal types: `nothing_unusual`, `already_left`
Neutral: `not_sure`

**Fallback score formula:**

```
score = supporting / (supporting + contradicting + (0.5 × neutral))
```

Where `supporting`, `contradicting`, and `neutral` are the counts of corroborations in each group. A constellation with 0 corroborations has a score of `0.0`. This formula produces a value in `[0, 1]` and is used only when the ML service is unavailable.

---

## 10. Flagged Constellation Visibility Matrix

A constellation in `flagged` status is pending moderator review. The following table defines what each surface shows.

| Surface | Active constellation | Flagged constellation | Expired constellation |
|---|---|---|---|
| **Map** | Confidence ring rendered | No ring rendered | No ring rendered |
| **My Reports badge** | Shown with confidence state | No badge rendered | No badge rendered |
| **Home prompt card** | Shown if user hasn't responded | Not shown | Not shown |
| **Incident Detail** | Confidence badge + summary | Plain text: "Under review" | No badge |

**"Not shown" vs "Under review":** For Map, My Reports, and Home, the surface renders as if no constellation exists — the component receives no constellation data and renders nothing. For Incident Detail only, the stripped API response (`{ status: 'flagged', confidence_state: null, summary: null }`) is used to show "Under review" so the reporter knows something is in progress. This is the only surface where flagged state is visible to a non-staff user.

The API returns a stripped payload (not `404`) for flagged constellations to citizen/reporter callers — see read rules in Section 16.

---

## 11. Mobile Surface Integration

### 11.1 Map

`mapService.getMapIncidents()` optionally joins `incident_constellations` when `include_constellation=true`. Only constellations with `status = 'active'` are joined. The map response gains:

```json
{
  "confidence_state": "corroborated",
  "confidence_score": 0.81,
  "supporting_signals": 3
}
```

`MapScreen.js` renders a glow ring around markers with `confidence_state = 'corroborated'`. Ring opacity is proportional to `confidence_score`. States `single_report` and `mixed_signals` show no ring.

### 11.2 My Reports

`incidentAPI.getMyIncidents()` response enriched with:

```json
{
  "constellation_status": "active",
  "constellation_summary": "Corroborated by 3 nearby signals",
  "supporting_signals": 3
}
```

`ReportItem.js` renders a small constellation badge when `constellation_status = 'active'` and constellation is not flagged (per visibility matrix above).

### 11.3 Home

`useDashboardData` gains one new stat: `nearby_constellations_needing_response` — count of active, non-flagged constellations within 2 km of the user's last known location that the user has not yet responded to.

`HomeScreen.js` renders a single prompt card: "1 nearby report needs your input" with a tap action to open `WitnessPromptScreen`.

### 11.4 Incident Detail

`IncidentDetailScreen.js` is updated to refetch by `incident_id` on mount (currently renders the passed object snapshot). The refetched incident includes constellation state, rendered per the visibility matrix in Section 10.

---

## 12. Privacy & Safety Requirements

- Push notification payload never includes reporter identity, username, email, or exact address
- Push token and user location columns are **never returned in any API response**
- `GET /api/incidents/:id` is patched to exclude `username` and `email` from the response for non-staff callers
- Witness coordinates are stored at 2 decimal places (~1.1 km precision) — same rule as user location
- Notes are PII-scanned before persistence; PII-flagged notes are excluded from ML synthesis and all user-visible summaries
- Notes are never displayed verbatim to any user
- One corroboration per user per constellation (`UNIQUE` constraint enforced at DB level)
- Rate limit: max 10 corroboration submissions per user per hour
- Rate limit: max 2 constellation-triggering reports per user per 60 minutes (see Section 5)
- Location is only stored with explicit user consent; revocable at any time
- Location data is cleared after 30 days of inactivity; deleted on account deletion
- Constellations expire after 2 hours; expired constellations are excluded from all public surfaces
- The witness prompt copy is deliberately neutral and never mentions the incident category or any identifying detail

---

## 13. Abuse Controls

- Per-user constellation creation rate limit: 2 per 60 minutes (prevents presence-probing via rapid report filing)
- Velocity cap: if 5+ corroborations arrive in <60 seconds from the same coarse grid cell (2-decimal lat/lng), flag the constellation for moderator review and freeze the confidence score
- Minimum volume gate: `corroborated` state requires ≥3 supporting signals
- Low-confidence constellations (`single_report`, `mixed_signals`) show no map ring
- Contradicting signal threshold: reaching 40% contradicting downgrades to `mixed_signals` regardless of absolute count
- Anomaly-flagged constellations are hidden from all citizen-facing surfaces until cleared by a moderator (see visibility matrix, Section 10)

**Known limitation — sybil abuse:** The per-user constellation creation cap (2/hour) reduces single-account presence-probing but does not prevent a motivated attacker operating multiple accounts. Full sybil mitigation (device fingerprinting, account age gates, phone verification) is out of scope for this MVP. The velocity cap and moderator flagging are the primary defenses at this stage.

---

## 14. Backend Route Summary

| Method | Path | Purpose |
|---|---|---|
| `PATCH` | `/api/users/me/push-token` | Register/refresh push token (authenticated) |
| `PATCH` | `/api/users/me/location` | Update coarse user location (authenticated, consent required) |
| `POST` | `/api/constellations/:id/corroborate` | Submit witness response (see write rules below) |
| `GET` | `/api/constellations/:id` | Get constellation state (see read rules below) |

ML service:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/constellations/synthesize` | Synthesize witness signals into confidence state |

### Write rules for `POST /api/constellations/:id/corroborate`

- **Authentication required.** Unauthenticated requests return `401`.
- **Reporter exclusion:** The original reporter of the linked incident may not submit a corroboration. Returns `403`.
- **Constellation state gate:** Writes are only accepted when `status = 'active'`. Flagged (`flagged`) and expired (`expired`) constellations reject writes with `409 Conflict`.
- **In-radius not required for writes.** The proximity check is not enforced at write time — a user may have moved since receiving the notification. Proximity is used only for targeting (who receives the prompt) and read authz.
- **Duplicate prevention:** Enforced at DB level via `UNIQUE (constellation_id, user_id)`. A duplicate write returns `409 Conflict`.
- **Anti-enumeration:** A non-existent or ineligible constellation ID returns `404` (never `403`).

### Read rules for `GET /api/constellations/:id`

- **Authentication required.** Unauthenticated requests return `401`.
- **Object-level authorization for citizens:** A citizen user may read a constellation only if they are within the constellation's radius (via `constellationService.isUserInRadius()`) OR they are the original reporter of the linked incident.
- **Flagged constellations:** Citizens and reporters receive a stripped response — `{ status: 'flagged', confidence_state: null, summary: null }` — not a full state payload. This prevents citizens from fetching suppressed confidence data via direct API calls even though the UI hides the badge.
- **Staff access:** Roles `moderator`, `admin`, `law_enforcement` may retrieve full state for any constellation regardless of status.
- **Anti-enumeration:** A non-existent constellation ID or one the caller is not authorized to see returns `404` (never `403`).
- **Rate limit:** Max 30 requests per user per minute.

---

## 15. Environment Variables Required

| Variable | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | FCM admin SDK credentials (JSON string) |
| `CONSTELLATION_RADIUS_METERS` | Default targeting radius (default: 500) |
| `CONSTELLATION_EXPIRY_HOURS` | Default TTL for constellations (default: 2) |
