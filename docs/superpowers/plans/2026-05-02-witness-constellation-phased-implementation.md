# Witness Constellation Phased Implementation Plan

> Source spec: `docs/superpowers/specs/2026-04-04-witness-constellation-design.md`
>
> Replaces the earlier broad plan with a safer phase-by-phase implementation path. Keep the old plan for historical context, but use this plan for execution.

## Goal

Build Witness Constellation as a privacy-safe, mobile-first community corroboration feature:

- A qualifying incident opens a short-lived constellation.
- Nearby opted-in users can submit one-tap witness signals.
- Signals are synthesized into a structured confidence state.
- The confidence state appears on Home, My Reports, Incident Detail, and later the Map.

## Guiding Principles

- Ship the smallest safe MVP first.
- Do not expose reporter identity, witness identity, exact witness movement, or raw witness notes.
- Do not depend on Gemini for core correctness. Rule-based fallback must work first.
- Do not enable remote push until token delivery is verified on real devices.
- Do not show constellation data on public map surfaces until privacy and trust behavior is verified.
- Keep each phase independently testable.

## Known Corrections From Review

These corrections are implementation-source-of-truth overrides where they differ from the source spec. Do not reintroduce the older spec behavior unless the spec is updated and this plan is revised.

- Add `has_unprocessed_changes` to `incident_constellations`; the spec references it for the 5-minute synthesis sweep but the schema omitted it.
- Do not add iOS push scope; the project is Android-only.
- Verify `expo-notifications` raw Android device token behavior before shipping Firebase Admin dispatch.
- Avoid Home prompt deep-links that point to a constellation the user cannot read.
- Fix deterministic fallback precedence as an explicit implementation correction: `likely_ended` and `activity_not_confirmed` must be checked before generic `mixed_signals` so both states are reachable.
- Seed tests using separate incidents when the active-constellation uniqueness constraint would otherwise conflict.
- Exclude flagged notes from ML synthesis payloads, but never display any note verbatim.
- Keep write rules aligned with the spec: authenticated, non-reporter, active constellation, no duplicate, no in-radius check at write time.
- Trigger synthesis immediately after each successful corroboration; the 5-minute sweep is a retry/backstop, not the primary update path.
- Make corroboration write anti-enumeration explicit and testable: unauthenticated `401`, reporter `403`, missing or ineligible `404`, flagged/expired/duplicate `409`.
- Implement the velocity cap in backend synthesis: 5+ corroborations within 60 seconds from the same 2-decimal grid cell flags the constellation and freezes confidence score growth.
- Add mobile location consent, Account settings revocation, and startup/foreground coarse-location update before relying on Home or push targeting.
- Preserve the witness prompt's privacy-safe coarse map anchor; pass coarse coordinates from notification data or fetch a stripped constellation status payload.
- Resolve the Home radius mismatch by using the constellation radius for MVP tappable prompts. Do not implement the spec's 2 km awareness count in this phase.
- Gate push-token registration behind app-level location consent. The mobile app must not request/register a push token before consent, and the backend token endpoint must reject token storage while `location_consent = FALSE`.
- Treat toxicity-check failures as unsafe note content: persist the corroboration, store the note flagged, exclude it from ML synthesis, and log the failure without blocking the witness signal.
- Keep deterministic synthesis fallback in the backend only. The ML service should return a valid ML synthesis response or fail clearly so the backend can use its single fallback implementation.
- Make backend-derived cluster links the MVP source of truth. The ML response may include `cluster_match_incident_ids` for diagnostics, but the backend links active constellations by spatial and timing rules.

## MVP Decisions

- Home prompt radius: use `CONSTELLATION_RADIUS_METERS`, defaulting to 500 m, for both count and tappable prompt selection.
- Remote push: not part of the first MVP gate. Build and validate the in-app witness prompt first; enable push only in Phase 8 after Android device-token dispatch is verified.
- Mobile consent UX: prompt the authenticated user from the Home flow before any stored-location or push-registration behavior runs.
- Location revocation UX: expose revocation in Account settings; revocation must call the backend consent endpoint and clear local consent state.
- Implementation source of truth: this plan overrides the older spec for Android-only scope, Home radius, push-token consent gating, backend-only deterministic fallback, backend-owned cluster links, and deterministic fallback precedence.

## Phase Gates

Do not start a phase until the previous phase's validation gate passes.

| Phase | Purpose | Gate |
|---|---|---|
| 0 | Verify current seams and push-token assumption | Written notes in this file's checklist are complete |
| 1 | Testable backend foundation | Backend app can be imported by tests without listening |
| 2 | Database schema | Migration runs twice safely and tables/columns exist |
| 3 | Privacy and user consent APIs | User location/token APIs work and never leak sensitive columns |
| 4 | Backend constellation core | Constellation creation/submission/read auth tests pass |
| 5 | Synthesis | Deterministic fallback tests pass before ML wiring |
| 6 | Mobile witness flow | In-app prompt submission works without push |
| 7 | Private mobile surfaces | My Reports, Detail, and Home work without public map exposure |
| 8 | Push rollout | Android token dispatch verified on a real device |
| 9 | Map surface | Map only shows active, non-flagged corroborated state |
| 10 | Operational hardening | Full tests and manual privacy checks pass |

---

## Phase 0: Preflight And Decisions

Purpose: remove ambiguity before editing production behavior.

### Files To Inspect

- `backend/src/index.js`
- `backend/src/routes/incidents.js`
- `backend/src/routes/users.js`
- `backend/src/services/incidentService.js`
- `backend/src/services/mapService.js`
- `backend/src/services/statsService.js`
- `backend/src/utils/mlClient.js`
- `FinalProject/src/context/AuthContext.js`
- `FinalProject/src/navigation/AppNavigator.js`
- `FinalProject/src/services/apiClient.js`
- `FinalProject/src/services/mobileNotifications.native.js`
- `ml-service/main.py`
- `ml-service/providers/gemini.py`

### Steps

- [x] Confirm the backend database migration style and naming convention.
- [x] Confirm the current `users` table has `updated_at`, `is_suspended`, and expected role values.
- [x] Confirm whether `backend/src/index.js` currently combines app setup and `listen()`.
- [x] Confirm the current incident creation service returns the inserted incident with coordinates and toxicity fields available.
- [x] Confirm the existing ML toxicity client method name and response shape.
- [x] Confirm whether the mobile app is Expo managed, bare/custom dev client, or another workflow.
- [x] Confirm whether `expo-notifications` is already installed.
- [x] Confirm whether app config contains Android push-notification credentials and the Android application ID needed for device testing.
- [x] Confirm the MVP Home prompt radius remains `CONSTELLATION_RADIUS_METERS`, defaulting to 500 m.
- [x] Confirm remote push remains post-MVP and gated by Phase 8 Android device verification.
- [x] Document the fallback precedence correction against the spec's table ordering so implementers do not reintroduce unreachable states.
- [x] Confirm the Home-flow consent prompt and Account settings revocation placement against the current mobile navigation structure.

### Validation Gate

- [x] Document the answers above in the implementation PR or a short note below this checklist.
- [x] Do not implement Firebase push dispatch until real-token behavior is verified.

### Phase 0 Notes - 2026-05-02

- Backend migration style: one-off scripts live under `backend/src/database/migrations` and are named `add_*.js`. The newer pattern exports a `runMigration` function, wraps execution in `if (require.main === module)`, uses idempotent SQL such as `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, and exits non-zero on failure. `backend/src/database/init.js` also owns base schema creation and repeats some additive/idempotent schema updates during `db:init`.
- Current live `users` table check passed against the local database. It has `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, `is_suspended BOOLEAN DEFAULT false`, and `role VARCHAR DEFAULT 'citizen'` with allowed values `citizen`, `moderator`, `admin`, and `law_enforcement`.
- `backend/src/index.js` currently combines Express app composition, Socket.IO setup, middleware, routes, error handling, and `server.listen()`. Phase 1 should split app composition into `backend/src/app.js` before route tests are added.
- `incidentService.createIncident()` inserts the incident with `latitude`, `longitude`, `location`, `status`, and other incident fields via `RETURNING *`, then may mutate `category`, `severity`, and `status` during ML/dedup/auto-flag processing before returning the same object. Toxicity is available inside the creation flow and persisted to `report_ml.is_toxic` / `report_ml.toxicity_score`, but toxicity fields are not returned on the incident object.
- Existing backend ML toxicity client method: `mlClient.detectToxicity(text)`, which calls `POST /toxicity` and normalizes to `{ isToxic, toxicityScore, isSevere, details }` or `null` on error. `mlClient.analyzeIncident(...)` can also return nested `toxicity` with the same normalized field names.
- ML service toxicity endpoint shape: `POST /toxicity` returns `is_toxic`, `toxicity_score`, `is_severe`, `details`, and optional `inference_metadata`. Gemini provider method names available today include `detect_toxicity`, `full_analyze`, `pairwise_compare`, and `generate_insights`; there is no constellation synthesis provider method yet.
- Mobile app location: the plan's `FinalProject/src/...` paths correspond to this repo's actual `Mobile-part/src/...` paths. Future mobile phase file paths should use `Mobile-part` unless the app is moved.
- Mobile workflow: Expo SDK 54 with checked-in native Android project and scripts using `expo run:android`, so treat it as Expo prebuild/custom dev client rather than pure managed Expo. There is an Android native project under `Mobile-part/android`.
- `expo-notifications` is not installed. Existing notification code uses `@notifee/react-native` for local notifications only, with no remote token registration path found.
- Android app ID is present as `com.hhhhjjj.FinalProject` in both `Mobile-part/app.json` and `Mobile-part/android/app/build.gradle`. No `google-services.json`, Firebase Gradle plugin, EAS project ID, or push credential config was found, so Android remote push credentials are not configured in-repo.
- MVP Home prompt radius remains the plan decision: implement `CONSTELLATION_RADIUS_METERS` with default `500` for MVP prompt count and tappable selection. No such constant exists yet in `constants/limits.js`, so Phase 4/7 should introduce it rather than reuse the existing dedup radius.
- Remote push remains post-MVP and gated by Phase 8. Do not implement Firebase Admin dispatch, token registration, or notification tap routing until `expo-notifications` raw Android device token behavior is verified on a real Android device.
- Deterministic fallback precedence correction: backend fallback must check `likely_ended` and `activity_not_confirmed` before generic `mixed_signals`; otherwise majority `already_left` / `nothing_unusual` cases can be swallowed by the contradicting-signal ratio rule and become unreachable.
- Home-flow consent placement: `Mobile-part/src/navigation/AppNavigator.js` switches authenticated users into `TabNavigator`; `DashboardStack` currently hosts `HomeScreen`, so the Home-flow consent prompt should be introduced from the authenticated Home/Dashboard path before stored location or push targeting runs.
- Account revocation placement: `Mobile-part/src/screens/Account/AccountScreen.js` already renders `PreferencesSection` with a Location Services toggle. Reuse or replace that toggle as the app-level location consent grant/revoke control, and make revocation call the backend consent endpoint plus clear local consent state.
- Current local preferences default `locationServices: true` and `pushNotifications: true` in `constants/preferences.js`. Phase 7 should revisit these defaults so app-level location consent is not silently granted before explicit user consent.

---

## Phase 1: Backend Test Foundation

Purpose: make route and service work testable before adding feature routes.

### Files

- Create: `backend/src/app.js`
- Modify: `backend/src/index.js`
- Modify: `backend/package.json`
- Create later in this phase if needed: `backend/tests/jest.teardown.js`

### Steps

- [x] Install backend test dependencies if absent: `jest` and `supertest`.
- [x] Extract Express app composition from `backend/src/index.js` into `backend/src/app.js`.
- [x] Export the configured `app` from `backend/src/app.js` without calling `listen()`.
- [x] Keep only startup concerns in `backend/src/index.js`: database readiness, server listen, socket/bootstrap jobs.
- [x] Add a Jest config only if the repo does not already have one.
- [x] Add one global teardown that closes the shared pg-promise pool after all Jest tests.
- [x] Add a smoke test that imports `app` and verifies an existing public route still responds.

### Validation Gate

- [x] `cd backend && npx jest --runInBand` passes for existing and smoke tests.
- [x] `cd backend && npm start` still starts the server.

### Phase 1 Notes - 2026-05-02

- Added `backend/src/app.js` as the importable Express app entrypoint. It owns middleware, route registration, Sentry HTTP middleware, health/debug routes, 404 handling, and the shared error handler, but does not create an HTTP listener.
- Reduced `backend/src/index.js` to startup concerns: create HTTP/Socket.IO server, attach socket auth/rooms, start the weekly digest scheduler, and call `server.listen()`.
- Added backend Jest config in `backend/package.json`, `backend/tests/jest.teardown.js`, and a Supertest smoke test for `GET /api/health`.
- Adjusted `backend/src/config/database.js` so the import-time connection probe is skipped under `NODE_ENV=test`; this prevents Jest from keeping an async connection/logging handle open while preserving normal runtime startup behavior.
- Installed `jest` and `supertest` as backend dev dependencies. `npm install` reported existing audit findings: 10 vulnerabilities total (`1 low`, `2 moderate`, `7 high`); no audit fix was applied in this phase.
- Validation passed with `cd backend && npx jest --runInBand`.
- Startup validation passed with a controlled `cd backend && npm start` run; the process tree was stopped after startup logs confirmed the server was listening.

---

## Phase 2: Database Schema

Purpose: add the durable source of truth with idempotent migration behavior.

### Files

- Create: `backend/src/database/migrations/add_witness_constellation.js`
- Modify: `backend/src/database/init.js` if migrations are called from startup

### Required Schema

#### `users` additions

- [ ] `push_token TEXT`
- [ ] `push_token_updated_at TIMESTAMPTZ`
- [ ] `last_known_latitude DECIMAL(6, 2)`
- [ ] `last_known_longitude DECIMAL(7, 2)`
- [ ] `location_updated_at TIMESTAMPTZ`
- [ ] `location_consent BOOLEAN DEFAULT FALSE`
- [ ] `location_consent_at TIMESTAMPTZ`
- [ ] Pair constraint requiring both latitude and longitude to be null or both non-null.

#### `incident_constellations`

- [ ] `constellation_id SERIAL PRIMARY KEY`
- [ ] `incident_id INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE`
- [ ] `status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'flagged'))`
- [ ] `center_latitude DECIMAL(10, 8) NOT NULL`
- [ ] `center_longitude DECIMAL(11, 8) NOT NULL`
- [ ] `radius_meters INTEGER NOT NULL DEFAULT 500 CHECK (radius_meters > 0)`
- [ ] `opens_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- [ ] `expires_at TIMESTAMPTZ NOT NULL`
- [ ] `confidence_state VARCHAR(30) DEFAULT 'single_report'` with approved enum check.
- [ ] `confidence_score DECIMAL(4, 3) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)`
- [ ] `summary TEXT`
- [ ] `supporting_signals INTEGER DEFAULT 0 CHECK (supporting_signals >= 0)`
- [ ] `contradicting_signals INTEGER DEFAULT 0 CHECK (contradicting_signals >= 0)`
- [ ] `has_unprocessed_changes BOOLEAN DEFAULT FALSE`
- [ ] `ongoing_assessment VARCHAR(20) DEFAULT 'unknown'` with approved enum check.
- [ ] `last_synthesized_at TIMESTAMPTZ`
- [ ] `created_at TIMESTAMPTZ DEFAULT NOW()`
- [ ] `updated_at TIMESTAMPTZ DEFAULT NOW()`

#### `incident_corroborations`

- [ ] `corroboration_id SERIAL PRIMARY KEY`
- [ ] `constellation_id INTEGER NOT NULL REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE`
- [ ] `user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE`
- [ ] `signal_type VARCHAR(30) NOT NULL` with approved signal enum.
- [ ] `note TEXT`
- [ ] `note_flagged_pii BOOLEAN DEFAULT FALSE`
- [ ] `distance_meters INTEGER CHECK (distance_meters IS NULL OR distance_meters >= 0)`
- [ ] `submitted_at TIMESTAMPTZ DEFAULT NOW()`
- [ ] `device_latitude_rounded DECIMAL(6, 2)`
- [ ] `device_longitude_rounded DECIMAL(7, 2)`
- [ ] `UNIQUE (constellation_id, user_id)`

#### `constellation_cluster_links`

- [ ] `id SERIAL PRIMARY KEY`
- [ ] `constellation_id INTEGER NOT NULL REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE`
- [ ] `linked_constellation_id INTEGER NOT NULL REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE`
- [ ] `detected_at TIMESTAMPTZ DEFAULT NOW()`
- [ ] `UNIQUE (constellation_id, linked_constellation_id)`
- [ ] `CHECK (constellation_id < linked_constellation_id)`

### Indexes

- [ ] Unique active constellation index on `incident_constellations(incident_id) WHERE status = 'active'`.
- [ ] Location GiST index for constellation geography point.
- [ ] Expiry index on `incident_constellations(expires_at)`.
- [ ] Corroboration index on `incident_corroborations(constellation_id)`.
- [ ] Cluster-link indexes on both constellation ID columns.

### Validation Gate

- [ ] Run the migration once successfully.
- [ ] Run the migration a second time successfully to prove idempotency.
- [ ] Query `information_schema.columns` for all new columns.
- [ ] Query `pg_constraint` for enum, pair, and cluster-order constraints.
- [ ] Query `pg_indexes` for all required indexes.

---

## Phase 3: User Privacy APIs

Purpose: add consent, coarse location, and push token storage without exposing sensitive data.

### Files

- Modify: `backend/src/services/userService.js`
- Modify: `backend/src/routes/users.js`

### Service Steps

- [ ] Add `updatePushToken(userId, token)`.
- [ ] Validate token is non-empty.
- [ ] Reject token storage with `403` when `location_consent = FALSE`.
- [ ] Save token, `push_token_updated_at = NOW()`, and `updated_at = NOW()`.
- [ ] Add `setLocationConsent(userId, consent)`.
- [ ] When granting consent, set `location_consent = TRUE`, `location_consent_at = NOW()`, and `updated_at = NOW()`.
- [ ] When revoking consent, set consent false and immediately null `last_known_latitude`, `last_known_longitude`, and `location_updated_at`.
- [ ] Add `updateUserLocation(userId, latitude, longitude)`.
- [ ] Reject invalid coordinates.
- [ ] Reject updates when the user has not granted consent.
- [ ] Round latitude and longitude to 2 decimals server-side even if mobile already rounded them.
- [ ] Save rounded values and `location_updated_at = NOW()`.

### Route Steps

- [ ] Add `PATCH /api/users/me/push-token` before dynamic `/:id` routes.
- [ ] Add `PATCH /api/users/me/location-consent` before dynamic `/:id` routes.
- [ ] Add `PATCH /api/users/me/location` before dynamic `/:id` routes.
- [ ] Require authentication for all three routes.
- [ ] Return only `{ status: 'OK' }` on success.
- [ ] Do not return token or location values.

### Test Steps

- [ ] Authenticated, consented token update succeeds.
- [ ] Push-token update without app-level location consent returns `403`.
- [ ] Empty token returns `400`.
- [ ] Location update without consent returns `403`.
- [ ] Location update with consent stores 2-decimal coordinates.
- [ ] Consent revocation clears stored coordinates.
- [ ] Existing user fetch/list endpoints do not return push token or location columns.

### Validation Gate

- [ ] User API tests pass.
- [ ] Manual API checks confirm sensitive columns are never returned.

---

## Phase 4: Backend Constellation Core

Purpose: implement constellation lifecycle and route contracts without ML or remote push dependency.

### Files

- Create: `backend/src/utils/piiScanner.js`
- Create: `backend/src/middleware/optionalAuth.js`
- Create: `backend/src/services/constellationService.js`
- Create: `backend/src/routes/constellations.js`
- Modify: `backend/src/app.js`
- Modify: `backend/src/services/incidentService.js`
- Modify: `backend/src/routes/incidents.js`

### PII Scanner Steps

- [ ] Add a minimal email regex.
- [ ] Add a minimal phone regex.
- [ ] Export `containsPii(text)`.
- [ ] Add unit tests for email, phone, and safe text.

### Optional Auth Steps

- [ ] Add middleware that attaches `req.user` when a valid bearer token is present.
- [ ] Continue anonymously when token is absent or invalid.
- [ ] Never throw from invalid optional auth.

### Public Incident Privacy Steps

- [ ] Keep `GET /api/incidents/:id` public.
- [ ] Use optional auth on the route.
- [ ] Add explicit service methods for public and staff incident reads.
- [ ] Public and non-staff reads return `username = null` and `email = null`.
- [ ] Staff reads may include reporter username and email.
- [ ] Add active and flagged constellation fields to incident detail reads.
- [ ] For flagged constellation detail, non-staff receives status but not confidence state or summary.

### Constellation Service Steps

- [ ] Add constants for staff roles, expiry hours, radius, creation rate limit, and corroboration rate limit.
- [ ] Implement `evaluateEligibility(incident, reporterId)`.
- [ ] Reject drafts.
- [ ] Reject missing coordinates.
- [ ] Reject incidents older than 30 minutes.
- [ ] Reject toxic or abusive incidents.
- [ ] Reject if an active constellation already exists for the incident.
- [ ] Reject if reporter has opened 2 constellations in the last 60 minutes.
- [ ] Implement `createConstellation(incident)`.
- [ ] Implement `openConstellationForIncident(incident, reporterId)` as the only incident-service entrypoint.
- [ ] Implement `isUserInRadius(userId, constellationId)` for read auth only.
- [ ] Implement `getConstellationForUser(constellationId, userId, userRole)`.
- [ ] Staff can read full state.
- [ ] Reporter can read own constellation.
- [ ] Citizen can read only when in radius.
- [ ] Unauthorized or missing objects return `null` so route emits `404`.
- [ ] Flagged citizen/reporter reads return stripped payload only.
- [ ] Non-flagged citizen/reporter reads may include only 2-decimal coarse center coordinates for the witness prompt map anchor, never full-precision constellation coordinates.
- [ ] Implement `submitCorroboration(constellationId, userId, payload)`.
- [ ] Return a not-found result for missing or invalid constellation IDs so the route can emit `404` without leaking object existence.
- [ ] Require active, unexpired constellation.
- [ ] Reject flagged constellations with `409`.
- [ ] Reject expired constellations with `409`.
- [ ] Reject reporter submissions with `403`.
- [ ] Enforce max 10 corroborations per user per hour.
- [ ] Enforce duplicate prevention through DB unique constraint and return `409`.
- [ ] Trim and truncate note to 280 chars.
- [ ] Run PII scanner and toxicity check before persistence.
- [ ] Store raw note with `note_flagged_pii = TRUE` when PII or toxicity is detected.
- [ ] If the toxicity check fails, times out, or returns an invalid shape, persist the corroboration and store the note with `note_flagged_pii = TRUE`.
- [ ] Log toxicity-check failures with corroboration context, but do not include note text in logs.
- [ ] Never expose raw notes from route responses.
- [ ] Round optional device coordinates to 2 decimals.
- [ ] Compute optional distance from rounded device coordinates to constellation center.
- [ ] Mark `has_unprocessed_changes = TRUE` after successful submission.

### Route Steps

- [ ] Add `GET /api/constellations/:id` with required auth.
- [ ] Apply read rate limit of 30 requests per user per minute.
- [ ] Return `401` when unauthenticated.
- [ ] Return `404` for missing or unauthorized object.
- [ ] Return stripped flagged payload for authorized citizen/reporter.
- [ ] Add `POST /api/constellations/:id/corroborate` with required auth.
- [ ] Return `401` when unauthenticated.
- [ ] Return `404` for missing or ineligible constellation IDs.
- [ ] Return `409` for flagged, expired, or duplicate corroboration attempts.
- [ ] Validate `signalType` against the approved enum.
- [ ] Validate optional note length.
- [ ] Validate optional device coordinates.
- [ ] Return created `corroboration_id` only.

### Incident Trigger Steps

- [ ] Import `constellationService` into `incidentService.js`.
- [ ] After successful non-draft incident creation and existing ML analysis, call `openConstellationForIncident` asynchronously.
- [ ] Log skipped reasons at info level.
- [ ] Log failures at error level.
- [ ] Do not block incident creation on constellation failure.

### Test Steps

- [ ] Eligibility accepts a fresh safe incident.
- [ ] Eligibility rejects drafts.
- [ ] Eligibility rejects stale incidents.
- [ ] Eligibility rejects duplicate active constellation.
- [ ] Eligibility rejects creation rate limit.
- [ ] Public incident read strips username and email.
- [ ] Staff incident read includes username and email.
- [ ] Unauthenticated constellation read returns `401`.
- [ ] Unauthorized constellation read returns `404`.
- [ ] Reporter read succeeds.
- [ ] In-radius citizen read succeeds.
- [ ] Flagged authorized citizen read returns stripped payload.
- [ ] Citizen/reporter read never returns full-precision constellation coordinates.
- [ ] Unauthenticated corroboration returns `401`.
- [ ] Missing or ineligible corroboration target returns `404`.
- [ ] Reporter corroboration returns `403`.
- [ ] Flagged corroboration returns `409`.
- [ ] Expired corroboration returns `409`.
- [ ] Duplicate corroboration returns `409`.
- [ ] PII note is stored flagged and not returned.
- [ ] Toxicity-check failure stores the note flagged, excludes it from synthesis, and still accepts the witness signal.

### Validation Gate

- [ ] Backend constellation route tests pass.
- [ ] Manual incident creation still returns the incident even if constellation creation fails.

---

## Phase 5: Synthesis Without And With ML

Purpose: make confidence-state computation reliable before adding Gemini dependency.

### Files

- Create: `backend/src/services/constellationSynthesis.js`
- Modify: `backend/src/services/constellationService.js`
- Modify: `backend/src/utils/mlClient.js`
- Create: `ml-service/services/constellation_synthesis.py`
- Modify: `ml-service/main.py`

### Backend Fallback Steps

- [ ] Implement `computeFallbackState(corroborations, constellation)` as a pure function.
- [ ] Count supporting signals: `saw_something`, `heard_something`.
- [ ] Count contradicting signals: `nothing_unusual`, `already_left`.
- [ ] Count neutral signals: `not_sure`.
- [ ] Return `single_report` for 0 corroborations.
- [ ] Compute score as `supporting / (supporting + contradicting + 0.5 * neutral)`.
- [ ] Check `likely_ended` before generic `mixed_signals` when the majority signal type is `already_left`, or when the majority signal type is `nothing_unusual` and the constellation is more than 60 minutes old.
- [ ] Check `activity_not_confirmed` before generic `mixed_signals` when the majority signal type is `nothing_unusual` and the constellation is not more than 60 minutes old.
- [ ] Check `corroborated` when supporting >= 3, supporting > contradicting, and score >= 0.65.
- [ ] Check `mixed_signals` when contradicting / total >= 0.4.
- [ ] Return score clamped to `[0, 1]` with 3-decimal precision.

### Backend Synthesis Steps

- [ ] Implement `triggerSynthesis(constellationId)`.
- [ ] Load constellation, incident metadata, and corroborations.
- [ ] Replace flagged note text with `null` before ML call.
- [ ] Call `mlClient.synthesizeConstellation(payload)`.
- [ ] Validate ML result enums and numeric score.
- [ ] Fall back to deterministic state when ML fails or returns invalid data.
- [ ] Preserve previous persisted state only if both ML and fallback fail unexpectedly.
- [ ] Evaluate velocity cap from stored rounded device coordinates: 5+ corroborations from the same non-null 2-decimal grid cell within any 60-second window flags the constellation.
- [ ] Before persisting the final state, if ML or backend velocity-cap detection flags an anomaly, set constellation `status = 'flagged'` and do not increase score beyond pre-flag value.
- [ ] Persist confidence state, score, summary, supporting count, contradicting count, ongoing assessment, `last_synthesized_at`, `has_unprocessed_changes = FALSE`, and `updated_at`.
- [ ] Wire successful corroboration submission to call `triggerSynthesis(constellationId)` asynchronously after persistence.
- [ ] Log synthesis failures from the async submission trigger without failing the already-created corroboration.
- [ ] Derive cluster candidates by active constellations within 300 meters and incident times within 30 minutes.
- [ ] Treat backend-derived cluster candidates as the MVP source of truth for persisted cluster links.
- [ ] Log ML-returned `cluster_match_incident_ids` for comparison only; do not persist links directly from those IDs in MVP.
- [ ] Insert cluster links using canonical lower-ID ordering.
- [ ] Never expose cluster links to citizen endpoints.
- [ ] Log whether ML, fallback, or previous state was used.

### ML Client Steps

- [ ] Add `synthesizeConstellation(params)` to `backend/src/utils/mlClient.js`.
- [ ] Return normalized fields from `/constellations/synthesize`.
- [ ] Return `null` on timeout or error.
- [ ] Use the existing ML client timeout conventions.

### ML Service Steps

- [ ] Add Pydantic models for request and response.
- [ ] Add `POST /constellations/synthesize`.
- [ ] Keep `main.py` thin.
- [ ] Put prompt construction, provider call, response normalization, and validation in `ml-service/services/constellation_synthesis.py`.
- [ ] Confirm the Gemini provider method name before calling it.
- [ ] If no safe provider method exists, or the provider fails, return a clear ML-service error so the backend uses its deterministic fallback.
- [ ] Do not implement a second deterministic fallback in the ML service.
- [ ] Instruct the model to check whether non-flagged notes are consistent with their selected `signal_type`.
- [ ] Downweight signals whose non-flagged notes clearly contradict their selected `signal_type`.
- [ ] Instruct the model never to include verbatim note content.
- [ ] Validate output enums before returning.
- [ ] On successful ML responses, include `cluster_match_incident_ids` as an array, even when empty.

### Test Steps

- [ ] Pure fallback returns all expected states.
- [ ] Fallback tests cover `likely_ended` and `activity_not_confirmed` reachability with cases that would otherwise satisfy generic `mixed_signals`.
- [ ] Synthesis excludes flagged note content from ML payload.
- [ ] Invalid ML output falls back deterministically.
- [ ] Successful ML output persists state.
- [ ] ML synthesis prompt covers note/signal consistency and contradictory-note downweighting.
- [ ] Successful corroboration schedules async synthesis after persistence.
- [ ] Backend velocity cap sets constellation status to `flagged`.
- [ ] Anomaly flag freezes the persisted confidence score at or below the pre-flag value.
- [ ] ML-service failure or unavailable provider causes backend deterministic fallback.
- [ ] Cluster links are inserted in canonical order.
- [ ] ML-returned cluster IDs are not persisted directly in MVP.

### Validation Gate

- [ ] Backend synthesis unit tests pass.
- [ ] ML endpoint returns valid JSON for a sample request.
- [ ] Backend works when the ML service is down.

---

## Phase 6: Mobile Witness Flow Without Push

Purpose: build and verify user response flow before remote push delivery.

### Files

- Create: `FinalProject/src/services/constellationAPI.js`
- Create: `FinalProject/src/hooks/useWitnessPromptSubmission.js`
- Create: `FinalProject/src/screens/WitnessPromptScreen.js`
- Modify: `FinalProject/src/navigation/AppNavigator.js`

### API Client Steps

- [ ] Add `submitCorroboration({ constellationId, signalType, note, deviceLatitude, deviceLongitude })`.
- [ ] Trim and truncate note to 280 chars before sending.
- [ ] Return backend response data using existing API-client conventions.
- [ ] Add `getConstellationStatus(constellationId)`.
- [ ] Accept optional 2-decimal coarse coordinates from route params or status payload for the prompt's map anchor.
- [ ] Do not create a feature-specific response wrapper if existing mobile services do not use one.

### Submission Hook Steps

- [ ] Track local `submitting` state.
- [ ] Read optional foreground location permission.
- [ ] If permission exists, get current balanced-accuracy position.
- [ ] Do not request location permission during submit.
- [ ] Submit signal, optional note, and optional device coordinates.
- [ ] Surface backend errors to the screen.

### Screen Steps

- [ ] Add neutral heading.
- [ ] Add a coarse map anchor when 2-decimal coordinates are available.
- [ ] Add approximate-area copy without address or incident details.
- [ ] Add five signal buttons.
- [ ] Add optional single-line note input with max length 280.
- [ ] Add Skip button.
- [ ] Disable submit until a signal is selected.
- [ ] Show loading state while submitting.
- [ ] Navigate back on success.

### Navigation Steps

- [ ] Register `WitnessPromptScreen` in the authenticated app stack.
- [ ] Verify direct manual navigation works with a real `constellationId`.
- [ ] Validate optional coarse coordinate params before rendering the map anchor.
- [ ] Do not wire notification taps yet.

### Validation Gate

- [ ] Manual in-app navigation to `WitnessPromptScreen` works.
- [ ] Successful submission creates one corroboration.
- [ ] Duplicate submission shows a friendly error.
- [ ] Reporter submission shows a friendly forbidden error.

---

## Phase 7: Private Mobile Surfaces

Purpose: surface value to reporters and eligible users before public map changes.

### Files

- Modify: `backend/src/services/incidentService.js`
- Modify: `backend/src/services/statsService.js`
- Modify: `backend/src/routes/stats.js`
- Modify: `FinalProject/src/context/AuthContext.js`
- Modify: `FinalProject/src/hooks/useDashboardData.js`
- Modify: mobile account/settings screen files used by the current app
- Modify: mobile user API service files used by the current app
- Modify: `FinalProject/src/screens/Home/HomeScreen.js`
- Modify: `FinalProject/src/screens/MyReports/ReportItem.js`
- Modify: incident detail screen/modal files used by the current app

### Mobile Location Consent Steps

- [ ] Add or reuse mobile API methods for `PATCH /api/users/me/location-consent` and `PATCH /api/users/me/location`.
- [ ] Prompt for app-level location consent at the chosen feature moment before any background targeting behavior depends on stored location.
- [ ] Request/read OS foreground location only after app-level consent is granted.
- [ ] On authenticated startup and foreground resume, when app consent is true and OS permission is available, read the current position.
- [ ] Round latitude and longitude to 2 decimals before sending them to the backend.
- [ ] Do not send location when app consent is false, OS permission is missing, or the user is unauthenticated.
- [ ] Add Account settings revocation that calls the backend consent endpoint and clears any local consent state.
- [ ] Do not block app startup, dashboard loading, or navigation when location update fails.

### My Reports Steps

- [ ] Add constellation fields to the user's incident list query.
- [ ] Join active, non-expired constellation rows.
- [ ] Do not render flagged constellations as badges.
- [ ] Render `Awaiting corroboration`, `Corroborated by N nearby signals`, or `Mixed nearby responses` from structured fields.
- [ ] Do not show raw notes or witness count beyond aggregate supporting signals.

### Incident Detail Steps

- [ ] Refetch incident detail by ID when opening the detail view, or pass one hydrated source of truth.
- [ ] Do not keep competing `incident` and `fullIncident` state in the modal.
- [ ] Show active constellation summary.
- [ ] Show `Under review` for flagged constellation.
- [ ] Show no badge for expired constellation.
- [ ] Do not show raw witness notes.

### Home Steps

- [ ] Add `getNearbyConstellationsForUser(userId)` to `statsService`.
- [ ] Use consented stored coarse location only.
- [ ] Exclude reporter's own constellations.
- [ ] Exclude already-responded constellations.
- [ ] Exclude flagged and expired constellations.
- [ ] Query only within `CONSTELLATION_RADIUS_METERS`, defaulting to 500 m, for MVP Home prompt count and tappable prompt selection.
- [ ] Do not implement the older spec's 2 km awareness count in MVP.
- [ ] For MVP, return a `firstNearbyConstellationId` only when the user should be able to open the prompt.
- [ ] Add count, first ID, and optional 2-decimal coarse coordinates for the first prompt to dashboard response.
- [ ] Render one Home prompt card when count > 0.
- [ ] Navigate to `WitnessPromptScreen` only when `firstNearbyConstellationId` is present.
- [ ] Pass coarse prompt coordinates to `WitnessPromptScreen` when available.
- [ ] Otherwise render no tappable prompt.

### Validation Gate

- [ ] My Reports shows aggregate constellation status for reporter.
- [ ] Incident Detail shows active and flagged states correctly.
- [ ] Home card opens a real prompt and never navigates with `null`.
- [ ] Account settings revocation clears stored location through the backend endpoint.
- [ ] Startup and foreground resume do not send location when consent is false.
- [ ] No sensitive user location or push token appears in any response.

---

## Phase 8: Push Notification Rollout

Purpose: add remote notification delivery only after token behavior is proven.

### Files

- Create: `backend/src/utils/fcmClient.js`
- Create: `FinalProject/src/services/pushTokenService.js`
- Create: `FinalProject/src/hooks/useWitnessPromptNotifications.js`
- Modify: `FinalProject/src/context/AuthContext.js`
- Modify: `FinalProject/src/navigation/AppNavigator.js`
- Modify: `backend/src/services/constellationService.js`
- Modify package files as needed

### Token Verification Steps

- [ ] Install `expo-notifications` if absent.
- [ ] On an Android device, call `Notifications.getDevicePushTokenAsync()` and confirm token type/value.
- [ ] Send a test notification through the intended backend path to Android.
- [ ] Do not add iOS token verification or APNs-specific behavior; iOS is out of scope for this project.

### Backend FCM Steps

- [ ] Add `firebase-admin` dependency.
- [ ] Initialize admin SDK from `FIREBASE_SERVICE_ACCOUNT_JSON`.
- [ ] No-op safely when credentials are absent in dev/test.
- [ ] Send neutral title/body only.
- [ ] Include only `type`, `constellation_id`, and 2-decimal coarse coordinates in data.
- [ ] Log token prefix only, never full token.

### Mobile Registration Steps

- [ ] Request notification permission at the appropriate app moment.
- [ ] Register push token only after authentication and app-level location consent are both confirmed.
- [ ] Do not request notification permission or read a device push token while app-level location consent is false.
- [ ] Use `Notifications.getDevicePushTokenAsync()`; do not use `Notifications.getExpoPushTokenAsync()`.
- [ ] Send `{ token }` to backend.
- [ ] Listen for push token refresh and update backend.
- [ ] Ignore token refresh events while app-level location consent is false.
- [ ] Do not block app startup if registration fails.

### Targeting Steps

- [ ] Implement `notifyNearbyUsers(constellation)`.
- [ ] Query users with `push_token IS NOT NULL`.
- [ ] Require `push_token_updated_at > NOW() - INTERVAL '7 days'`.
- [ ] Require `location_consent = TRUE`.
- [ ] Require `location_updated_at > NOW() - INTERVAL '24 hours'`.
- [ ] Require users to be in constellation radius, not the reporter, and not suspended.
- [ ] Limit targets to 200.
- [ ] Send notifications asynchronously after constellation creation.
- [ ] Log sent/skipped count.
- [ ] Do not fail incident creation when push dispatch fails.

### Notification Navigation Steps

- [ ] Add `useWitnessPromptNotifications`.
- [ ] Parse only `type = witness_prompt` and valid integer `constellation_id`.
- [ ] Parse optional 2-decimal `coarse_latitude` and `coarse_longitude` values from notification data.
- [ ] Queue cold-start notification response until navigation is ready and user is authenticated.
- [ ] Avoid processing the same last notification response repeatedly.
- [ ] Navigate to `WitnessPromptScreen` only with a valid constellation ID and pass validated coarse coordinates when present.

### Validation Gate

- [ ] Android receives and opens witness prompt.
- [ ] Notification payload contains no incident category, address, reporter, or exact coordinates.

---

## Phase 9: Map Surface

Purpose: add public-facing confidence rendering only after private flows and moderation rules are stable.

### Files

- Modify: `backend/src/services/mapService.js`
- Modify: `backend/src/routes/map.js`
- Modify: `FinalProject/src/services/incidentAPI.js`
- Modify: `FinalProject/src/screens/Map/MapScreen.js`
- Modify: `FinalProject/src/screens/Map/IncidentMapDetail.js` if present

### Backend Steps

- [ ] Add optional `include_constellation=true` query handling.
- [ ] Join only `status = 'active'` and `expires_at > NOW()` constellations.
- [ ] Do not join flagged constellations.
- [ ] Return only confidence state, score, and supporting signal count.
- [ ] Do not return constellation notes, witness IDs, reporter IDs, or cluster links.
- [ ] Preserve existing map status filters unless a product decision explicitly broadens them.

### Mobile Steps

- [ ] Pass `include_constellation=true` from map fetch.
- [ ] Render ring only for `confidence_state = 'corroborated'`.
- [ ] Use opacity based on confidence score.
- [ ] Render no ring for `single_report`, `mixed_signals`, flagged, or expired rows.
- [ ] Keep incident detail copy aggregate-only.

### Validation Gate

- [ ] Map loads with and without constellation data.
- [ ] Corroborated incident displays a subtle ring.
- [ ] Flagged constellation does not render on map.
- [ ] Public map response contains no sensitive fields.

---

## Phase 10: Maintenance, Retention, And Final Test Pass

Purpose: make the feature operationally safe.

### Files

- Create: `backend/src/jobs/constellationMaintenance.js`
- Modify: `backend/src/index.js`
- Add or modify backend tests as needed

### Maintenance Steps

- [ ] Add `markExpiredConstellations()`.
- [ ] Mark active rows with `expires_at <= NOW()` as `expired`.
- [ ] Add `runPendingConstellationSynthesis()`.
- [ ] Find active, unexpired rows with `has_unprocessed_changes = TRUE`.
- [ ] Synthesize at most 100 rows per sweep.
- [ ] Add `clearStaleUserLocations()`.
- [ ] Clear user coordinates when `location_updated_at < NOW() - INTERVAL '30 days'`.
- [ ] Add `runConstellationMaintenance()`.
- [ ] Add `startConstellationMaintenance()` with 5-minute synthesis/expiry interval and 24-hour location cleanup interval.
- [ ] Register startup once in `backend/src/index.js` after database readiness.
- [ ] Document that the interval assumes a single backend instance. Add locking before horizontal scale.

### Test Coverage Checklist

- [ ] Migration idempotency.
- [ ] User consent grant/revoke.
- [ ] Location update requires consent.
- [ ] Push-token update requires app-level location consent.
- [ ] Sensitive columns not exposed.
- [ ] Public incident strips reporter identity.
- [ ] Staff incident read keeps reporter identity.
- [ ] Constellation eligibility.
- [ ] Creation rate limit.
- [ ] Read auth anti-enumeration.
- [ ] Flagged visibility matrix.
- [ ] Corroboration duplicate prevention.
- [ ] Reporter exclusion.
- [ ] Expiry write gate.
- [ ] Corroboration rate limit.
- [ ] PII/toxicity flagging.
- [ ] Toxicity-check failures flag note content without rejecting the witness signal.
- [ ] Flagged notes excluded from ML payload.
- [ ] Deterministic fallback states.
- [ ] ML failure fallback.
- [ ] Anomaly flagging.
- [ ] Cluster-link canonical insert.
- [ ] Maintenance expiry.
- [ ] Maintenance synthesis sweep.
- [ ] Location retention cleanup.

### Manual Privacy Checklist

- [ ] Notification copy is neutral.
- [ ] Notification payload has no address, category, reporter identity, or exact location.
- [ ] Witness screen does not show incident details that could identify the reporter or victim.
- [ ] Raw notes never appear in citizen UI.
- [ ] Reporter sees only aggregate constellation status.
- [ ] Map does not show flagged constellations.
- [ ] Home prompt does not open unavailable or unauthorized objects.
- [ ] Account settings can revoke location consent and immediately clear stored location.
- [ ] Push notification registration is not attempted before app-level location consent.

### Validation Gate

- [ ] Backend tests pass.
- [ ] ML service endpoint smoke test passes.
- [ ] Mobile app starts without navigation errors.
- [ ] Manual witness submission works end-to-end.
- [ ] Manual privacy checklist passes.

---

## Suggested Commit Order

- [ ] `test: extract backend app for route testing`
- [ ] `feat: add witness constellation database schema`
- [ ] `feat: add user push token and location consent APIs`
- [ ] `fix: strip reporter identity from public incident detail`
- [ ] `feat: add constellation lifecycle routes and service`
- [ ] `feat: add deterministic constellation synthesis`
- [ ] `feat: add ML constellation synthesis endpoint`
- [ ] `feat: add mobile witness prompt flow`
- [ ] `feat: show constellation status on private mobile surfaces`
- [ ] `feat: add witness push notification delivery`
- [ ] `feat: render corroborated constellation state on map`
- [ ] `feat: add constellation maintenance jobs`
- [ ] `test: cover constellation privacy authz and synthesis behavior`

## Definition Of Done

- [ ] A fresh eligible incident opens one active constellation.
- [ ] Nearby opted-in users can submit one response.
- [ ] Reporter cannot submit to their own constellation.
- [ ] Duplicate responses are rejected.
- [ ] Confidence state updates through ML when available and fallback when unavailable.
- [ ] My Reports, Incident Detail, Home, and Map render only allowed aggregate state.
- [ ] Flagged constellations follow the visibility matrix.
- [ ] Reporter identity is stripped from public incident reads.
- [ ] Push tokens and user locations never appear in API responses.
- [ ] Push-token registration requires app-level location consent.
- [ ] Expired constellations stop accepting writes and disappear from public surfaces.
- [ ] Automated tests cover the security and privacy behaviors listed above.
