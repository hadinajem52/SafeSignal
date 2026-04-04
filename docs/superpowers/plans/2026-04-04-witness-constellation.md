# Witness Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Witness Constellation feature — push-notified community corroboration of incident reports with AI synthesis into a confidence state.

**Architecture:** A new `incident_constellations` constellation is created for each eligible incident; nearby users are targeted via FCM push using stored coarse location; their one-tap responses are synthesized by a new ML endpoint into a structured confidence state rendered on Map, My Reports, Home, and Incident Detail. Cross-incident cluster links are derived and persisted by the backend during the same synthesis trigger.

**Tech Stack:** Node.js/Express (backend), pg-promise + PostGIS (DB), `firebase-admin` (FCM), FastAPI/Pydantic + Gemini (ML synthesis), React Native/Expo with expo-notifications + expo-location (mobile), @tanstack/react-query (mobile data fetching).

## Execution Order Notes

- Complete **Task 12 (mlClient synthesis client)** before implementing **Task 5 (constellationService / constellationSynthesis)**. The Task 5 synthesis helper calls `mlClient.synthesizeConstellation()`.
- Complete **Task 22 Step 2 (`backend/src/app.js` extraction)** before route-heavy backend implementation so tests do not require a late structural refactor.
- In `backend/src/routes/users.js`, add the new `/me/*` routes **before** the existing dynamic `/:id` routes so they are reachable.
- In `backend/src/routes/incidents.js`, keep `GET /api/incidents/:id` public and use optional auth for staff-only field expansion. Do not convert the route to required auth.

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `backend/src/database/migrations/add_witness_constellation.js` | DB schema: 3 new tables + users columns |
| `backend/src/utils/fcmClient.js` | FCM dispatch via firebase-admin |
| `backend/src/utils/piiScanner.js` | Regex PII detection for witness notes |
| `backend/src/middleware/optionalAuth.js` | Attach `req.user` when a valid bearer token is present, otherwise continue anonymously |
| `backend/src/services/constellationService.js` | Request-facing constellation lifecycle orchestration: eligibility, creation, notification, corroboration, read authz |
| `backend/src/services/constellationSynthesis.js` | Fallback scoring, ML result merge, cluster derivation, synthesis persistence |
| `backend/src/routes/constellations.js` | POST /:id/corroborate, GET /:id |
| `backend/src/jobs/constellationMaintenance.js` | Constellation maintenance helpers + startup bootstrap |
| `backend/src/app.js` | Express app composition root exported for tests without calling `listen()` |
| `FinalProject/src/services/pushTokenService.js` | expo-notifications permission + raw token registration |
| `FinalProject/src/services/locationSyncService.js` | Coarse location sync + consent mutation |
| `FinalProject/src/services/constellationAPI.js` | Thin mobile API client for constellation endpoints using existing apiClient conventions |
| `FinalProject/src/hooks/useWitnessPromptSubmission.js` | Optional device-location + corroboration submit action for WitnessPrompt |
| `FinalProject/src/hooks/useWitnessPromptNotifications.js` | Parse witness notification payloads and navigate to WitnessPrompt |
| `FinalProject/src/screens/WitnessPromptScreen.js` | One-tap witness response UI using a dedicated submit hook |
| `ml-service/services/constellation_synthesis.py` | Synthesis/fallback helper used by the ML endpoint |
| `backend/tests/helpers/constellationTestSeed.js` | Shared auth token + DB seed setup for constellation tests |
| `backend/tests/jest.teardown.js` | Close shared test resources once after the Jest run |
| `backend/tests/constellation.routes.test.js` | HTTP contract, authz, and privacy coverage |
| `backend/tests/constellationSynthesis.test.js` | Pure synthesis/fallback unit coverage |

### Modified files
| File | Change |
|---|---|
| `backend/src/database/init.js` | Call migration on startup |
| `backend/src/index.js` | Startup-only concerns: database readiness, listen(), maintenance bootstrap |
| `backend/src/routes/users.js` | Add PATCH /me/push-token and PATCH /me/location |
| `backend/src/services/userService.js` | Add updatePushToken, updateLocation |
| `backend/src/utils/mlClient.js` | Add synthesizeConstellation |
| `backend/src/services/incidentService.js` | Trigger constellation workflow after incident creation |
| `backend/src/services/incidentService.js` | Split public vs staff incident reads and strip username/email for non-staff |
| `backend/src/services/mapService.js` | Optional constellation join |
| `backend/src/services/statsService.js` | Add nearby constellations count |
| `ml-service/main.py` | Add POST /constellations/synthesize as a thin route over the synthesis helper |
| `FinalProject/src/navigation/AppNavigator.js` | Register WitnessPromptScreen and call a dedicated witness notification hook |
| `FinalProject/src/context/AuthContext.js` | Call push registration and coarse location sync after auth bootstrap |
| `FinalProject/src/services/incidentAPI.js` | Extend `getUserIncidents`, `getMapIncidents`, and `getIncidentById` handling for constellation fields |
| `FinalProject/src/hooks/useDashboardData.js` | Add nearbyConstellationsNeeding response |
| `FinalProject/src/screens/Map/MapScreen.js` | Render confidence ring |
| `FinalProject/src/screens/MyReports/ReportItem.js` | Render constellation badge |
| `FinalProject/src/screens/Home/HomeScreen.js` | Render witness prompt card |
| `FinalProject/src/components/IncidentDetailModal.js` | Render constellation badge from one prepared incident source of truth |

---

## Task 1: DB Migration

**Files:**
- Create: `backend/src/database/migrations/add_witness_constellation.js`

- [ ] **Step 1: Install `firebase-admin` in backend**

```bash
cd backend && npm install firebase-admin
```

Expected: `firebase-admin` appears in `backend/package.json` dependencies.

- [ ] **Step 2: Write the migration**

Create `backend/src/database/migrations/add_witness_constellation.js`:

```js
const db = require('../../config/database');

const runMigration = async () => {
  // Users: push token + coarse location + consent
  await db.none(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS push_token            TEXT,
      ADD COLUMN IF NOT EXISTS push_token_platform   VARCHAR(10) DEFAULT 'android'
                                                       CHECK (push_token_platform IN ('android', 'ios')),
      ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_known_latitude   DECIMAL(6, 2),
      ADD COLUMN IF NOT EXISTS last_known_longitude  DECIMAL(7, 2),
      ADD COLUMN IF NOT EXISTS location_updated_at   TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS location_consent      BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS location_consent_at   TIMESTAMPTZ;
  `);

  await db.none(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_coarse_location_pair_check'
      ) THEN
        ALTER TABLE users
          ADD CONSTRAINT users_coarse_location_pair_check
          CHECK (
            (last_known_latitude IS NULL AND last_known_longitude IS NULL) OR
            (last_known_latitude IS NOT NULL AND last_known_longitude IS NOT NULL)
          );
      END IF;
    END $$;
  `);

  await db.none(`
    CREATE TABLE IF NOT EXISTS incident_constellations (
      constellation_id      SERIAL PRIMARY KEY,
      incident_id           INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
      status                VARCHAR(20) DEFAULT 'active'
                              CHECK (status IN ('active', 'expired', 'flagged')),
      center_latitude       DECIMAL(10, 8) NOT NULL,
      center_longitude      DECIMAL(11, 8) NOT NULL,
      radius_meters         INTEGER NOT NULL DEFAULT 500 CHECK (radius_meters > 0),
      opens_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at            TIMESTAMPTZ NOT NULL,
      confidence_state      VARCHAR(30) DEFAULT 'single_report'
                              CHECK (confidence_state IN (
                                'single_report', 'corroborated', 'mixed_signals',
                                'activity_not_confirmed', 'likely_ended'
                              )),
      confidence_score      DECIMAL(4, 3) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
      summary               TEXT,
      supporting_signals    INTEGER DEFAULT 0 CHECK (supporting_signals >= 0),
      contradicting_signals INTEGER DEFAULT 0 CHECK (contradicting_signals >= 0),
      has_unprocessed_changes BOOLEAN DEFAULT FALSE,
      ongoing_assessment    VARCHAR(20) DEFAULT 'unknown'
                              CHECK (ongoing_assessment IN ('ongoing', 'likely_ended', 'unknown', 'unclear')),
      last_synthesized_at   TIMESTAMPTZ,
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.none(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_constellations_incident
      ON incident_constellations(incident_id) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_constellations_location
      ON incident_constellations
      USING gist(ST_SetSRID(ST_MakePoint(center_longitude, center_latitude), 4326)::geography);
    CREATE INDEX IF NOT EXISTS idx_constellations_expires_at
      ON incident_constellations(expires_at);
  `);

  await db.none(`
    CREATE TABLE IF NOT EXISTS incident_corroborations (
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
      distance_meters          INTEGER CHECK (distance_meters IS NULL OR distance_meters >= 0),
      submitted_at             TIMESTAMPTZ DEFAULT NOW(),
      device_latitude_rounded  DECIMAL(6, 2),
      device_longitude_rounded DECIMAL(7, 2),
      UNIQUE (constellation_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_corroborations_constellation
      ON incident_corroborations(constellation_id);
  `);

  await db.none(`
    CREATE TABLE IF NOT EXISTS constellation_cluster_links (
      id                       SERIAL PRIMARY KEY,
      constellation_id         INTEGER NOT NULL
                                 REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE,
      linked_constellation_id  INTEGER NOT NULL
                                 REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE,
      detected_at              TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (constellation_id, linked_constellation_id),
      CHECK (constellation_id < linked_constellation_id)
    );
    CREATE INDEX IF NOT EXISTS idx_cluster_links_constellation
      ON constellation_cluster_links(constellation_id);
    CREATE INDEX IF NOT EXISTS idx_cluster_links_linked
      ON constellation_cluster_links(linked_constellation_id);
  `);
};

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✓ Migration add_witness_constellation completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('✗ Migration add_witness_constellation failed:', err.message);
      process.exit(1);
    });
}

module.exports = runMigration;
```

`updated_at` on the new constellation tables is application-managed, not database-trigger-managed. Treat it as an application-maintained write timestamp and keep all feature writes responsible for updating it explicitly.

`constellation_cluster_links` intentionally keeps a surrogate `id` for simple moderation-tool references and row-oriented admin operations; the logical uniqueness is still enforced on `(constellation_id, linked_constellation_id)`.

- [ ] **Step 3: Run the migration**

```bash
cd backend && node src/database/migrations/add_witness_constellation.js
```

Expected output:
```
✓ Migration add_witness_constellation completed
```

- [ ] **Step 4: Verify tables exist**

```bash
cd backend && node -e "
const db = require('./src/config/database');
db.any('SELECT table_name FROM information_schema.tables WHERE table_name IN (\$1, \$2, \$3)', ['incident_constellations', 'incident_corroborations', 'constellation_cluster_links'])
  .then(rows => { console.log(rows.map(r => r.table_name)); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
"
```

Expected: `[ 'incident_constellations', 'incident_corroborations', 'constellation_cluster_links' ]`

- [ ] **Step 5: Commit**

```bash
git add backend/src/database/migrations/add_witness_constellation.js backend/package.json backend/package-lock.json
git commit -m "feat: add witness constellation db migration and firebase-admin dependency"
```

---

## Task 2: FCM Client Utility

**Files:**
- Create: `backend/src/utils/fcmClient.js`

- [ ] **Step 1: Write fcmClient.js**

```js
/**
 * FCM Client
 * Dispatches push notifications via Firebase Admin SDK.
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string of service account).
 * No-ops silently when credentials are absent (dev/test without Firebase).
 */

const logger = require('./logger');

let messaging = null;

function getMessaging() {
  if (messaging) return messaging;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled');
    return null;
  }

  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
      });
    }
    messaging = admin.messaging();
    return messaging;
  } catch (err) {
    logger.error(`FCM init failed: ${err.message}`);
    return null;
  }
}

/**
 * Send a push notification to a single device token.
 * @param {string} token
 * @param {'android'|'ios'} platform
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 * @returns {Promise<boolean>} true if sent, false if skipped or failed
 */
async function sendPushNotification(token, platform, payload) {
  const fcm = getMessaging();
  if (!fcm) return false;

  try {
    const message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
    };

    if (platform === 'android') {
      message.android = { priority: 'high' };
    } else if (platform === 'ios') {
      message.apns = { payload: { aps: { sound: 'default' } } };
    }

    await fcm.send(message);
    return true;
  } catch (err) {
    logger.warn(`FCM send failed for token ${token.slice(0, 10)}...: ${err.message}`);
    return false;
  }
}

module.exports = { sendPushNotification };
```

- [ ] **Step 2: Verify it loads without credentials (dev mode)**

```bash
cd backend && node -e "
const { sendPushNotification } = require('./src/utils/fcmClient');
sendPushNotification('fake-token', 'android', { title: 'Test', body: 'Test' })
  .then(r => { console.log('result:', r); process.exit(0); });
"
```

Expected: `result: false` (no credentials set, silently skipped)

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/fcmClient.js
git commit -m "feat: add FCM client utility for push notification dispatch"
```

---

## Task 3: PII Scanner Utility

**Files:**
- Create: `backend/src/utils/piiScanner.js`

- [ ] **Step 1: Write piiScanner.js**

```js
/**
 * PII Scanner
 * Lightweight regex check for common PII patterns in witness notes.
 * Not a full moderation system — catches accidental PII before storage.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/;

/**
 * @param {string} text
 * @returns {boolean} true if PII pattern detected
 */
function containsPii(text) {
  if (!text || typeof text !== 'string') return false;
  return EMAIL_RE.test(text) || PHONE_RE.test(text);
}

module.exports = { containsPii };
```

- [ ] **Step 2: Spot-check**

```bash
cd backend && node -e "
const { containsPii } = require('./src/utils/piiScanner');
console.log(containsPii('call me at 555-123-4567')); // true
console.log(containsPii('user@example.com'));         // true
console.log(containsPii('I saw a red car'));           // false
"
```

Expected:
```
true
true
false
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/piiScanner.js
git commit -m "feat: add PII scanner utility for witness note screening"
```

---

## Task 4: User Push Token and Location Endpoints

**Files:**
- Modify: `backend/src/services/userService.js`
- Modify: `backend/src/routes/users.js`

- [ ] **Step 1: Add service methods to userService.js**

Find the end of `backend/src/services/userService.js` (before `module.exports`) and add:

```js
/**
 * Save or refresh a device push token for a user.
 * @param {number} userId
 * @param {string} token
 * @param {'android'|'ios'} platform
 */
async function updatePushToken(userId, token, platform) {
  if (!token || !['android', 'ios'].includes(platform)) {
    throw ServiceError.badRequest('Invalid push token or platform');
  }
  await db.none(
    `UPDATE users
     SET push_token = $1, push_token_platform = $2,
         push_token_updated_at = NOW(), updated_at = NOW()
     WHERE user_id = $3`,
    [token, platform, userId]
  );
}

/**
 * Store coarse user location (2 decimal places) when consent is given.
 * @param {number} userId
 * @param {number} latitude - already rounded to 2dp by caller
 * @param {number} longitude - already rounded to 2dp by caller
 */
async function updateUserLocation(userId, latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw ServiceError.badRequest('Invalid coordinates');
  }
  // Only store if user has consented
  const user = await db.oneOrNone(
    'SELECT location_consent FROM users WHERE user_id = $1',
    [userId]
  );
  if (!user) throw ServiceError.notFound('User not found');
  if (!user.location_consent) {
    throw ServiceError.forbidden('Location consent not granted');
  }
  await db.none(
    `UPDATE users
     SET last_known_latitude = $1, last_known_longitude = $2,
         location_updated_at = NOW(), updated_at = NOW()
     WHERE user_id = $3`,
    [lat.toFixed(2), lng.toFixed(2), userId]
  );
}

/**
 * Grant or revoke location consent for a user.
 * On revocation, clears stored location immediately.
 * @param {number} userId
 * @param {boolean} consent
 */
async function setLocationConsent(userId, consent) {
  if (consent) {
    await db.none(
      `UPDATE users
       SET location_consent = TRUE, location_consent_at = NOW(), updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  } else {
    await db.none(
      `UPDATE users
       SET location_consent = FALSE, location_consent_at = NOW(),
           last_known_latitude = NULL, last_known_longitude = NULL,
           location_updated_at = NULL, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  }
}
```

Add `updatePushToken`, `updateUserLocation`, and `setLocationConsent` to the `module.exports` at the bottom of `userService.js`.

- [ ] **Step 2: Add routes to users.js**

Add these routes **before** the existing dynamic `GET /:id` and `PATCH /:id` routes in `backend/src/routes/users.js` so `/me/*` is not swallowed by `/:id`:

```js
/**
 * @route   PATCH /api/users/me/push-token
 * @desc    Register or refresh device push token
 * @access  Private (authenticated)
 */
router.patch('/me/push-token', authenticateToken, async (req, res) => {
  const { token, platform } = req.body;
  if (!token || !platform) {
    return res.status(400).json({ status: 'ERROR', message: 'token and platform required' });
  }
  try {
    await userService.updatePushToken(req.user.userId, token, platform);
    res.json({ status: 'OK' });
  } catch (error) {
    handleServiceError(error, res, 'Failed to update push token');
  }
});

/**
 * @route   PATCH /api/users/me/location
 * @desc    Update coarse user location (requires location_consent = true)
 * @access  Private (authenticated)
 */
router.patch('/me/location', authenticateToken, async (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ status: 'ERROR', message: 'latitude and longitude required' });
  }
  try {
    await userService.updateUserLocation(req.user.userId, latitude, longitude);
    res.json({ status: 'OK' });
  } catch (error) {
    handleServiceError(error, res, 'Failed to update location');
  }
});

/**
 * @route   PATCH /api/users/me/location-consent
 * @desc    Grant or revoke location consent
 * @access  Private (authenticated)
 */
router.patch('/me/location-consent', authenticateToken, async (req, res) => {
  const { consent } = req.body;
  if (typeof consent !== 'boolean') {
    return res.status(400).json({ status: 'ERROR', message: 'consent must be boolean' });
  }
  try {
    await userService.setLocationConsent(req.user.userId, consent);
    res.json({ status: 'OK' });
  } catch (error) {
    handleServiceError(error, res, 'Failed to update location consent');
  }
});
```

- [ ] **Step 3: Test manually**

Start the backend (`cd backend && npm start`) and run:

```bash
# Get a valid JWT first by logging in, then:
curl -X PATCH http://localhost:3000/api/users/me/push-token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"token":"test-device-token","platform":"android"}'
```

Expected: `{"status":"OK"}`

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/userService.js backend/src/routes/users.js
git commit -m "feat: add push token and location endpoints to user routes"
```

---

## Task 5: Constellation Service

**Files:**
- Create: `backend/src/services/constellationService.js`
- Create: `backend/src/services/constellationSynthesis.js`

Prerequisite: complete **Task 12** first so `mlClient.synthesizeConstellation()` exists before this service is wired and tested.

Boundary note: keep `constellationService.js` as the request-facing workflow owner. Move fallback scoring, ML result merge, cluster derivation, and synthesis persistence into `backend/src/services/constellationSynthesis.js` so creation/corroboration flow changes do not share one god module with synthesis rules.

Implementation note: the following service blocks are reference skeletons, not copy-paste source of truth. Preserve existing repo boundaries and naming where they already fit. The required source of truth is the behavior and invariants in this task, not the exact line-for-line implementation below.

- [ ] **Step 1: Write constellationService.js**

```js
/**
 * Constellation Service
 * Handles request-facing lifecycle: eligibility check, creation,
 * nearby notification, corroboration submission, and read authz.
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const ServiceError = require('../utils/ServiceError');
const { sendPushNotification } = require('../utils/fcmClient');
const { containsPii } = require('../utils/piiScanner');
const { triggerSynthesis } = require('./constellationSynthesis');

const STAFF_ROLES = ['moderator', 'admin', 'law_enforcement'];
const CONSTELLATION_EXPIRY_HOURS = parseInt(process.env.CONSTELLATION_EXPIRY_HOURS, 10) || 2;
const CONSTELLATION_RADIUS_METERS = parseInt(process.env.CONSTELLATION_RADIUS_METERS, 10) || 500;
const CREATION_RATE_LIMIT_COUNT = 2;
const CREATION_RATE_LIMIT_MINUTES = 60;
const CORROBORATION_RATE_LIMIT_COUNT = 10;
const CORROBORATION_RATE_LIMIT_MINUTES = 60;

/**
 * Check whether an incident is eligible to open a constellation.
 * Returns null if eligible, or a string reason if not.
 */
async function evaluateEligibility(incident, reporterId) {
  if (incident.is_draft) return 'incident is a draft';
  if (
    incident.latitude === null || incident.latitude === undefined ||
    incident.longitude === null || incident.longitude === undefined
  ) {
    return 'missing coordinates';
  }

  const ageMinutes = (Date.now() - new Date(incident.incident_date).getTime()) / 60000;
  if (ageMinutes > 30) return 'incident too old';

  if (incident.is_toxic) return 'incident flagged as toxic';

  // Check no active constellation already exists for this incident
  const existing = await db.oneOrNone(
    `SELECT constellation_id FROM incident_constellations
     WHERE incident_id = $1 AND status = 'active'`,
    [incident.incident_id]
  );
  if (existing) return 'active constellation already exists';

  // Rate limit: max 2 constellations per user per 60 minutes
  const recentCount = await db.one(
    `SELECT COUNT(*)::int AS cnt
     FROM incident_constellations ic
     JOIN incidents i ON ic.incident_id = i.incident_id
     WHERE i.reporter_id = $1
       AND ic.created_at > NOW() - INTERVAL '${CREATION_RATE_LIMIT_MINUTES} minutes'`,
    [reporterId]
  );
  if (recentCount.cnt >= CREATION_RATE_LIMIT_COUNT) return 'reporter rate limit exceeded';

  return null;
}

/**
 * Create an active constellation for an incident.
 * @returns {Promise<Object>} The created constellation record
 */
async function createConstellation(incident) {
  const expiresAt = new Date(Date.now() + CONSTELLATION_EXPIRY_HOURS * 60 * 60 * 1000);
  return db.one(
    `INSERT INTO incident_constellations
       (incident_id, center_latitude, center_longitude, radius_meters, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      incident.incident_id,
      incident.latitude,
      incident.longitude,
      CONSTELLATION_RADIUS_METERS,
      expiresAt,
    ]
  );
}

/**
 * Open a constellation for an incident when eligible and notify nearby users.
 * This is the incident-service entrypoint; callers should not orchestrate
 * eligibility/create/notify step-by-step.
 */
async function openConstellationForIncident(incident, reporterId) {
  const reason = await evaluateEligibility(incident, reporterId);
  if (reason) {
    return { opened: false, reason };
  }

  const constellation = await createConstellation(incident);
  await notifyNearbyUsers(constellation);
  return { opened: true, constellation };
}

/**
 * Dispatch push notifications to nearby eligible users.
 * Runs fire-and-forget; errors are logged, not thrown.
 */
async function notifyNearbyUsers(constellation) {
  let targets;
  try {
    targets = await db.any(
      `SELECT user_id, push_token, push_token_platform
       FROM users
       WHERE push_token IS NOT NULL
          AND push_token_platform IS NOT NULL
          AND push_token_updated_at > NOW() - INTERVAL '7 days'
          AND location_consent = TRUE
          AND location_updated_at > NOW() - INTERVAL '24 hours'
          AND last_known_latitude IS NOT NULL
          AND last_known_longitude IS NOT NULL
          AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(last_known_longitude, last_known_latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
         AND user_id != (
           SELECT reporter_id FROM incidents WHERE incident_id = $4
         )
         AND is_suspended = FALSE
       LIMIT 200`,
      [
        constellation.center_longitude,
        constellation.center_latitude,
        constellation.radius_meters,
        constellation.incident_id,
      ]
    );
  } catch (err) {
    logger.error(`Constellation targeting query failed: ${err.message}`);
    return;
  }

  const payload = {
    title: 'Activity reported nearby',
    body: 'Did you notice anything unusual in this area recently?',
    data: {
      type: 'witness_prompt',
      constellation_id: String(constellation.constellation_id),
      coarse_latitude: String(parseFloat(constellation.center_latitude).toFixed(2)),
      coarse_longitude: String(parseFloat(constellation.center_longitude).toFixed(2)),
    },
  };

  let sent = 0;
  for (const target of targets) {
    const ok = await sendPushNotification(target.push_token, target.push_token_platform, payload);
    if (ok) sent += 1;
  }
  logger.info(`Constellation ${constellation.constellation_id}: notified ${sent}/${targets.length} nearby users`);
}

/**
 * Check if a user's stored location is within a constellation's radius.
 * Used for read authz on GET /api/constellations/:id.
 * @returns {Promise<boolean>}
 */
async function isUserInRadius(userId, constellationId) {
  const row = await db.oneOrNone(
    `SELECT 1
     FROM incident_constellations c, users u
     WHERE c.constellation_id = $1
       AND u.user_id = $2
       AND u.location_consent = TRUE
       AND u.last_known_latitude IS NOT NULL
       AND u.last_known_longitude IS NOT NULL
       AND ST_DWithin(
         ST_SetSRID(ST_MakePoint(u.last_known_longitude, u.last_known_latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint(c.center_longitude, c.center_latitude), 4326)::geography,
         c.radius_meters
       )`,
    [constellationId, userId]
  );
  return !!row;
}

/**
 * Get constellation state for API read.
 * Returns null if not found.
 * Returns stripped object { constellation_id, status, confidence_state: null, summary: null }
 * for flagged constellations when caller is a citizen.
 */
async function getConstellationForUser(constellationId, userId, userRole) {
  const constellation = await db.oneOrNone(
    'SELECT * FROM incident_constellations WHERE constellation_id = $1',
    [constellationId]
  );
  if (!constellation) return null;

  if (new Date(constellation.expires_at).getTime() <= Date.now()) {
    await db.none(
      `UPDATE incident_constellations
       SET status = 'expired', updated_at = NOW()
       WHERE constellation_id = $1 AND status = 'active'`,
      [constellationId]
    );
    return null;
  }

  const isStaff = STAFF_ROLES.includes(userRole);
  if (isStaff) return constellation;

  // Citizens: check they are reporter or in radius
  const isReporter = await db.oneOrNone(
    'SELECT 1 FROM incidents WHERE incident_id = $1 AND reporter_id = $2',
    [constellation.incident_id, userId]
  );
  const inRadius = await isUserInRadius(userId, constellationId);

  if (!isReporter && !inRadius) return null; // returns 404 via route handler

  // Flagged: return stripped payload
  if (constellation.status === 'flagged') {
    return {
      constellation_id: constellation.constellation_id,
      status: 'flagged',
      confidence_state: null,
      summary: null,
    };
  }

  return constellation;
}

/**
 * Submit a corroboration for a constellation.
 * Enforces: reporter exclusion, state gate, duplicate prevention, note safety.
 * Returns the created corroboration row.
 */
async function submitCorroboration(constellationId, userId, { signalType, note, deviceLatitude, deviceLongitude }) {
  const constellation = await db.oneOrNone(
    'SELECT * FROM incident_constellations WHERE constellation_id = $1',
    [constellationId]
  );
  if (!constellation) throw ServiceError.notFound('Constellation not found');

  if (new Date(constellation.expires_at).getTime() <= Date.now()) {
    await db.none(
      `UPDATE incident_constellations
       SET status = 'expired', updated_at = NOW()
       WHERE constellation_id = $1 AND status = 'active'`,
      [constellationId]
    );
    throw new ServiceError('Constellation is not accepting responses', 409, 'CONSTELLATION_CLOSED');
  }

  if (constellation.status !== 'active') {
    throw new ServiceError('Constellation is not accepting responses', 409, 'CONSTELLATION_CLOSED');
  }

  // Reporter exclusion
  const incident = await db.oneOrNone(
    'SELECT reporter_id FROM incidents WHERE incident_id = $1',
    [constellation.incident_id]
  );
  if (incident && incident.reporter_id === userId) {
    throw ServiceError.forbidden('Reporter cannot corroborate their own constellation');
  }

  const recentCorroborations = await db.one(
    `SELECT COUNT(*)::int AS cnt
     FROM incident_corroborations
     WHERE user_id = $1
       AND submitted_at > NOW() - INTERVAL '${CORROBORATION_RATE_LIMIT_MINUTES} minutes'`,
    [userId]
  );
  if (recentCorroborations.cnt >= CORROBORATION_RATE_LIMIT_COUNT) {
    throw new ServiceError('Too many corroborations submitted recently', 429, 'CORROBORATION_RATE_LIMIT');
  }

  // Note safety: PII scan + toxicity check
  let cleanNote = note ? String(note).trim().slice(0, 280) : null;
  let noteFlagged = false;
  if (cleanNote) {
    if (containsPii(cleanNote)) {
      noteFlagged = true;
    } else {
      // Toxicity check via ML service
      try {
        const toxResult = await mlClient.detectToxicity(cleanNote);
        if (toxResult && (toxResult.isToxic || toxResult.isSevere)) {
          noteFlagged = true;
        }
      } catch (_) {
        // ML unavailable — store note, flag for safety
        noteFlagged = true;
      }
    }
  }

  const parsedLat = deviceLatitude === null || deviceLatitude === undefined ? NaN : parseFloat(deviceLatitude);
  const parsedLng = deviceLongitude === null || deviceLongitude === undefined ? NaN : parseFloat(deviceLongitude);
  const roundedLat = Number.isFinite(parsedLat) ? parsedLat.toFixed(2) : null;
  const roundedLng = Number.isFinite(parsedLng) ? parsedLng.toFixed(2) : null;
  const distanceMeters = (roundedLat !== null && roundedLng !== null)
    ? Math.round(await db.one(
        `SELECT ST_Distance(
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
         ) AS meters`,
        [roundedLng, roundedLat, constellation.center_longitude, constellation.center_latitude]
      ).then((row) => Number(row.meters || 0)))
    : null;

  let corroboration;
  try {
    corroboration = await db.one(
      `INSERT INTO incident_corroborations
         (constellation_id, user_id, signal_type, note, note_flagged_pii,
          distance_meters, device_latitude_rounded, device_longitude_rounded)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
      [constellationId, userId, signalType, cleanNote, noteFlagged, distanceMeters, roundedLat, roundedLng]
    );
  } catch (err) {
    if (err.code === '23505') {
      throw new ServiceError('Already responded to this constellation', 409, 'DUPLICATE_CORROBORATION');
    }
    throw err;
  }

  await db.none(
    `UPDATE incident_constellations
     SET has_unprocessed_changes = TRUE, updated_at = NOW()
     WHERE constellation_id = $1`,
    [constellationId]
  );

  // Check velocity abuse: 5+ signals in 60s from same grid cell
  if (roundedLat !== null && roundedLng !== null) {
    const velocityCount = await db.one(
      `SELECT COUNT(*)::int AS cnt
       FROM incident_corroborations
       WHERE constellation_id = $1
         AND submitted_at > NOW() - INTERVAL '60 seconds'
         AND device_latitude_rounded = $2
         AND device_longitude_rounded = $3`,
      [constellationId, roundedLat, roundedLng]
    );
    if (velocityCount.cnt >= 5) {
      await db.none(
        `UPDATE incident_constellations
         SET status = 'flagged', updated_at = NOW()
         WHERE constellation_id = $1`,
        [constellationId]
      );
      logger.warn(`Constellation ${constellationId} flagged for velocity abuse`);
    }
  }

  // Trigger synthesis asynchronously (non-blocking)
  triggerSynthesis(constellationId).catch((err) => {
    logger.error(`Synthesis trigger failed for constellation ${constellationId}: ${err.message}`);
  });

  return corroboration;
}

module.exports = {
  evaluateEligibility,
  createConstellation,
  openConstellationForIncident,
  notifyNearbyUsers,
  isUserInRadius,
  getConstellationForUser,
  submitCorroboration,
};

```

- [ ] **Step 2: Write constellationSynthesis.js**

Keep this module focused on synthesis-only behavior:
- `computeFallbackState(corroborations, constellation)`
- `findClusterCandidateIncidentIds({ constellationId, centerLatitude, centerLongitude, incidentDate })`
- `triggerSynthesis(constellationId)`

Reference skeleton:

```js
const db = require('../config/database');
const logger = require('../utils/logger');
const mlClient = require('../utils/mlClient');

const SUPPORTING_SIGNALS = new Set(['saw_something', 'heard_something']);
const CONTRADICTING_SIGNALS = new Set(['nothing_unusual', 'already_left']);

function computeFallbackState(corroborations, constellation) {
  const supporting = corroborations.filter(c => SUPPORTING_SIGNALS.has(c.signal_type)).length;
  const contradicting = corroborations.filter(c => CONTRADICTING_SIGNALS.has(c.signal_type)).length;
  const neutral = corroborations.filter(c => c.signal_type === 'not_sure').length;
  const total = corroborations.length;

  if (total === 0) {
    return {
      confidence_state: 'single_report',
      confidence_score: 0,
      summary: 'No corroborations yet.',
      supporting_signals: 0,
      contradicting_signals: 0,
      ongoing_assessment: 'unknown',
    };
  }

  const score = supporting / (supporting + contradicting + 0.5 * neutral);
  const ageMinutes = (Date.now() - new Date(constellation.opens_at).getTime()) / 60000;

  let state;
  if (contradicting / total >= 0.4) {
    state = 'mixed_signals';
  } else if (
    ageMinutes > 60 &&
    corroborations.filter(c => c.signal_type === 'already_left' || c.signal_type === 'nothing_unusual').length > total / 2
  ) {
    state = 'likely_ended';
  } else if (corroborations.filter(c => c.signal_type === 'nothing_unusual').length > total / 2) {
    state = 'activity_not_confirmed';
  } else if (supporting >= 3 && supporting > contradicting && score >= 0.65) {
    state = 'corroborated';
  } else {
    state = 'single_report';
  }

  return {
    confidence_state: state,
    confidence_score: parseFloat(score.toFixed(3)),
    summary: `${supporting} nearby ${supporting === 1 ? 'user' : 'users'} reported similar activity.`,
    supporting_signals: supporting,
    contradicting_signals: contradicting,
    ongoing_assessment: 'unknown',
  };
}

async function findClusterCandidateIncidentIds({ constellationId, centerLatitude, centerLongitude, incidentDate }) {
  const rows = await db.any(
    `SELECT i.incident_id
       FROM incident_constellations ic
       JOIN incidents i ON i.incident_id = ic.incident_id
      WHERE ic.status = 'active'
        AND ic.constellation_id != $3
        AND ic.expires_at > NOW()
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(ic.center_longitude, ic.center_latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          300
        )
        AND i.incident_date BETWEEN
            ($4::timestamptz - INTERVAL '30 minutes') AND
            ($4::timestamptz + INTERVAL '30 minutes')`,
    [centerLatitude, centerLongitude, constellationId, incidentDate]
  );

  return rows.map((row) => row.incident_id);
}

async function triggerSynthesis(constellationId) {
  // Keep this module as the only backend owner of:
  // 1. ML synthesis calls
  // 2. fallback scoring
  // 3. cluster derivation
  // 4. incident_constellations / constellation_cluster_links persistence
}

module.exports = {
  computeFallbackState,
  triggerSynthesis,
};
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/constellationService.js backend/src/services/constellationSynthesis.js
git commit -m "feat: add constellation lifecycle and synthesis services"
```

---

## Task 6: Constellation Routes

**Files:**
- Create: `backend/src/routes/constellations.js`

- [ ] **Step 1: Write constellations.js**

```js
/**
 * Constellation Routes
 */

const express = require('express');
const { param, body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authenticateToken = require('../middleware/auth');
const constellationService = require('../services/constellationService');
const ServiceError = require('../utils/ServiceError');

const router = express.Router();

const constellationReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'ERROR', message: 'Too many requests' },
  keyGenerator: (req) => req.user?.userId || req.ip,
});

function handleServiceError(error, res, defaultMessage) {
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({ status: 'ERROR', message: error.message, code: error.code });
  }
  console.error(`${defaultMessage}:`, error);
  res.status(500).json({ status: 'ERROR', message: defaultMessage });
}

/**
 * @route   GET /api/constellations/:id
 * @access  Private (authenticated, in-radius or reporter or staff)
 */
router.get(
  '/:id',
  authenticateToken,
  constellationReadLimiter,
  [param('id').isInt({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(404).json({ status: 'ERROR', message: 'Not found' });

    try {
      const result = await constellationService.getConstellationForUser(
        parseInt(req.params.id, 10),
        req.user.userId,
        req.user.role
      );
      if (!result) return res.status(404).json({ status: 'ERROR', message: 'Not found' });
      res.json({ status: 'OK', data: result });
    } catch (error) {
      handleServiceError(error, res, 'Failed to fetch constellation');
    }
  }
);

/**
 * @route   POST /api/constellations/:id/corroborate
 * @access  Private (authenticated)
 */
router.post(
  '/:id/corroborate',
  authenticateToken,
  [
    param('id').isInt({ min: 1 }),
    body('signalType').isIn(['saw_something', 'heard_something', 'nothing_unusual', 'not_sure', 'already_left']),
    body('note').optional().isString().isLength({ max: 280 }),
    body('deviceLatitude').optional().isFloat(),
    body('deviceLongitude').optional().isFloat(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'ERROR', message: 'Validation failed', errors: errors.array() });
    }

    try {
      const corroboration = await constellationService.submitCorroboration(
        parseInt(req.params.id, 10),
        req.user.userId,
        {
          signalType: req.body.signalType,
          note: req.body.note || null,
          deviceLatitude: req.body.deviceLatitude,
          deviceLongitude: req.body.deviceLongitude,
        }
      );
      res.status(201).json({ status: 'OK', data: { corroboration_id: corroboration.corroboration_id } });
    } catch (error) {
      handleServiceError(error, res, 'Failed to submit corroboration');
    }
  }
);

module.exports = router;
```

- [ ] **Step 2: Register the route in backend/src/app.js**

Add after the existing route imports near the top of `backend/src/app.js`:

```js
const constellationRoutes = require('./routes/constellations');
```

Add after `app.use('/api/admin', adminRoutes);` in the configured Express app:

```js
app.use('/api/constellations', constellationRoutes);
```

Keep `backend/src/index.js` startup-only. After the `app.js` extraction, do not add new route registration there.

- [ ] **Step 3: Start backend and verify route is reachable**

```bash
cd backend && npm start
# In another terminal:
curl -X GET http://localhost:3000/api/constellations/999 \
  -H "Authorization: Bearer <valid-token>"
```

Expected: `{"status":"ERROR","message":"Not found"}` (404, not 500)

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/constellations.js backend/src/app.js
git commit -m "feat: add constellation routes and register in express app"
```

---

## Task 7: Trigger Constellation After Incident Creation

**Files:**
- Modify: `backend/src/services/incidentService.js`

- [ ] **Step 1: Import constellation service at the top of incidentService.js**

Add near the top of `backend/src/services/incidentService.js` with the other requires:

```js
const constellationService = require('./constellationService');
```

- [ ] **Step 2: Add constellation trigger after incident creation**

In `backend/src/services/incidentService.js`, inside the `createIncident` function, find the section after the `incident` row is inserted and ML analysis runs. After the `notifyStaffIncidentEvent` call (or at the end of the non-draft block), add:

```js
// Trigger constellation (fire-and-forget — does not block incident creation)
if (!incident.is_draft) {
  (async () => {
    try {
      const result = await constellationService.openConstellationForIncident(incident, reporterId);
      if (!result.opened) {
        logger.info(`Constellation skipped for incident ${incident.incident_id}: ${result.reason}`);
      } else {
        logger.info(`Constellation ${result.constellation.constellation_id} created for incident ${incident.incident_id}`);
      }
    } catch (err) {
      logger.error(`Constellation creation failed for incident ${incident.incident_id}: ${err.message}`);
    }
  })();
}
```

- [ ] **Step 3: Verify incident creation still works**

Submit a test incident via the API and confirm:
1. The response returns the incident successfully
2. The backend log shows either "Constellation created" or "Constellation skipped for..."

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/incidentService.js
git commit -m "feat: trigger witness constellation after eligible incident creation"
```

---

## Task 8: Strip Reporter Identity from Public Incident Endpoint

**Files:**
- Create: `backend/src/middleware/optionalAuth.js`
- Modify: `backend/src/services/incidentService.js`
- Modify: `backend/src/routes/incidents.js`

- [ ] **Step 1: Add optional auth middleware**

Create `backend/src/middleware/optionalAuth.js`:

```js
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'safesignal-jwt-secret-change-in-production');
    const dbUser = await db.oneOrNone(
      'SELECT role, is_suspended FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (!dbUser || dbUser.is_suspended) {
      req.user = null;
      return next();
    }

    req.user = { ...decoded, role: dbUser.role };
  } catch (_) {
    req.user = null;
  }

  next();
};

module.exports = optionalAuth;
```

- [ ] **Step 2: Split public vs staff incident reads**

In `backend/src/services/incidentService.js`, do not hide two materially different projections behind a boolean flag. Keep one shared base query helper if useful, but expose two explicit methods:

```js
async function getIncidentByIdPublic(incidentId) {
  return db.oneOrNone(
    `SELECT i.*,
       NULL AS username,
       NULL AS email,
       ic.constellation_id,
       ic.status AS constellation_status,
       CASE WHEN ic.status = 'flagged' THEN NULL ELSE ic.confidence_state END AS constellation_confidence_state,
       CASE WHEN ic.status = 'flagged' THEN NULL ELSE ic.summary END AS constellation_summary,
       ic.supporting_signals AS constellation_supporting_signals
     FROM incidents i
     LEFT JOIN incident_constellations ic
       ON ic.incident_id = i.incident_id AND ic.expires_at > NOW() AND ic.status != 'expired'
     WHERE i.incident_id = $1`,
    [incidentId]
  );
}

async function getIncidentByIdForStaff(incidentId) {
  return db.oneOrNone(
    `SELECT i.*, u.username, u.email,
       ic.constellation_id,
       ic.status AS constellation_status,
       ic.confidence_state AS constellation_confidence_state,
       ic.summary AS constellation_summary,
       ic.supporting_signals AS constellation_supporting_signals
     FROM incidents i
     JOIN users u ON i.reporter_id = u.user_id
     LEFT JOIN incident_constellations ic
       ON ic.incident_id = i.incident_id AND ic.expires_at > NOW() AND ic.status != 'expired'
     WHERE i.incident_id = $1`,
    [incidentId]
  );
}
```

- [ ] **Step 3: Choose the service method in the public route handler**

In `backend/src/routes/incidents.js`, find the `GET /:id` route and update the service call:

```js
const optionalAuth = require('../middleware/optionalAuth');
const STAFF_ROLES = ['moderator', 'admin', 'law_enforcement'];

router.get('/:id', optionalAuth, [param('id').isInt()], async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const isStaff = req.user && STAFF_ROLES.includes(req.user.role);
    const incident = isStaff
      ? await incidentService.getIncidentByIdForStaff(req.params.id)
      : await incidentService.getIncidentByIdPublic(req.params.id);
    if (!incident) {
      return res.status(404).json({ status: 'ERROR', message: 'Incident not found' });
    }

    res.json({
      status: 'SUCCESS',
      data: { incident },
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch incident');
  }
});
```

Keep the endpoint public. Do **not** switch it to required auth.

- [ ] **Step 4: Commit**

```bash
git add backend/src/middleware/optionalAuth.js backend/src/services/incidentService.js backend/src/routes/incidents.js
git commit -m "fix: strip reporter username and email from public incident endpoint for non-staff"
```

---

## Task 9: Map Service Constellation Join

**Files:**
- Modify: `backend/src/services/mapService.js`
- Modify: `backend/src/routes/map.js`
- Modify: `FinalProject/src/services/incidentAPI.js`

- [ ] **Step 1: Add optional constellation join to getMapIncidents**

In `backend/src/services/mapService.js`, modify `getMapIncidents` to accept `include_constellation`:

```js
const getMapIncidents = async (filters) => {
  const {
    ne_lat, ne_lng, sw_lat, sw_lng,
    category,
    timeframe = '30d',
    include_constellation = false,
  } = filters;

  // ... existing timeframe validation and startDate calculation unchanged ...

  const constellationJoin = include_constellation
    ? `LEFT JOIN incident_constellations ic
         ON ic.incident_id = i.incident_id AND ic.status = 'active' AND ic.expires_at > NOW()`
    : '';

  const constellationSelect = include_constellation
    ? `, ic.confidence_state, ic.confidence_score, ic.supporting_signals`
    : '';

  let query = `
    SELECT
      i.incident_id,
      i.category,
      i.latitude,
      i.longitude,
      i.incident_date
      ${constellationSelect}
    FROM incidents i
    ${constellationJoin}
    WHERE i.status = ANY($2::text[])
      AND i.incident_date >= $1
      AND i.is_draft = false
  `;

  // ... rest of existing filter logic unchanged (bounding box, category) ...

  const result = await db.any(query, params);

  const incidents = result.map(incident => {
    const base = {
      id: incident.incident_id,
      category: incident.category,
      location: {
        latitude: toPublicCoordinate(incident.latitude),
        longitude: toPublicCoordinate(incident.longitude),
      },
      timestamp: incident.incident_date,
    };
    if (include_constellation) {
      base.constellation = incident.confidence_state
        ? {
            confidence_state: incident.confidence_state,
            confidence_score: incident.confidence_score,
            supporting_signals: incident.supporting_signals,
          }
        : null;
    }
    return base;
  });

  return { incidents, count: incidents.length, timeframe };
};
```

- [ ] **Step 2: Pass include_constellation from map route**

In `backend/src/routes/map.js`, find the route handler and add:

```js
const include_constellation = req.query.include_constellation === 'true';
const data = await mapService.getMapIncidents({ ...req.query, include_constellation });
```

- [ ] **Step 3: Pass include_constellation through the mobile API client**

In `FinalProject/src/services/incidentAPI.js`, update `getMapIncidents` so it actually serializes the new query param used by `MapScreen`:

```js
async getMapIncidents(params = {}) {
  try {
    const { ne_lat, ne_lng, sw_lat, sw_lng, category, timeframe = '30d', include_constellation = false } = params;
    const queryParams = new URLSearchParams({ timeframe });

    if (include_constellation) {
      queryParams.append('include_constellation', 'true');
    }

    // existing bounding-box + category logic stays the same
  } catch (error) {
    // existing error handling stays the same
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/mapService.js backend/src/routes/map.js FinalProject/src/services/incidentAPI.js
git commit -m "feat: add optional constellation confidence join to map incidents endpoint"
```

---

## Task 10: Stats Service Nearby Constellations Count

**Files:**
- Modify: `backend/src/services/statsService.js`
- Modify: `backend/src/routes/stats.js`

- [ ] **Step 1: Add getNearbyConstellationsForUser to statsService.js**

Add at the end of `backend/src/services/statsService.js` (before module.exports):

```js
/**
 * Count active non-flagged constellations near a user that they haven't responded to.
 * Reads user's stored coarse location — only permitted callsite per spec.
 * @param {number} userId
 * @returns {Promise<{ count: number, firstConstellationId: number | null }>}
 */
async function getNearbyConstellationsForUser(userId) {
  const row = await db.oneOrNone(
    `SELECT COUNT(*)::int AS cnt,
            MIN(ic.constellation_id) AS first_constellation_id
     FROM incident_constellations ic
     JOIN users u ON u.user_id = $1
     WHERE ic.status = 'active'
       AND ic.expires_at > NOW()
       AND u.location_consent = TRUE
       AND u.last_known_latitude IS NOT NULL
       AND u.last_known_longitude IS NOT NULL
       AND ST_DWithin(
         ST_SetSRID(ST_MakePoint(ic.center_longitude, ic.center_latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint(u.last_known_longitude, u.last_known_latitude), 4326)::geography,
         2000
       )
       AND NOT EXISTS (
         SELECT 1 FROM incident_corroborations cr
         WHERE cr.constellation_id = ic.constellation_id AND cr.user_id = $1
       )
        AND NOT EXISTS (
          SELECT 1 FROM incidents i
          WHERE i.incident_id = ic.incident_id AND i.reporter_id = $1
        )`,
    [userId]
  );
  return {
    count: row ? row.cnt : 0,
    firstConstellationId: row?.first_constellation_id ? Number(row.first_constellation_id) : null,
  };
}
```

Add `getNearbyConstellationsForUser` to `module.exports`.

- [ ] **Step 2: Add to dashboard stats response**

In `backend/src/routes/stats.js`, merge the constellation prompt payload into the existing `dashboardData` returned by `statsService.getUserDashboardStats(...)`:

```js
const nearbyConstellations = await statsService.getNearbyConstellationsForUser(req.user.userId);

// Add to the response data:
dashboardData.nearbyConstellationsNeeding = nearbyConstellations.count;
dashboardData.firstNearbyConstellationId = nearbyConstellations.firstConstellationId;
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/statsService.js backend/src/routes/stats.js
git commit -m "feat: add nearby constellation count to dashboard stats"
```

---

## Task 11: ML Synthesis Endpoint

**Files:**
- Modify: `ml-service/main.py`
- Create: `ml-service/services/constellation_synthesis.py`

Ownership rule: ML owns note interpretation, evidence summary, anomaly flagging, and confidence-state generation. Backend owns cross-incident cluster derivation and cluster-link persistence during `triggerSynthesis()`.

Implementation note: keep `main.py` thin. Route registration and Pydantic schemas stay in `main.py`; prompt construction, provider call, fallback scoring, and response shaping belong in `ml-service/services/constellation_synthesis.py`.

- [ ] **Step 1: Add Pydantic models for synthesis**

In `ml-service/main.py`, add after the existing model definitions (around line 270):

```python
# ---- Witness Constellation Synthesis ----

class CorroborationInput(BaseModel):
    signal_type: str
    note: Optional[str] = None
    note_flagged_pii: bool = False
    distance_meters: Optional[int] = None
    device_latitude_rounded: Optional[float] = None
    device_longitude_rounded: Optional[float] = None
    submitted_at: str


class IncidentMetadata(BaseModel):
    category: Optional[str] = None
    severity: Optional[str] = None
    incident_date: Optional[str] = None


class ConstellationSynthesisRequest(BaseModel):
    constellation_id: int
    incident_metadata: IncidentMetadata
    corroborations: List[CorroborationInput]
    opens_at: str
    current_time: str


class ConstellationSynthesisResponse(BaseModel):
    confidence_state: str
    confidence_score: float
    summary: str
    supporting_signals: int
    contradicting_signals: int
    ongoing_assessment: str
    anomaly_flagged: bool = False
```

- [ ] **Step 2: Add the synthesis helper**

Create `ml-service/services/constellation_synthesis.py` with a focused function such as `async def synthesize_constellation_payload(request, active_provider): ...` that owns:
- deterministic fallback scoring
- prompt construction
- provider branching
- anomaly detection
- response shaping

Do not put cross-incident clustering in the ML helper; backend owns that.

- [ ] **Step 3: Add the synthesis endpoint**

Add after the `/insights` endpoint in `ml-service/main.py`:

```python
@app.post("/constellations/synthesize", response_model=ConstellationSynthesisResponse)
async def synthesize_constellation(request: ConstellationSynthesisRequest):
    return await synthesize_constellation_payload(request, active_provider)
```

If `datetime` is not already imported in `ml-service/services/constellation_synthesis.py`, add `from datetime import datetime`.

- [ ] **Step 4: Check if active_provider has generate_text; if not, use a direct prompt approach**

Look for an existing text generation method on GeminiProvider. If `generate_text` doesn't exist, use the existing `generate_insights` pattern — call the provider with a structured prompt. Adjust the method name to match whatever exists in `providers/gemini.py`. A safe fallback if the method doesn't exist: skip LLM and return deterministic only (the endpoint still works).

- [ ] **Step 5: Start the ML service and test**

```bash
cd ml-service && python main.py
# In another terminal:
curl -X POST http://localhost:5001/constellations/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "constellation_id": 1,
    "incident_metadata": {"category": "suspicious_activity", "severity": "medium", "incident_date": "2026-04-04T10:00:00Z"},
    "corroborations": [
      {"signal_type": "saw_something", "note": null, "submitted_at": "2026-04-04T10:05:00Z"},
      {"signal_type": "saw_something", "note": null, "submitted_at": "2026-04-04T10:06:00Z"},
      {"signal_type": "heard_something", "note": null, "submitted_at": "2026-04-04T10:07:00Z"}
    ],
    "opens_at": "2026-04-04T10:02:00Z",
    "current_time": "2026-04-04T10:20:00Z"
  }'
```

Expected: JSON response with `confidence_state: "corroborated"`, `supporting_signals: 3`.

- [ ] **Step 6: Commit**

```bash
git add ml-service/main.py ml-service/services/constellation_synthesis.py
git commit -m "feat: add constellation synthesis endpoint to ML service"
```

---

## Task 12: Add synthesizeConstellation to mlClient

**Files:**
- Modify: `backend/src/utils/mlClient.js`

- [ ] **Step 1: Add function to mlClient.js**

Add before `module.exports` in `backend/src/utils/mlClient.js`:

```js
/**
 * Synthesize witness corroborations into a confidence state.
 * @param {Object} params
 * @returns {Promise<Object|null>}
 */
async function synthesizeConstellation(params) {
  try {
    const response = await mlClient.post('/constellations/synthesize', params);
    const d = response.data || {};
    return {
      confidence_state: d.confidence_state,
      confidence_score: d.confidence_score,
      summary: d.summary,
      supporting_signals: d.supporting_signals,
      contradicting_signals: d.contradicting_signals,
      ongoing_assessment: d.ongoing_assessment || 'unknown',
      anomaly_flagged: d.anomaly_flagged || false,
    };
  } catch (error) {
    logger.warn(`ML synthesizeConstellation failed: ${error.message}`);
    return null;
  }
}
```

Add `synthesizeConstellation` to `module.exports`.

- [ ] **Step 2: Commit**

```bash
git add backend/src/utils/mlClient.js
git commit -m "feat: add synthesizeConstellation to ML client"
```

---

## Task 13: Mobile Push Token and Location Service

**Files:**
- Create: `FinalProject/src/services/pushTokenService.js`
- Create: `FinalProject/src/services/locationSyncService.js`
- Modify: `FinalProject/src/context/AuthContext.js`

- [ ] **Step 1: Install expo-notifications**

```bash
cd FinalProject && npx expo install expo-notifications
```

Expected: `expo-notifications` appears in `FinalProject/package.json`.

- [ ] **Step 2: Write pushTokenService.js**

```js
import * as Notifications from 'expo-notifications';
import api from './apiClient';

/**
 * Request push notification permission and register the raw device token with the backend.
 * No-ops if permission denied.
 */
export async function registerPushToken() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const tokenData = await Notifications.getDevicePushTokenAsync();
    await api.patch('/users/me/push-token', {
      token: tokenData.data,
      platform: tokenData.type,
    });
  } catch (err) {
    console.warn('Push token registration failed:', err.message);
  }
}
```

- [ ] **Step 3: Write locationSyncService.js**

```js
import * as Location from 'expo-location';
import api from './apiClient';

const round2 = (n) => Math.round(n * 100) / 100;

export async function updateServerLocation() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    await api.patch('/users/me/location', {
      latitude: round2(position.coords.latitude),
      longitude: round2(position.coords.longitude),
    });
  } catch (err) {
    console.warn('Location update failed:', err.message);
  }
}

export async function grantLocationConsent() {
  await api.patch('/users/me/location-consent', { consent: true });
}

export async function revokeLocationConsent() {
  await api.patch('/users/me/location-consent', { consent: false });
}
```

- [ ] **Step 4: Wire the app startup flow without creating an omnibus mobile side-effects service**

In `FinalProject/src/context/AuthContext.js` (or wherever the app initializes after login), keep push registration and location sync as two separate calls:

```js
import { registerPushToken } from '../services/pushTokenService';
import { updateServerLocation } from '../services/locationSyncService';

// Inside the effect that runs when isAuthenticated becomes true:
useEffect(() => {
  if (!isAuthenticated) return;

  registerPushToken();

  if (user?.location_consent) {
    updateServerLocation();
  }
}, [isAuthenticated, user?.location_consent]);
```

Also call `updateServerLocation()` on app foreground resume only when consent is already `true`, to match the spec's startup + foreground behavior.

This task is not complete until the first-launch consent prompt and Account settings revoke flow are wired to `grantLocationConsent()` and `revokeLocationConsent()`.

- [ ] **Step 5: Commit**

```bash
git add FinalProject/src/services/pushTokenService.js FinalProject/src/services/locationSyncService.js FinalProject/src/context/AuthContext.js FinalProject/package.json FinalProject/package-lock.json
git commit -m "feat: add mobile push registration and location sync services"
```

---

## Task 14: Mobile Constellation API Client

**Files:**
- Create: `FinalProject/src/services/constellationAPI.js`

- [ ] **Step 1: Write constellationAPI.js**

Keep this client thin and aligned with the existing mobile `apiClient` convention. Do not invent a feature-specific `{ success, data, error }` wrapper if the rest of the mobile service layer returns raw payloads or throws shared API errors.

```js
import api from './apiClient';

const constellationAPI = {
  async submitCorroboration({ constellationId, signalType, note, deviceLatitude, deviceLongitude }) {
    const body = { signalType };
    if (note) body.note = String(note).trim().slice(0, 280);
    if (deviceLatitude !== undefined) body.deviceLatitude = deviceLatitude;
    if (deviceLongitude !== undefined) body.deviceLongitude = deviceLongitude;

    const response = await api.post(`/constellations/${constellationId}/corroborate`, body);
    return response.data.data;
  },

  async getConstellationStatus(constellationId) {
    const response = await api.get(`/constellations/${constellationId}`);
    return response.data.data;
  },
};

export default constellationAPI;
```

- [ ] **Step 2: Commit**

```bash
git add FinalProject/src/services/constellationAPI.js
git commit -m "feat: add mobile constellation API client"
```

---

## Task 15: WitnessPromptScreen

**Files:**
- Create: `FinalProject/src/screens/WitnessPromptScreen.js`
- Create: `FinalProject/src/hooks/useWitnessPromptSubmission.js`

- [ ] **Step 1: Write useWitnessPromptSubmission.js**

Move optional device-location lookup and corroboration submission into a dedicated hook so the screen stays focused on rendering and local form state.

```js
import { useState } from 'react';
import * as Location from 'expo-location';
import constellationAPI from '../services/constellationAPI';

export default function useWitnessPromptSubmission(constellationId, onSuccess) {
  const [submitting, setSubmitting] = useState(false);

  const submit = async ({ signalType, note }) => {
    setSubmitting(true);

    let deviceLatitude;
    let deviceLongitude;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        deviceLatitude = pos.coords.latitude;
        deviceLongitude = pos.coords.longitude;
      }
    } catch (_) {}

    try {
      await constellationAPI.submitCorroboration({
        constellationId,
        signalType,
        note: note.trim() || undefined,
        deviceLatitude,
        deviceLongitude,
      });
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, submit };
}
```

- [ ] **Step 2: Write WitnessPromptScreen.js**

```js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import useWitnessPromptSubmission from '../hooks/useWitnessPromptSubmission';

const SIGNALS = [
  { key: 'saw_something',    label: 'Saw something similar' },
  { key: 'heard_something',  label: 'Heard something unusual' },
  { key: 'nothing_unusual',  label: 'Passed by, nothing unusual' },
  { key: 'already_left',     label: 'Already left the area' },
  { key: 'not_sure',         label: 'Not sure' },
];

export default function WitnessPromptScreen({ route, navigation }) {
  const { constellationId } = route.params;
  const { theme } = useTheme();
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [note, setNote] = useState('');
  const { submitting, submit } = useWitnessPromptSubmission(
    constellationId,
    () => navigation.goBack()
  );

  const handleSubmit = async () => {
    if (!selectedSignal) return;
    try {
      await submit({ signalType: selectedSignal, note });
    } catch (error) {
      Alert.alert('Could not submit', error?.response?.data?.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>
        Did you notice anything unusual nearby?
      </Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Your response is anonymous and helps verify nearby reports.
      </Text>

      {SIGNALS.map((s) => (
        <TouchableOpacity
          key={s.key}
          style={[
            styles.signalBtn,
            { borderColor: theme.border, backgroundColor: theme.card },
            selectedSignal === s.key && { borderColor: theme.primary, backgroundColor: theme.primary + '22' },
          ]}
          onPress={() => setSelectedSignal(s.key)}
        >
          <Text style={[styles.signalLabel, { color: theme.text }]}>{s.label}</Text>
        </TouchableOpacity>
      ))}

      <TextInput
        style={[styles.noteInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
        placeholder="Optional: add a brief note (no personal details)"
        placeholderTextColor={theme.textSecondary}
        value={note}
        onChangeText={setNote}
        maxLength={280}
        multiline={false}
        returnKeyType="done"
      />

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.skipBtn}>
          <Text style={[styles.skipLabel, { color: theme.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: selectedSignal ? theme.primary : theme.border }]}
          onPress={handleSubmit}
          disabled={!selectedSignal || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.submitLabel}>Submit</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 14, marginBottom: 20 },
  signalBtn: { padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 10 },
  signalLabel: { fontSize: 15 },
  noteInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10, fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  skipBtn: { padding: 12 },
  skipLabel: { fontSize: 15 },
  submitBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
  submitLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 3: Commit**

```bash
git add FinalProject/src/screens/WitnessPromptScreen.js FinalProject/src/hooks/useWitnessPromptSubmission.js
git commit -m "feat: add WitnessPromptScreen for one-tap witness corroboration"
```

---

## Task 16: Register WitnessPromptScreen and Handle Notification Tap

**Files:**
- Modify: `FinalProject/src/navigation/AppNavigator.js`
- Create: `FinalProject/src/hooks/useWitnessPromptNotifications.js`

- [ ] **Step 1: Write useWitnessPromptNotifications.js**

Keep notification response parsing and witness deep-link logic out of `AppNavigator` itself. The navigator should register routes; a small hook can own the Expo notification response wiring.

```js
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

export default function useWitnessPromptNotifications(navigateToWitnessPrompt) {
  useEffect(() => {
    const openFromResponse = (response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.type === 'witness_prompt' && data?.constellation_id) {
        navigateToWitnessPrompt(parseInt(data.constellation_id, 10));
      }
    };

    Notifications.getLastNotificationResponseAsync().then(openFromResponse);
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    return () => subscription.remove();
  }, [navigateToWitnessPrompt]);
}
```

- [ ] **Step 2: Register the screen and use the notification hook**

Update `FinalProject/src/navigation/AppNavigator.js`:

```js
import React, { useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import useRealtimeNotifications from '../hooks/useRealtimeNotifications';
import useWitnessPromptNotifications from '../hooks/useWitnessPromptNotifications';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import VerificationScreen from '../screens/Auth/VerificationScreen';
import WitnessPromptScreen from '../screens/WitnessPromptScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="Verification" component={VerificationScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={TabNavigator} />
    <Stack.Screen name="WitnessPrompt" component={WitnessPromptScreen} options={{ headerShown: true, title: 'Nearby Activity' }} />
  </Stack.Navigator>
);

const LoadingScreen = ({ theme }) => (
  <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
    <ActivityIndicator size="large" color={theme.primary} />
  </View>
);

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const navigationRef = useRef(null);
  useRealtimeNotifications();
  useWitnessPromptNotifications((constellationId) => {
    navigationRef.current?.navigate('WitnessPrompt', { constellationId });
  });

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
  };

  if (isLoading) return <LoadingScreen theme={theme} />;

  return (
    <NavigationContainer theme={navigationTheme} ref={navigationRef}>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AppNavigator;
```

- [ ] **Step 3: Verify navigation structure**

Start the app with `cd FinalProject && npx expo start`. Verify:
1. The app loads without errors.
2. Manual navigation to `navigation.navigate('WitnessPrompt', { constellationId: 1 })` works.
3. A warm-app `witness_prompt` notification tap navigates correctly.
4. A cold-start app launch from a `witness_prompt` notification also navigates correctly.

- [ ] **Step 4: Commit**

```bash
git add FinalProject/src/navigation/AppNavigator.js FinalProject/src/hooks/useWitnessPromptNotifications.js
git commit -m "feat: register WitnessPromptScreen and handle witness_prompt notification tap"
```

---

## Task 17: Map Confidence Ring

**Files:**
- Modify: `FinalProject/src/screens/Map/MapScreen.js`

- [ ] **Step 1: Pass include_constellation to map API call**

In `FinalProject/src/screens/Map/MapScreen.js`, find where the map incidents API is called (likely through a hook or direct API call) and add `include_constellation: true` to the query params.

If using `statsAPI` or a direct API call, update:

```js
// Find the existing map fetch call and add the param:
const params = {
  ...existingParams,
  include_constellation: true,
};
```

- [ ] **Step 2: Render a confidence circle for corroborated incidents**

In the `MapView` or marker rendering section of `MapScreen.js`, after rendering each marker, add a `Circle` component from `react-native-maps` for corroborated incidents:

```js
import MapView, { Marker, Circle } from 'react-native-maps';

// Inside the map incidents render:
{incidents.map((incident) => (
  <React.Fragment key={incident.id}>
    <Marker
      coordinate={{ latitude: incident.location.latitude, longitude: incident.location.longitude }}
      // ... existing marker props
    />
    {incident.constellation?.confidence_state === 'corroborated' && (
      <Circle
        center={{ latitude: incident.location.latitude, longitude: incident.location.longitude }}
        radius={80}
        strokeColor={`rgba(255, 165, 0, ${incident.constellation.confidence_score || 0.5})`}
        fillColor={`rgba(255, 165, 0, ${(incident.constellation.confidence_score || 0.5) * 0.15})`}
        strokeWidth={2}
      />
    )}
  </React.Fragment>
))}
```

- [ ] **Step 3: Verify**

Start the app, open the Map tab, and confirm no crashes. If a corroborated incident exists in the DB, a soft orange ring should appear around its marker.

- [ ] **Step 4: Commit**

```bash
git add FinalProject/src/screens/Map/MapScreen.js
git commit -m "feat: render constellation confidence ring on map for corroborated incidents"
```

---

## Task 18: My Reports Constellation Badge

**Files:**
- Modify: `FinalProject/src/services/incidentAPI.js`
- Modify: `FinalProject/src/screens/MyReports/ReportItem.js`

- [ ] **Step 1: Verify `getUserIncidents` passes constellation fields through**

The constellation fields (`constellation_status`, `constellation_summary`, `supporting_signals`) are returned by the backend `getUserIncidents` query once the backend is extended. Check `backend/src/services/incidentService.js` function `getUserIncidents` and add a LEFT JOIN:

```js
// In the getUserIncidents query, add to the SELECT:
ic.status AS constellation_status,
ic.confidence_state AS constellation_confidence_state,
ic.summary AS constellation_summary,
ic.supporting_signals AS constellation_supporting_signals

// And add a LEFT JOIN before the WHERE clause:
LEFT JOIN incident_constellations ic
  ON ic.incident_id = i.incident_id AND ic.expires_at > NOW() AND ic.status != 'expired'
```

- [ ] **Step 2: Render constellation badge in ReportItem.js**

In `FinalProject/src/screens/MyReports/ReportItem.js`, find the area where the status badge is rendered and add below it:

```js
{incident.constellation_status === 'active' && incident.constellation_confidence_state && incident.constellation_confidence_state !== 'single_report' && (
  <View style={[styles.constellationBadge, { backgroundColor: theme.primary + '22', borderColor: theme.primary }]}> 
    <Text style={[styles.constellationBadgeText, { color: theme.primary }]}>
      {incident.constellation_confidence_state === 'corroborated'
        ? `Corroborated by ${incident.constellation_supporting_signals || 0} nearby signals`
        : incident.constellation_confidence_state === 'mixed_signals'
          ? 'Mixed nearby responses'
          : 'Awaiting corroboration'}
    </Text>
  </View>
)}
```

Add to the styles:

```js
constellationBadge: {
  borderWidth: 1,
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 3,
  marginTop: 6,
  alignSelf: 'flex-start',
},
constellationBadgeText: {
  fontSize: 12,
  fontWeight: '600',
},
```

- [ ] **Step 3: Commit**

```bash
git add FinalProject/src/services/incidentAPI.js FinalProject/src/screens/MyReports/ReportItem.js backend/src/services/incidentService.js
git commit -m "feat: show constellation confidence badge in My Reports"
```

---

## Task 19: Home Screen Prompt Card

**Files:**
- Modify: `FinalProject/src/hooks/useDashboardData.js`
- Modify: `FinalProject/src/screens/Home/HomeScreen.js`

- [ ] **Step 1: Expose nearbyConstellationsNeeding from useDashboardData**

In `FinalProject/src/hooks/useDashboardData.js`, the `dashboardData` object returned from `statsAPI.getDashboardStats()` now includes `nearbyConstellationsNeeding` and `firstNearbyConstellationId` (added in Task 10). Verify both are passed through by the hook. No code change is needed if `dashboardData` is returned as-is.

- [ ] **Step 2: Add prompt card to HomeScreen.js**

In `FinalProject/src/screens/Home/HomeScreen.js`, after the `SafetyScoreCard` or `QuickStatsRow`, add a witness prompt card when `nearbyConstellationsNeeding > 0`:

```js
const nearbyConstellations = dashboardData?.nearbyConstellationsNeeding || 0;
const firstNearbyConstellationId = dashboardData?.firstNearbyConstellationId || null;

// In the JSX, add:
{nearbyConstellations > 0 && (
  <TouchableOpacity
    style={[styles.witnessCard, { backgroundColor: theme.card, borderColor: theme.primary }]}
    onPress={() => {
      if (firstNearbyConstellationId) {
        navigation.navigate('WitnessPrompt', { constellationId: firstNearbyConstellationId });
      } else {
        navigation.navigate('MainTabs', { screen: 'Map' });
      }
    }}
  >
    <Ionicons name="people-outline" size={20} color={theme.primary} />
    <Text style={[styles.witnessCardText, { color: theme.text }]}>
      {nearbyConstellations === 1
        ? '1 nearby report needs your input'
        : `${nearbyConstellations} nearby reports need your input`}
    </Text>
    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
  </TouchableOpacity>
)}
```

Add to homeStyles.js:

```js
witnessCard: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1.5,
  borderRadius: 12,
  padding: 14,
  marginHorizontal: 16,
  marginTop: 12,
  gap: 10,
},
witnessCardText: {
  flex: 1,
  fontSize: 14,
  fontWeight: '600',
},
```

This flow must always navigate with a real `constellationId` when one is available. Do not ship a `null` placeholder route param.

- [ ] **Step 3: Commit**

```bash
git add FinalProject/src/hooks/useDashboardData.js FinalProject/src/screens/Home/HomeScreen.js FinalProject/src/screens/Home/homeStyles.js
git commit -m "feat: add witness prompt card to Home screen"
```

---

## Task 20: Incident Detail Constellation Badge

**Files:**
- Modify: `FinalProject/src/components/IncidentDetailModal.js`
- Modify: the screen or caller that opens `IncidentDetailModal.js` if it currently passes only a partial incident object

- [ ] **Step 1: Locate the incident detail component**

Open `FinalProject/src/components/IncidentDetailModal.js`. Do not add a mount-time refetch plus shadow `fullIncident` state on top of an existing `incident` prop. Pick one source of truth. Preferred direction for this plan: keep the modal presentational and pass it an already-hydrated incident payload from the caller.

- [ ] **Step 2: Render the constellation badge from the prepared incident data**

```js
// In the JSX, add a constellation status section:
{incident?.constellation_status && (
  <View style={styles.constellationSection}>
    <Text style={[styles.constellationLabel, { color: theme.textSecondary }]}> 
      Community Signals
    </Text>
    {incident.constellation_status === 'flagged' ? (
      <Text style={{ color: theme.textSecondary }}>Under review</Text>
    ) : (
      <Text style={{ color: theme.text }}>
        {incident.constellation_summary || 'Awaiting nearby responses'}
      </Text>
    )}
  </View>
)}
```

If the caller currently passes only a partial incident object, update that caller in the same change to fetch `incidentAPI.getIncidentById(incident.id)` before opening the modal and pass the hydrated result down. Do not keep both `incident` and `fullIncident` as competing state inside the modal.

Note: the JOIN must include both `active` AND `flagged` constellations (`ic.status != 'expired'`). A `flagged` constellation must still appear so the UI can show "Under review" — if the JOIN filters to `status = 'active'` only, flagged constellations become invisible and the "Under review" path is never reached. Add the constellation fields to the public and staff `getIncidentById*` service methods in `incidentService.js`:

```js
// In getIncidentById, add to the SELECT:
ic.constellation_id,
ic.status AS constellation_status,
ic.confidence_state AS constellation_confidence_state,
ic.summary AS constellation_summary,
ic.supporting_signals AS constellation_supporting_signals

// And add LEFT JOIN:
LEFT JOIN incident_constellations ic
  ON ic.incident_id = i.incident_id AND ic.expires_at > NOW() AND ic.status != 'expired'
```

- [ ] **Step 3: Commit**

```bash
git add FinalProject/src/components/IncidentDetailModal.js backend/src/services/incidentService.js
git commit -m "feat: add constellation confidence badge to incident detail view"
```

---

## Task 21: Constellation Maintenance Job

**Files:**
- Create: `backend/src/jobs/constellationMaintenance.js`
- Modify: `backend/src/index.js`

- [ ] **Step 1: Add maintenance jobs for expiry/synthesis plus nightly location cleanup**

Create `backend/src/jobs/constellationMaintenance.js`:

```js
const db = require('../config/database');
const logger = require('../utils/logger');
const { triggerSynthesis } = require('../services/constellationSynthesis');

async function markExpiredConstellations() {
  const result = await db.result(
    `UPDATE incident_constellations
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'active' AND expires_at <= NOW()`
  );
  return result.rowCount;
}

async function clearStaleUserLocations() {
  const result = await db.result(
    `UPDATE users
     SET last_known_latitude = NULL,
         last_known_longitude = NULL,
         location_updated_at = NULL,
         updated_at = NOW()
     WHERE location_updated_at IS NOT NULL
       AND location_updated_at < NOW() - INTERVAL '30 days'`
  );
  return result.rowCount;
}

async function runPendingConstellationSynthesis() {
  const rows = await db.any(
    `SELECT constellation_id
      FROM incident_constellations
     WHERE status = 'active'
       AND expires_at > NOW()
       AND has_unprocessed_changes = TRUE
     ORDER BY updated_at ASC, constellation_id ASC
     LIMIT 100`
  );

  for (const row of rows) {
    await triggerSynthesis(row.constellation_id);
  }

  return rows.length;
}

async function runConstellationMaintenance() {
  const expired = await markExpiredConstellations();
  const synthesized = await runPendingConstellationSynthesis();
  logger.info(`Constellation maintenance: expired=${expired}, synthesized=${synthesized}`);
}

function startConstellationMaintenance() {
  runConstellationMaintenance().catch((error) => {
    console.error('Constellation maintenance failed at startup:', error.message);
  });
  clearStaleUserLocations().catch((error) => {
    console.error('Nightly location cleanup failed at startup:', error.message);
  });

  setInterval(() => {
    runConstellationMaintenance().catch((error) => {
      console.error('Constellation maintenance failed:', error.message);
    });
  }, 5 * 60 * 1000);

  setInterval(() => {
    clearStaleUserLocations().catch((error) => {
      console.error('Nightly location cleanup failed:', error.message);
    });
  }, 24 * 60 * 60 * 1000);
}

module.exports = {
  markExpiredConstellations,
  clearStaleUserLocations,
  runPendingConstellationSynthesis,
  runConstellationMaintenance,
  startConstellationMaintenance,
};
```

- [ ] **Step 2: Register the 5-minute sweep and separate nightly location cleanup**

In `backend/src/index.js`, import and call the bootstrap helper after the database is ready:

```js
const { startConstellationMaintenance } = require('./jobs/constellationMaintenance');

startConstellationMaintenance();
```

Keep the interval setup in one place only. `index.js` should not manually repeat the timer wiring after this helper exists.

- [ ] **Step 3: Verify**

Run the backend, then manually invoke the exported job once from `node -e` and confirm:
1. Active rows past `expires_at` are marked `expired`
2. `has_unprocessed_changes = true` constellations are synthesized
3. User locations older than 30 days are cleared by the nightly cleanup function

Operational note: this plan assumes a single backend instance runs the maintenance loop. If you later run multiple backend instances, add lightweight claim/locking semantics before treating this sweep as horizontally safe.

- [ ] **Step 4: Commit**

```bash
git add backend/src/jobs/constellationMaintenance.js backend/src/index.js
git commit -m "feat: add constellation maintenance sweep for expiry, synthesis, and location cleanup"
```

---

## Task 22: Automated Test Suite

**Files:**
- Create: `backend/src/app.js`
- Create: `backend/tests/helpers/constellationTestSeed.js`
- Create: `backend/tests/jest.teardown.js`
- Create: `backend/tests/constellation.routes.test.js`
- Create: `backend/tests/constellationSynthesis.test.js`
- Modify: `backend/src/index.js`
- Modify: `backend/package.json`

This task covers the security and privacy behaviors that are not exercised by the curl smoke tests in the earlier tasks. Keep HTTP contract tests separate from pure synthesis/fallback tests so one file does not become the feature's second implementation.

Sequencing note: **Step 2 (`backend/src/app.js` extraction)** is an enabling refactor and should be completed before route-heavy backend tasks, even if the rest of Task 22 stays near the end of the execution sequence.

- [ ] **Step 1: Add backend test dependencies**

```bash
cd backend && npm install --save-dev jest supertest
```

Expected: `jest` and `supertest` appear in `backend/package.json` devDependencies.

- [ ] **Step 2: Extract an app module for tests**

Create `backend/src/app.js` by moving the Express app setup out of `backend/src/index.js` and exporting the configured `app` without calling `listen()`. Then update `backend/src/index.js` to import the configured app/server from `./app` and keep only startup-specific concerns there.

- [ ] **Step 3: Create shared test setup helpers**

Create `backend/tests/helpers/constellationTestSeed.js`:

```js
const db = require('../../src/config/database');
const jwt = require('jsonwebtoken');

async function seedConstellationScenario() {
  const reporterRow = await db.one(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES ('reporter_test', 'reporter@test.local', 'x', 'citizen')
     RETURNING user_id`
  );
  const witnessRow = await db.one(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES ('witness_test', 'witness@test.local', 'x', 'citizen')
     RETURNING user_id`
  );
  const staffRow = await db.one(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES ('moderator_test', 'moderator@test.local', 'x', 'moderator')
     RETURNING user_id`
  );

  const secret = process.env.JWT_SECRET || 'safesignal-jwt-secret-change-in-production';
  const reporterToken = jwt.sign({ userId: reporterRow.user_id, role: 'citizen' }, secret);
  const witnessToken = jwt.sign({ userId: witnessRow.user_id, role: 'citizen' }, secret);
  const staffToken = jwt.sign({ userId: staffRow.user_id, role: 'moderator' }, secret);

  const incRow = await db.one(
    `INSERT INTO incidents (title, description, category, severity, status,
                            latitude, longitude, reporter_id)
     VALUES ('Test incident', 'desc', 'theft', 'medium', 'submitted',
              40.71, -74.00, $1)
      RETURNING incident_id`,
    [reporterRow.user_id]
  );

  const cRow = await db.one(
    `INSERT INTO incident_constellations
       (incident_id, status, center_latitude, center_longitude, radius_meters,
        opens_at, expires_at, confidence_state, confidence_score,
        supporting_signals, contradicting_signals, ongoing_assessment)
     VALUES ($1, 'active', 40.71, -74.00, 500,
             NOW(), NOW() + INTERVAL '1 hour', 'single_report', 0.0,
             0, 0, 'unclear')
     RETURNING constellation_id`,
    [incRow.incident_id]
  );

  return {
    reporterUserId: reporterRow.user_id,
    witnessUserId: witnessRow.user_id,
    staffUserId: staffRow.user_id,
    reporterToken,
    witnessToken,
    staffToken,
    incidentId: incRow.incident_id,
    constellationId: cRow.constellation_id,
  };
}

async function cleanupConstellationScenario(ctx) {
  await db.none(`DELETE FROM incident_corroborations WHERE constellation_id = $1`, [ctx.constellationId]);
  await db.none(`DELETE FROM incident_constellations WHERE incident_id = $1`, [ctx.incidentId]);
  await db.none(`DELETE FROM incidents WHERE incident_id = $1`, [ctx.incidentId]);
  await db.none(`DELETE FROM users WHERE user_id IN ($1, $2, $3)`,
    [ctx.reporterUserId, ctx.witnessUserId, ctx.staffUserId]);
}

module.exports = { seedConstellationScenario, cleanupConstellationScenario };
```

- [ ] **Step 4: Create the HTTP contract test file**

Create `backend/tests/constellation.routes.test.js`:

```js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const { seedConstellationScenario, cleanupConstellationScenario } = require('./helpers/constellationTestSeed');

let ctx;

beforeAll(async () => {
  ctx = await seedConstellationScenario();
});

afterAll(async () => {
  await cleanupConstellationScenario(ctx);
});

describe('GET /api/incidents/:id — reporter identity stripping', () => {
  test('anonymous caller does not receive username or email', async () => {
    const res = await request(app).get(`/api/incidents/${ctx.incidentId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.incident.username).toBeNull();
    expect(res.body.data.incident.email).toBeNull();
  });

  test('authenticated non-staff does not receive username or email', async () => {
    const res = await request(app)
      .get(`/api/incidents/${ctx.incidentId}`)
      .set('Authorization', `Bearer ${ctx.witnessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.incident.username).toBeNull();
    expect(res.body.data.incident.email).toBeNull();
  });

  test('staff caller receives username and email', async () => {
    const res = await request(app)
      .get(`/api/incidents/${ctx.incidentId}`)
      .set('Authorization', `Bearer ${ctx.staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.incident.username).toBe('reporter_test');
    expect(res.body.data.incident.email).toBe('reporter@test.local');
  });
});

describe('GET /api/constellations/:id — anti-enumeration', () => {
  test('nonexistent constellation returns 404, not 403', async () => {
    const res = await request(app)
      .get('/api/constellations/99999999')
      .set('Authorization', `Bearer ${ctx.witnessToken}`);
    expect(res.status).toBe(404);
  });

  test('unauthenticated caller returns 401 before object lookup', async () => {
    const res = await request(app).get('/api/constellations/99999999');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 4a: Add flagged constellation coverage to the same HTTP test file**

```js
describe('GET /api/constellations/:id — flagged visibility', () => {
  let flaggedConstellationId;

  beforeAll(async () => {
    const row = await db.one(
      `INSERT INTO incident_constellations
         (incident_id, status, center_latitude, center_longitude, radius_meters,
          opens_at, expires_at, confidence_state, confidence_score,
          supporting_signals, contradicting_signals, ongoing_assessment)
       VALUES ($1, 'flagged', 40.71, -74.00, 500,
               NOW(), NOW() + INTERVAL '1 hour', 'corroborated', 0.85,
               3, 1, 'ongoing')
       RETURNING constellation_id`,
      [ctx.incidentId]
    );
    flaggedConstellationId = row.constellation_id;
  });

  afterAll(async () => {
    await db.none(`DELETE FROM incident_constellations WHERE constellation_id = $1`,
      [flaggedConstellationId]);
  });

  test('flagged constellation returns status=flagged with null sensitive fields', async () => {
    const res = await request(app)
      .get(`/api/constellations/${flaggedConstellationId}`)
      .set('Authorization', `Bearer ${ctx.witnessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.data.status).toBe('flagged');
    expect(res.body.data.confidence_state).toBeNull();
    expect(res.body.data.summary).toBeNull();
    expect(res.body.data.confidence_score).toBeUndefined();
  });
});
```

- [ ] **Step 4b: Add expiry-gate coverage to the same HTTP test file**

```js
describe('POST /api/constellations/:id/corroborate — expiry gate', () => {
  let expiredConstellationId;

  beforeAll(async () => {
    const row = await db.one(
      `INSERT INTO incident_constellations
         (incident_id, status, center_latitude, center_longitude, radius_meters,
          opens_at, expires_at, confidence_state, confidence_score,
          supporting_signals, contradicting_signals, ongoing_assessment)
       VALUES ($1, 'active', 40.71, -74.00, 500,
               NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour',
               'single_report', 0.0, 0, 0, 'unclear')
       RETURNING constellation_id`,
      [ctx.incidentId]
    );
    expiredConstellationId = row.constellation_id;
  });

  afterAll(async () => {
    await db.none(`DELETE FROM incident_constellations WHERE constellation_id = $1`,
      [expiredConstellationId]);
  });

  test('submitting to an expired constellation returns 409', async () => {
    const res = await request(app)
      .post(`/api/constellations/${expiredConstellationId}/corroborate`)
      .set('Authorization', `Bearer ${ctx.witnessToken}`)
      .send({ signalType: 'saw_something' });
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 4c: Add duplicate-prevention coverage to the same HTTP test file**

```js
describe('POST /api/constellations/:id/corroborate — duplicate prevention', () => {
  test('second corroboration from same user returns 409', async () => {
    const first = await request(app)
      .post(`/api/constellations/${ctx.constellationId}/corroborate`)
      .set('Authorization', `Bearer ${ctx.witnessToken}`)
      .send({ signalType: 'saw_something' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/constellations/${ctx.constellationId}/corroborate`)
      .set('Authorization', `Bearer ${ctx.witnessToken}`)
      .send({ signalType: 'heard_something' });
    expect(second.status).toBe(409);
  });

  test('reporter cannot corroborate their own constellation', async () => {
    // Need a fresh constellation so the one above is not polluted
    const cRow = await db.one(
      `INSERT INTO incident_constellations
         (incident_id, status, center_latitude, center_longitude, radius_meters,
          opens_at, expires_at, confidence_state, confidence_score,
          supporting_signals, contradicting_signals, ongoing_assessment)
       VALUES ($1, 'active', 40.71, -74.00, 500,
               NOW(), NOW() + INTERVAL '1 hour', 'single_report', 0.0,
               0, 0, 'unclear')
       RETURNING constellation_id`,
      [ctx.incidentId]
    );
    const tmpId = cRow.constellation_id;

    const res = await request(app)
      .post(`/api/constellations/${tmpId}/corroborate`)
      .set('Authorization', `Bearer ${ctx.reporterToken}`)
      .send({ signalType: 'saw_something' });
    expect(res.status).toBe(403);

    await db.none(`DELETE FROM incident_constellations WHERE constellation_id = $1`, [tmpId]);
  });
});
```

- [ ] **Step 5: Create the pure synthesis test file**

Create `backend/tests/constellationSynthesis.test.js`:

```js
describe('Fallback synthesis', () => {
  test('computeFallbackState returns a valid confidence_state for any signal distribution', () => {
    // Import the pure function directly — no HTTP needed
    const { computeFallbackState } = require('../src/services/constellationSynthesis');

    const cases = [
      {
        corroborations: [],
        constellation: { opens_at: new Date().toISOString() },
        expected: 'single_report',
      },
      {
        corroborations: [
          { signal_type: 'saw_something' },
          { signal_type: 'saw_something' },
          { signal_type: 'heard_something' },
          { signal_type: 'nothing_unusual' },
          { signal_type: 'not_sure' },
        ],
        constellation: { opens_at: new Date().toISOString() },
        expected: 'corroborated',
      },
      {
        corroborations: [
          { signal_type: 'saw_something' },
          { signal_type: 'nothing_unusual' },
          { signal_type: 'nothing_unusual' },
          { signal_type: 'already_left' },
        ],
        constellation: { opens_at: new Date().toISOString() },
        expected: 'mixed_signals',
      },
      {
        corroborations: [
          { signal_type: 'nothing_unusual' },
          { signal_type: 'nothing_unusual' },
          { signal_type: 'not_sure' },
        ],
        constellation: { opens_at: new Date().toISOString() },
        expected: 'activity_not_confirmed',
      },
      {
        corroborations: [
          { signal_type: 'already_left' },
          { signal_type: 'nothing_unusual' },
          { signal_type: 'not_sure' },
        ],
        constellation: { opens_at: new Date(Date.now() - 61 * 60 * 1000).toISOString() },
        expected: 'likely_ended',
      },
    ];

    const validStates = new Set([
      'single_report', 'corroborated', 'mixed_signals',
      'activity_not_confirmed', 'likely_ended',
    ]);

    for (const c of cases) {
      const result = computeFallbackState(c.corroborations, c.constellation);
      expect(validStates.has(result.confidence_state)).toBe(true);
      expect(typeof result.confidence_score).toBe('number');
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
      if (c.expected) {
        expect(result.confidence_state).toBe(c.expected);
      }
    }
  });
});
```

- [ ] **Step 6: Add one shared Jest teardown**

Create `backend/tests/jest.teardown.js` so the DB pool is closed once after the full Jest run rather than inside one suite:

```js
const db = require('../src/config/database');

module.exports = async () => {
  await db.$pool.end();
};
```

If `backend/package.json` already has a Jest config, add `globalTeardown: '<rootDir>/tests/jest.teardown.js'`. Otherwise add a minimal Jest config block there instead of closing the pool from one individual suite.

- [ ] **Step 7: Run all constellation tests**

```bash
cd backend && npx jest tests/constellation.routes.test.js tests/constellationSynthesis.test.js --runInBand --verbose
```

Expected: all listed constellation tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/app.js backend/src/index.js backend/tests/helpers/constellationTestSeed.js backend/tests/jest.teardown.js backend/tests/constellation.routes.test.js backend/tests/constellationSynthesis.test.js backend/package.json backend/package-lock.json
git commit -m "test: add automated coverage for constellation authz, privacy, and fallback"
```

---

## Self-Review

Spec coverage check:

| Spec section | Task(s) |
|---|---|
| Data model — 3 tables + users columns | Task 1 |
| Location consent + governance | Task 4 (setLocationConsent endpoint), Task 13 (grantLocationConsent mobile) |
| Eligibility rules + creation rate limit | Task 5 (evaluateEligibility) |
| Push infra: raw device tokens + firebase-admin | Task 2 (FCM client), Task 13 (pushTokenService) |
| Targeting query with consent filter | Task 5 (notifyNearbyUsers) |
| Witness response flow + note safety | Task 5 (submitCorroboration: PII + toxicity), Task 15 (WitnessPromptScreen) |
| AI synthesis endpoint | Task 11 (ML note interpretation, summary, anomaly flagging, confidence state), Task 12 (mlClient), Task 5 (backend cluster derivation + persistence via `constellationSynthesis`), Task 21 (5-minute synthesis sweep) |
| Confidence state precedence (ML > fallback) | Task 5 (`triggerSynthesis` + `computeFallbackState` in `constellationSynthesis`) |
| Fallback score formula | Task 5 (`computeFallbackState` in `constellationSynthesis`) |
| Flagged visibility matrix | Task 5 (flagged constellations return stripped payload for authorized citizen/reporter callers), Task 6 (unauthorized objects return 404), Tasks 9/18/19/20 (surface-specific hiding vs "Under review") |
| Map constellation ring | Task 9 (backend join), Task 17 (mobile ring) |
| My Reports badge | Task 18 |
| Home prompt card | Task 10 (stats), Task 19 (UI) |
| Incident Detail prepared-data badge | Task 20 |
| Strip reporter identity | Task 8 |
| Cluster links table + persistence | Task 1 (migration), Task 5 (`triggerSynthesis` cluster persist) |
| Constellation GET authz + anti-enum | Task 6 (unauthenticated callers return 401; unauthorized existing objects return 404; flagged authorized citizen/reporter callers receive stripped payload) |
| Corroboration write rules | Task 5 (reporter exclusion, state gate, duplicate, per-user rate limit) |
| Velocity abuse detection | Task 5 (submitCorroboration velocity check) |
| Expiry + location retention TTL cleanup | Task 21 (5-minute expiry/synthesis + nightly location cleanup) |
| Automated authz + privacy + fallback coverage | Task 22 |
