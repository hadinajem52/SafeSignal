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

- [x] `push_token TEXT`
- [x] `push_token_updated_at TIMESTAMPTZ`
- [x] `last_known_latitude DECIMAL(6, 2)`
- [x] `last_known_longitude DECIMAL(7, 2)`
- [x] `location_updated_at TIMESTAMPTZ`
- [x] `location_consent BOOLEAN DEFAULT FALSE`
- [x] `location_consent_at TIMESTAMPTZ`
- [x] Pair constraint requiring both latitude and longitude to be null or both non-null.

#### `incident_constellations`

- [x] `constellation_id SERIAL PRIMARY KEY`
- [x] `incident_id INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE`
- [x] `status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'flagged'))`
- [x] `center_latitude DECIMAL(10, 8) NOT NULL`
- [x] `center_longitude DECIMAL(11, 8) NOT NULL`
- [x] `radius_meters INTEGER NOT NULL DEFAULT 500 CHECK (radius_meters > 0)`
- [x] `opens_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- [x] `expires_at TIMESTAMPTZ NOT NULL`
- [x] `confidence_state VARCHAR(30) DEFAULT 'single_report'` with approved enum check.
- [x] `confidence_score DECIMAL(4, 3) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)`
- [x] `summary TEXT`
- [x] `supporting_signals INTEGER DEFAULT 0 CHECK (supporting_signals >= 0)`
- [x] `contradicting_signals INTEGER DEFAULT 0 CHECK (contradicting_signals >= 0)`
- [x] `has_unprocessed_changes BOOLEAN DEFAULT FALSE`
- [x] `ongoing_assessment VARCHAR(20) DEFAULT 'unknown'` with approved enum check.
- [x] `last_synthesized_at TIMESTAMPTZ`
- [x] `created_at TIMESTAMPTZ DEFAULT NOW()`
- [x] `updated_at TIMESTAMPTZ DEFAULT NOW()`

#### `incident_corroborations`

- [x] `corroboration_id SERIAL PRIMARY KEY`
- [x] `constellation_id INTEGER NOT NULL REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE`
- [x] `user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE`
- [x] `signal_type VARCHAR(30) NOT NULL` with approved signal enum.
- [x] `note TEXT`
- [x] `note_flagged_pii BOOLEAN DEFAULT FALSE`
- [x] `distance_meters INTEGER CHECK (distance_meters IS NULL OR distance_meters >= 0)`
- [x] `submitted_at TIMESTAMPTZ DEFAULT NOW()`
- [x] `device_latitude_rounded DECIMAL(6, 2)`
- [x] `device_longitude_rounded DECIMAL(7, 2)`
- [x] `UNIQUE (constellation_id, user_id)`

#### `constellation_cluster_links`

- [x] `id SERIAL PRIMARY KEY`
- [x] `constellation_id INTEGER NOT NULL REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE`
- [x] `linked_constellation_id INTEGER NOT NULL REFERENCES incident_constellations(constellation_id) ON DELETE CASCADE`
- [x] `detected_at TIMESTAMPTZ DEFAULT NOW()`
- [x] `UNIQUE (constellation_id, linked_constellation_id)`
- [x] `CHECK (constellation_id < linked_constellation_id)`

### Indexes

- [x] Unique active constellation index on `incident_constellations(incident_id) WHERE status = 'active'`.
- [x] Location GiST index for constellation geography point.
- [x] Expiry index on `incident_constellations(expires_at)`.
- [x] Corroboration index on `incident_corroborations(constellation_id)`.
- [x] Cluster-link indexes on both constellation ID columns.

### Validation Gate

- [x] Run the migration once successfully.
- [x] Run the migration a second time successfully to prove idempotency.
- [x] Query `information_schema.columns` for all new columns.
- [x] Query `pg_constraint` for enum, pair, and cluster-order constraints.
- [x] Query `pg_indexes` for all required indexes.

### Phase 2 Notes - 2026-05-02

- Added `backend/src/database/migrations/add_witness_constellation.js` as a standalone idempotent migration and `db:migrate:witness-constellation` in `backend/package.json`.
- Did not modify `backend/src/database/init.js` because the current backend does not have a startup migration runner; migrations are run explicitly through npm scripts.
- The migration adds user consent/location/token columns, creates `incident_constellations`, `incident_corroborations`, and `constellation_cluster_links`, and creates all required checks and indexes.
- Approved enum values came from `docs/superpowers/specs/2026-04-04-witness-constellation-design.md`: confidence states `single_report`, `corroborated`, `mixed_signals`, `activity_not_confirmed`, `likely_ended`; ongoing assessments `ongoing`, `likely_ended`, `unknown`, `unclear`; signal types `saw_something`, `heard_something`, `nothing_unusual`, `not_sure`, `already_left`.
- Validation passed: the migration ran successfully twice, schema queries found no missing required columns, constraints, or indexes, and `cd backend && npx jest --runInBand` still passed.

---

## Phase 3: User Privacy APIs

Purpose: add consent, coarse location, and push token storage without exposing sensitive data.

### Files

- Modify: `backend/src/services/userService.js`
- Modify: `backend/src/routes/users.js`

### Service Steps

- [x] Add `updatePushToken(userId, token)`.
- [x] Validate token is non-empty.
- [x] Reject token storage with `403` when `location_consent = FALSE`.
- [x] Save token, `push_token_updated_at = NOW()`, and `updated_at = NOW()`.
- [x] Add `setLocationConsent(userId, consent)`.
- [x] When granting consent, set `location_consent = TRUE`, `location_consent_at = NOW()`, and `updated_at = NOW()`.
- [x] When revoking consent, set consent false and immediately null `last_known_latitude`, `last_known_longitude`, and `location_updated_at`.
- [x] Add `updateUserLocation(userId, latitude, longitude)`.
- [x] Reject invalid coordinates.
- [x] Reject updates when the user has not granted consent.
- [x] Round latitude and longitude to 2 decimals server-side even if mobile already rounded them.
- [x] Save rounded values and `location_updated_at = NOW()`.

### Route Steps

- [x] Add `PATCH /api/users/me/push-token` before dynamic `/:id` routes.
- [x] Add `PATCH /api/users/me/location-consent` before dynamic `/:id` routes.
- [x] Add `PATCH /api/users/me/location` before dynamic `/:id` routes.
- [x] Require authentication for all three routes.
- [x] Return only `{ status: 'OK' }` on success.
- [x] Do not return token or location values.

### Test Steps

- [x] Authenticated, consented token update succeeds.
- [x] Push-token update without app-level location consent returns `403`.
- [x] Empty token returns `400`.
- [x] Location update without consent returns `403`.
- [x] Location update with consent stores 2-decimal coordinates.
- [x] Consent revocation clears stored coordinates.
- [x] Existing user fetch/list endpoints do not return push token or location columns.

### Validation Gate

- [x] User API tests pass.
- [x] Manual API checks confirm sensitive columns are never returned.

### Phase 3 Notes - 2026-05-02

- Added `updatePushToken`, `setLocationConsent`, and `updateUserLocation` to `backend/src/services/userService.js` with boundary validation and consent checks.
- Added authenticated `PATCH /api/users/me/push-token`, `PATCH /api/users/me/location-consent`, and `PATCH /api/users/me/location` before dynamic `/:id` routes in `backend/src/routes/users.js`.
- Successful privacy route responses return only `{ status: 'OK' }`; token and location values are never returned from these routes.
- Existing `getAllUsers` and `getUserById` still select and format only non-sensitive fields, so new token/location columns are not exposed by list/detail endpoints.
- Added focused Jest coverage in `backend/tests/userService.privacy.test.js` and `backend/tests/users.routes.privacy.test.js` for consent-gated token/location storage, coordinate rounding, revocation clearing coordinates, route ordering, and sensitive response filtering.
- Validation passed with `cd backend && npx jest --runInBand`.
- Manual API privacy check passed using temporary local DB users and Supertest against the real app: granted consent, updated location, stored a push token, fetched user detail/list as admin, confirmed sensitive keys were absent, and deleted the temporary users afterward.

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

- [x] Add a minimal email regex.
- [x] Add a minimal phone regex.
- [x] Export `containsPii(text)`.
- [x] Add unit tests for email, phone, and safe text.

### Optional Auth Steps

- [x] Add middleware that attaches `req.user` when a valid bearer token is present.
- [x] Continue anonymously when token is absent or invalid.
- [x] Never throw from invalid optional auth.

### Public Incident Privacy Steps

- [x] Keep `GET /api/incidents/:id` public.
- [x] Use optional auth on the route.
- [x] Add explicit service methods for public and staff incident reads.
- [x] Public and non-staff reads return `username = null` and `email = null`.
- [x] Staff reads may include reporter username and email.
- [x] Add active and flagged constellation fields to incident detail reads.
- [x] For flagged constellation detail, non-staff receives status but not confidence state or summary.

### Constellation Service Steps

- [x] Add constants for staff roles, expiry hours, radius, creation rate limit, and corroboration rate limit.
- [x] Implement `evaluateEligibility(incident, reporterId)`.
- [x] Reject drafts.
- [x] Reject missing coordinates.
- [x] Reject incidents older than 30 minutes.
- [x] Reject toxic or abusive incidents.
- [x] Reject if an active constellation already exists for the incident.
- [x] Reject if reporter has opened 2 constellations in the last 60 minutes.
- [x] Implement `createConstellation(incident)`.
- [x] Implement `openConstellationForIncident(incident, reporterId)` as the only incident-service entrypoint.
- [x] Implement `isUserInRadius(userId, constellationId)` for read auth only.
- [x] Implement `getConstellationForUser(constellationId, userId, userRole)`.
- [x] Staff can read full state.
- [x] Reporter can read own constellation.
- [x] Citizen can read only when in radius.
- [x] Unauthorized or missing objects return `null` so route emits `404`.
- [x] Flagged citizen/reporter reads return stripped payload only.
- [x] Non-flagged citizen/reporter reads may include only 2-decimal coarse center coordinates for the witness prompt map anchor, never full-precision constellation coordinates.
- [x] Implement `submitCorroboration(constellationId, userId, payload)`.
- [x] Return a not-found result for missing or invalid constellation IDs so the route can emit `404` without leaking object existence.
- [x] Require active, unexpired constellation.
- [x] Reject flagged constellations with `409`.
- [x] Reject expired constellations with `409`.
- [x] Reject reporter submissions with `403`.
- [x] Enforce max 10 corroborations per user per hour.
- [x] Enforce duplicate prevention through DB unique constraint and return `409`.
- [x] Trim and truncate note to 280 chars.
- [x] Run PII scanner and toxicity check before persistence.
- [x] Store raw note with `note_flagged_pii = TRUE` when PII or toxicity is detected.
- [x] If the toxicity check fails, times out, or returns an invalid shape, persist the corroboration and store the note with `note_flagged_pii = TRUE`.
- [x] Log toxicity-check failures with corroboration context, but do not include note text in logs.
- [x] Never expose raw notes from route responses.
- [x] Round optional device coordinates to 2 decimals.
- [x] Compute optional distance from rounded device coordinates to constellation center.
- [x] Mark `has_unprocessed_changes = TRUE` after successful submission.

### Route Steps

- [x] Add `GET /api/constellations/:id` with required auth.
- [x] Apply read rate limit of 30 requests per user per minute.
- [x] Return `401` when unauthenticated.
- [x] Return `404` for missing or unauthorized object.
- [x] Return stripped flagged payload for authorized citizen/reporter.
- [x] Add `POST /api/constellations/:id/corroborate` with required auth.
- [x] Return `401` when unauthenticated.
- [x] Return `404` for missing or ineligible constellation IDs.
- [x] Return `409` for flagged, expired, or duplicate corroboration attempts.
- [x] Validate `signalType` against the approved enum.
- [x] Validate optional note length.
- [x] Validate optional device coordinates.
- [x] Return created `corroboration_id` only.

### Incident Trigger Steps

- [x] Import `constellationService` into `incidentService.js`.
- [x] After successful non-draft incident creation and existing ML analysis, call `openConstellationForIncident` asynchronously.
- [x] Log skipped reasons at info level.
- [x] Log failures at error level.
- [x] Do not block incident creation on constellation failure.

### Test Steps

- [x] Eligibility accepts a fresh safe incident.
- [x] Eligibility rejects drafts.
- [x] Eligibility rejects stale incidents.
- [x] Eligibility rejects duplicate active constellation.
- [x] Eligibility rejects creation rate limit.
- [x] Public incident read strips username and email.
- [x] Staff incident read includes username and email.
- [x] Unauthenticated constellation read returns `401`.
- [x] Unauthorized constellation read returns `404`.
- [x] Reporter read succeeds.
- [x] In-radius citizen read succeeds.
- [x] Flagged authorized citizen read returns stripped payload.
- [x] Citizen/reporter read never returns full-precision constellation coordinates.
- [x] Unauthenticated corroboration returns `401`.
- [x] Missing or ineligible corroboration target returns `404`.
- [x] Reporter corroboration returns `403`.
- [x] Flagged corroboration returns `409`.
- [x] Expired corroboration returns `409`.
- [x] Duplicate corroboration returns `409`.
- [x] PII note is stored flagged and not returned.
- [x] Toxicity-check failure stores the note flagged, excludes it from synthesis, and still accepts the witness signal.

### Validation Gate

- [x] Backend constellation route tests pass.
- [x] Manual incident creation still returns the incident even if constellation creation fails.

### Phase 4 Notes - 2026-05-02

- Added `backend/src/utils/piiScanner.js` with minimal email and phone detection plus unit coverage.
- Added `backend/src/middleware/optionalAuth.js` and applied it to public incident detail reads so staff tokens can unlock staff detail while absent or invalid tokens stay anonymous.
- Added `backend/src/services/constellationService.js` for eligibility, creation, read authorization, and corroboration writes without ML synthesis or remote push dispatch.
- Added `backend/src/routes/constellations.js` and mounted it under `/api/constellations` with authenticated read/write routes and per-user read rate limiting.
- Incident detail reads now use explicit public/staff service methods. Public and non-staff reads null reporter username/email; staff reads can include them.
- Active or flagged constellation metadata is joined into incident detail reads. Non-staff flagged details are stripped to status-level data only.
- Corroboration writes store raw notes, flag PII/toxic/unknown-toxicity notes with `note_flagged_pii = TRUE`, return only `corroboration_id`, and never expose notes in route responses.
- Incident creation now schedules constellation opening asynchronously after existing incident processing; skipped reasons are logged at info level and failures at error level without blocking the incident response.
- Validation passed with `cd backend && npx jest --runInBand`.
- Manual Supertest check passed against the local app/database by forcing constellation opening to fail and confirming `POST /api/incidents` still returned `201` with an incident payload.
- Synthesis itself remains Phase 5 work; Phase 4 stores `note_flagged_pii` so Phase 5 can exclude flagged notes from synthesis inputs.

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

- [x] Implement `computeFallbackState(corroborations, constellation)` as a pure function.
- [x] Count supporting signals: `saw_something`, `heard_something`.
- [x] Count contradicting signals: `nothing_unusual`, `already_left`.
- [x] Count neutral signals: `not_sure`.
- [x] Return `single_report` for 0 corroborations.
- [x] Compute score as `supporting / (supporting + contradicting + 0.5 * neutral)`.
- [x] Check `likely_ended` before generic `mixed_signals` when the majority signal type is `already_left`, or when the majority signal type is `nothing_unusual` and the constellation is more than 60 minutes old.
- [x] Check `activity_not_confirmed` before generic `mixed_signals` when the majority signal type is `nothing_unusual` and the constellation is not more than 60 minutes old.
- [x] Check `corroborated` when supporting >= 3, supporting > contradicting, and score >= 0.65.
- [x] Check `mixed_signals` when contradicting / total >= 0.4.
- [x] Return score clamped to `[0, 1]` with 3-decimal precision.

### Backend Synthesis Steps

- [x] Implement `triggerSynthesis(constellationId)`.
- [x] Load constellation, incident metadata, and corroborations.
- [x] Replace flagged note text with `null` before ML call.
- [x] Call `mlClient.synthesizeConstellation(payload)`.
- [x] Validate ML result enums and numeric score.
- [x] Fall back to deterministic state when ML fails or returns invalid data.
- [x] Preserve previous persisted state only if both ML and fallback fail unexpectedly.
- [x] Evaluate velocity cap from stored rounded device coordinates: 5+ corroborations from the same non-null 2-decimal grid cell within any 60-second window flags the constellation.
- [x] Before persisting the final state, if ML or backend velocity-cap detection flags an anomaly, set constellation `status = 'flagged'` and do not increase score beyond pre-flag value.
- [x] Persist confidence state, score, summary, supporting count, contradicting count, ongoing assessment, `last_synthesized_at`, `has_unprocessed_changes = FALSE`, and `updated_at`.
- [x] Wire successful corroboration submission to call `triggerSynthesis(constellationId)` asynchronously after persistence.
- [x] Log synthesis failures from the async submission trigger without failing the already-created corroboration.
- [x] Derive cluster candidates by active constellations within 300 meters and incident times within 30 minutes.
- [x] Treat backend-derived cluster candidates as the MVP source of truth for persisted cluster links.
- [x] Log ML-returned `cluster_match_incident_ids` for comparison only; do not persist links directly from those IDs in MVP.
- [x] Insert cluster links using canonical lower-ID ordering.
- [x] Never expose cluster links to citizen endpoints.
- [x] Log whether ML, fallback, or previous state was used.

### ML Client Steps

- [x] Add `synthesizeConstellation(params)` to `backend/src/utils/mlClient.js`.
- [x] Return normalized fields from `/constellations/synthesize`.
- [x] Return `null` on timeout or error.
- [x] Use the existing ML client timeout conventions.

### ML Service Steps

- [x] Add Pydantic models for request and response.
- [x] Add `POST /constellations/synthesize`.
- [x] Keep `main.py` thin.
- [x] Put prompt construction, provider call, response normalization, and validation in `ml-service/services/constellation_synthesis.py`.
- [x] Confirm the Gemini provider method name before calling it.
- [x] If no safe provider method exists, or the provider fails, return a clear ML-service error so the backend uses its deterministic fallback.
- [x] Do not implement a second deterministic fallback in the ML service.
- [x] Instruct the model to check whether non-flagged notes are consistent with their selected `signal_type`.
- [x] Downweight signals whose non-flagged notes clearly contradict their selected `signal_type`.
- [x] Instruct the model never to include verbatim note content.
- [x] Validate output enums before returning.
- [x] On successful ML responses, include `cluster_match_incident_ids` as an array, even when empty.

### Test Steps

- [x] Pure fallback returns all expected states.
- [x] Fallback tests cover `likely_ended` and `activity_not_confirmed` reachability with cases that would otherwise satisfy generic `mixed_signals`.
- [x] Synthesis excludes flagged note content from ML payload.
- [x] Invalid ML output falls back deterministically.
- [x] Successful ML output persists state.
- [x] ML synthesis prompt covers note/signal consistency and contradictory-note downweighting.
- [x] Successful corroboration schedules async synthesis after persistence.
- [x] Backend velocity cap sets constellation status to `flagged`.
- [x] Anomaly flag freezes the persisted confidence score at or below the pre-flag value.
- [x] ML-service failure or unavailable provider causes backend deterministic fallback.
- [x] Cluster links are inserted in canonical order.
- [x] ML-returned cluster IDs are not persisted directly in MVP.

### Validation Gate

- [x] Backend synthesis unit tests pass.
- [x] ML endpoint returns valid JSON for a sample request.
- [x] Backend works when the ML service is down.

### Phase 5 Notes - 2026-05-02

- Added `backend/src/services/constellationSynthesis.js` with pure fallback state computation, ML-result validation, fallback/previous-state source selection, velocity-cap anomaly detection, state persistence, and backend-derived cluster-link persistence.
- Wired successful corroboration persistence in `backend/src/services/constellationService.js` to schedule `triggerSynthesis(constellationId)` asynchronously and log failures without failing the already-created corroboration.
- Added `mlClient.synthesizeConstellation(params)` in `backend/src/utils/mlClient.js`; it follows existing timeout/error conventions and returns `null` on failures.
- Added `ml-service/services/constellation_synthesis.py` and `POST /constellations/synthesize` in `ml-service/main.py` with Pydantic request/response models and thin endpoint delegation.
- Added a safe Gemini provider method named `synthesize_constellation`; local/no-LLM providers return unavailable so the backend deterministic fallback remains the source of fallback behavior.
- Added tests in `backend/tests/constellationSynthesis.test.js`, updated `backend/tests/constellationService.test.js`, and added `ml-service/tests/test_constellation_synthesis.py`.
- Validation passed with `cd backend && npx jest --runInBand`.
- Validation passed for the new ML-service synthesis tests with `cd ml-service && python -m unittest discover -s tests -p test_constellation_synthesis.py`.
- ML synthesis endpoint sample returned valid response JSON by invoking `main.synthesize_constellation(...)` with a stubbed provider in the local environment.
- Full ML-service test discovery was not clean because existing unrelated tests fail in this environment: `test_cache.py` prints characters unsupported by the Windows `cp1252` console, and `test_insights.py` hits an existing `google.protobuf` import issue after its Google module stub.

---

## Phase 6: Mobile Witness Flow Without Push

Purpose: build and verify user response flow before remote push delivery.

### Files

- Create: `FinalProject/src/services/constellationAPI.js`
- Create: `FinalProject/src/hooks/useWitnessPromptSubmission.js`
- Create: `FinalProject/src/screens/WitnessPromptScreen.js`
- Modify: `FinalProject/src/navigation/AppNavigator.js`

### API Client Steps

- [x] Add `submitCorroboration({ constellationId, signalType, note, deviceLatitude, deviceLongitude })`.
- [x] Trim and truncate note to 280 chars before sending.
- [x] Return backend response data using existing API-client conventions.
- [x] Add `getConstellationStatus(constellationId)`.
- [x] Accept optional 2-decimal coarse coordinates from route params or status payload for the prompt's map anchor.
- [x] Do not create a feature-specific response wrapper if existing mobile services do not use one.

### Submission Hook Steps

- [x] Track local `submitting` state.
- [x] Read optional foreground location permission.
- [x] If permission exists, get current balanced-accuracy position.
- [x] Do not request location permission during submit.
- [x] Submit signal, optional note, and optional device coordinates.
- [x] Surface backend errors to the screen.

### Screen Steps

- [x] Add neutral heading.
- [x] Add a coarse map anchor when 2-decimal coordinates are available.
- [x] Add approximate-area copy without address or incident details.
- [x] Add five signal buttons.
- [x] Add optional single-line note input with max length 280.
- [x] Add Skip button.
- [x] Disable submit until a signal is selected.
- [x] Show loading state while submitting.
- [x] Navigate back on success.

### Navigation Steps

- [x] Register `WitnessPromptScreen` in the authenticated app stack.
- [ ] Verify direct manual navigation works with a real `constellationId`.
- [x] Validate optional coarse coordinate params before rendering the map anchor.
- [x] Do not wire notification taps yet.

### Validation Gate

- [ ] Manual in-app navigation to `WitnessPromptScreen` works.
- [ ] Successful submission creates one corroboration.
- [ ] Duplicate submission shows a friendly error.
- [ ] Reporter submission shows a friendly forbidden error.

### Phase 6 Notes - 2026-05-02

- Added `Mobile-part/src/services/constellationAPI.js` with `submitCorroboration` and `getConstellationStatus`, using the existing `{ success, data/error }` mobile API convention.
- Added `Mobile-part/src/hooks/useWitnessPromptSubmission.js` with local `submitting` state, optional foreground-permission-only location read, balanced-accuracy coordinates when permission already exists, and backend error surfacing.
- Added `Mobile-part/src/screens/WitnessPromptScreen.js` with neutral prompt copy, optional coarse map anchor, five signal buttons, optional max-280 note input, skip action, disabled submit until signal selection, loading states, and success navigation back.
- Registered `WitnessPromptScreen` in the authenticated app stack in `Mobile-part/src/navigation/AppNavigator.js`.
- Notification tap wiring remains intentionally deferred.
- Syntax validation passed for the new/modified mobile files with Babel parser.
- Manual in-app validation is still pending because no emulator/device session was run in this step.

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

- [x] Add or reuse mobile API methods for `PATCH /api/users/me/location-consent` and `PATCH /api/users/me/location`.
- [x] Prompt for app-level location consent at the chosen feature moment before any background targeting behavior depends on stored location.
- [x] Request/read OS foreground location only after app-level consent is granted.
- [x] On authenticated startup and foreground resume, when app consent is true and OS permission is available, read the current position.
- [x] Round latitude and longitude to 2 decimals before sending them to the backend.
- [x] Do not send location when app consent is false, OS permission is missing, or the user is unauthenticated.
- [x] Add Account settings revocation that calls the backend consent endpoint and clears any local consent state.
- [x] Do not block app startup, dashboard loading, or navigation when location update fails.

### My Reports Steps

- [x] Add constellation fields to the user's incident list query.
- [x] Join active, non-expired constellation rows.
- [x] Do not render flagged constellations as badges.
- [x] Render `Awaiting corroboration`, `Corroborated by N nearby signals`, or `Mixed nearby responses` from structured fields.
- [x] Do not show raw notes or witness count beyond aggregate supporting signals.

### Incident Detail Steps

- [x] Refetch incident detail by ID when opening the detail view, or pass one hydrated source of truth.
- [x] Do not keep competing `incident` and `fullIncident` state in the modal.
- [x] Show active constellation summary.
- [x] Show `Under review` for flagged constellation.
- [x] Show no badge for expired constellation.
- [x] Do not show raw witness notes.

### Home Steps

- [x] Add `getNearbyConstellationsForUser(userId)` to `statsService`.
- [x] Use consented stored coarse location only.
- [x] Exclude reporter's own constellations.
- [x] Exclude already-responded constellations.
- [x] Exclude flagged and expired constellations.
- [x] Query only within `CONSTELLATION_RADIUS_METERS`, defaulting to 500 m, for MVP Home prompt count and tappable prompt selection.
- [x] Do not implement the older spec's 2 km awareness count in MVP.
- [x] For MVP, return a `firstNearbyConstellationId` only when the user should be able to open the prompt.
- [x] Add count, first ID, and optional 2-decimal coarse coordinates for the first prompt to dashboard response.
- [x] Render one Home prompt card when count > 0.
- [x] Navigate to `WitnessPromptScreen` only when `firstNearbyConstellationId` is present.
- [x] Pass coarse prompt coordinates to `WitnessPromptScreen` when available.
- [x] Otherwise render no tappable prompt.

### Validation Gate

- [ ] My Reports shows aggregate constellation status for reporter.
- [ ] Incident Detail shows active and flagged states correctly.
- [ ] Home card opens a real prompt and never navigates with `null`.
- [ ] Account settings revocation clears stored location through the backend endpoint.
- [ ] Startup and foreground resume do not send location when consent is false.
- [ ] No sensitive user location or push token appears in any response.

### Phase 7 Notes - 2026-05-02

- Added `Mobile-part/src/services/userAPI.js` with `setLocationConsent` and `updateLocation` methods for the Phase 3 user privacy endpoints.
- Changed mobile default `locationServices` preference to `false` so app-level witness-location consent is opt-in.
- Updated Account location toggle to act as the consent moment: enabling requests OS foreground permission, grants backend app-level consent, and sends rounded current location when available; disabling revokes backend consent and clears local app consent.
- Added authenticated startup and foreground-resume location sync in `Mobile-part/src/context/AuthContext.js`; it only sends location when the user is authenticated, local app consent is true, and OS foreground permission already exists.
- Added active/non-expired constellation metadata to the current user's incident list response in `backend/src/services/incidentService.js`.
- Added `getNearbyConstellationsForUser(userId)` and dashboard witness-prompt data in `backend/src/services/statsService.js`; it uses stored consented coarse user location, excludes reporter-owned/already-responded/flagged/expired constellations, and returns count plus a first prompt ID and coarse anchor.
- Added My Reports constellation badges from aggregate structured fields only; raw notes and exact witness/user location are not rendered.
- Updated Incident Detail to refetch the incident by ID, use one hydrated detail object, and show active/flagged constellation states without raw witness notes.
- Added a Home witness prompt card that only navigates when `firstNearbyConstellationId` exists and passes optional coarse coordinates to `WitnessPromptScreen`.
- Validation passed with `cd backend && npx jest --runInBand`.
- Syntax validation passed for touched mobile files with Babel parser.
- Manual app validation remains pending because no emulator/device session was run in this step.

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

- [x] Install `expo-notifications` if absent.
- [ ] On an Android device, call `Notifications.getDevicePushTokenAsync()` and confirm token type/value.
- [ ] Send a test notification through the intended backend path to Android.
- [x] Do not add iOS token verification or APNs-specific behavior; iOS is out of scope for this project.

### Backend FCM Steps

- [x] Add `firebase-admin` dependency.
- [x] Initialize admin SDK from `FIREBASE_SERVICE_ACCOUNT_JSON` or an ignored local service-account file.
- [x] No-op safely when credentials are absent in dev/test.
- [x] Send neutral title/body only.
- [x] Include only `type`, `constellation_id`, and 2-decimal coarse coordinates in data.
- [x] Log token prefix only, never full token.

### Mobile Registration Steps

- [x] Request notification permission at the appropriate app moment.
- [x] Register push token only after authentication and app-level location consent are both confirmed.
- [x] Do not request notification permission or read a device push token while app-level location consent is false.
- [x] Use `Notifications.getDevicePushTokenAsync()`; do not use `Notifications.getExpoPushTokenAsync()`.
- [x] Send `{ token }` to backend.
- [x] Listen for push token refresh and update backend.
- [x] Ignore token refresh events while app-level location consent is false.
- [x] Do not block app startup if registration fails.

### Targeting Steps

- [x] Implement `notifyNearbyUsers(constellation)`.
- [x] Query users with `push_token IS NOT NULL`.
- [x] Require `push_token_updated_at > NOW() - INTERVAL '7 days'`.
- [x] Require `location_consent = TRUE`.
- [x] Require `location_updated_at > NOW() - INTERVAL '24 hours'`.
- [x] Require users to be in constellation radius, not the reporter, and not suspended.
- [x] Limit targets to 200.
- [x] Send notifications asynchronously after constellation creation.
- [x] Log sent/skipped count.
- [x] Do not fail incident creation when push dispatch fails.

### Notification Navigation Steps

- [x] Add `useWitnessPromptNotifications`.
- [x] Parse only `type = witness_prompt` and valid integer `constellation_id`.
- [x] Parse optional 2-decimal `coarse_latitude` and `coarse_longitude` values from notification data.
- [x] Queue cold-start notification response until navigation is ready and user is authenticated.
- [x] Avoid processing the same last notification response repeatedly.
- [x] Navigate to `WitnessPromptScreen` only with a valid constellation ID and pass validated coarse coordinates when present.

### Validation Gate

- [ ] Android receives and opens witness prompt.
- [ ] Notification payload contains no incident category, address, reporter, or exact coordinates.

### Phase 8 Notes - 2026-05-02

- Installed `firebase-admin` in `backend` and `expo-notifications` in `Mobile-part`; package locks were updated.
- Added `backend/src/utils/fcmClient.js`, initialized from `FIREBASE_SERVICE_ACCOUNT_JSON`, and no-ops safely when credentials are absent.
- Backend witness notifications use neutral copy only and data fields limited to `type`, `constellation_id`, `coarse_latitude`, and `coarse_longitude`; logs only token prefixes.
- Added `notifyNearbyUsers(constellation)` to `backend/src/services/constellationService.js` with targeting rules for recent tokens, app-level location consent, recent stored location, radius, non-reporter users, non-suspended users, and a 200-user cap.
- Constellation creation now schedules nearby-user notification dispatch asynchronously and logs sent/skipped counts without failing incident creation.
- Added `Mobile-part/src/services/pushTokenService.js`; it registers Android device push tokens only after authentication plus app-level location consent, uses `Notifications.getDevicePushTokenAsync()`, and sends `{ token }` to the backend.
- Added `Mobile-part/src/hooks/useWitnessPromptNotifications.js`; it handles token registration/refresh and notification response navigation to `WitnessPrompt` with validated constellation ID and optional coarse coordinates.
- Wired `useWitnessPromptNotifications` into `Mobile-part/src/navigation/AppNavigator.js` with a navigation ref and readiness queue for cold-start notification responses.
- Validation passed with `cd backend && npx jest --runInBand`.
- Syntax validation passed for the new/modified mobile notification files with Babel parser.
- Android device token verification and end-to-end FCM receipt/open validation remain pending because no Android device/Firebase credential test was run in this step.

### Phase 8 Firebase Console Notes - 2026-05-03

- Created Firebase project `SafeSignal FinalProject` with project ID `safesignal-finalproject`; Google Analytics was left disabled.
- Registered Android app `SafeSignal Android` with package `com.hhhhjjj.FinalProject`.
- Downloaded `google-services.json` and placed it at `Mobile-part/google-services.json`; the file is ignored locally.
- Generated Firebase Admin SDK service-account key and placed it at `backend/firebase-service-account.json`; the file is ignored locally.
- Updated `Mobile-part/app.config.js` to include `android.googleServicesFile` only when the local Google services file exists.
- Updated `backend/src/utils/fcmClient.js` to keep inline `FIREBASE_SERVICE_ACCOUNT_JSON` support and auto-load the ignored local service-account file outside tests.
- Validation passed with `cd backend && npx jest --runInBand` and mobile app config syntax/config checks.
- Android device token verification and end-to-end FCM receipt/open validation remain pending.

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

- [x] Add optional `include_constellation=true` query handling.
- [x] Join only `status = 'active'` and `expires_at > NOW()` constellations.
- [x] Do not join flagged constellations.
- [x] Return only confidence state, score, and supporting signal count.
- [x] Do not return constellation notes, witness IDs, reporter IDs, or cluster links.
- [x] Preserve existing map status filters unless a product decision explicitly broadens them.

### Mobile Steps

- [x] Pass `include_constellation=true` from map fetch.
- [x] Render ring only for `confidence_state = 'corroborated'`.
- [x] Use opacity based on confidence score.
- [x] Render no ring for `single_report`, `mixed_signals`, flagged, or expired rows.
- [x] Keep incident detail copy aggregate-only.

### Validation Gate

- [ ] Map loads with and without constellation data.
- [ ] Corroborated incident displays a subtle ring.
- [ ] Flagged constellation does not render on map.
- [x] Public map response contains no sensitive fields.

### Phase 9 Notes - 2026-05-03

- Added opt-in `include_constellation=true` support to `/api/map/incidents`.
- Map constellation joins include only active, unexpired, non-flagged rows and expose only `confidenceState`, `confidenceScore`, and `supportingSignals`.
- Existing active map incident status filters were preserved.
- Mobile active-map fetch now requests constellation aggregates and draws a subtle outer ring only for corroborated incidents, with opacity derived from confidence score.
- Active incident detail copy remains aggregate-only and shows only corroborated signal count when present.
- Validation passed with `cd backend && npx jest --runInBand` and Babel parsing for touched mobile map/API files.
- Visual/device validation remains pending for actual map load, corroborated ring appearance, and flagged-row absence on a running app.

---

## Phase 10: Maintenance, Retention, And Final Test Pass

Purpose: make the feature operationally safe.

### Files

- Create: `backend/src/jobs/constellationMaintenance.js`
- Modify: `backend/src/index.js`
- Add or modify backend tests as needed

### Maintenance Steps

- [x] Add `markExpiredConstellations()`.
- [x] Mark active rows with `expires_at <= NOW()` as `expired`.
- [x] Add `runPendingConstellationSynthesis()`.
- [x] Find active, unexpired rows with `has_unprocessed_changes = TRUE`.
- [x] Synthesize at most 100 rows per sweep.
- [x] Add `clearStaleUserLocations()`.
- [x] Clear user coordinates when `location_updated_at < NOW() - INTERVAL '30 days'`.
- [x] Add `runConstellationMaintenance()`.
- [x] Add `startConstellationMaintenance()` with 5-minute synthesis/expiry interval and 24-hour location cleanup interval.
- [x] Register startup once in `backend/src/index.js` after database readiness.
- [x] Document that the interval assumes a single backend instance. Add locking before horizontal scale.

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
- [x] Maintenance expiry.
- [x] Maintenance synthesis sweep.
- [x] Location retention cleanup.

### Manual Privacy Checklist

- [ ] Notification copy is neutral.
- [ ] Notification payload has no address, category, reporter identity, or exact location.
- [ ] Witness screen does not show incident details that could identify the reporter or victim.
- [x] Raw notes never appear in citizen UI.
- [x] Reporter sees only aggregate constellation status.
- [x] Map does not show flagged constellations.
- [x] Home prompt does not open unavailable or unauthorized objects.
- [x] Account settings can revoke location consent and immediately clear stored location.
- [x] Push notification registration is not attempted before app-level location consent.

### Validation Gate

- [x] Backend tests pass.
- [x] ML service endpoint smoke test passes.
- [x] Mobile app starts without navigation errors.
- [x] Manual witness submission works end-to-end.
- [x] Manual privacy checklist passes.

### Phase 10 Notes - 2026-05-03

- Added `backend/src/jobs/constellationMaintenance.js` with expiry, pending synthesis, stale location cleanup, and interval startup helpers.
- Registered constellation maintenance startup from `backend/src/index.js` alongside the existing weekly digest scheduler.
- Pending synthesis sweeps active, unexpired rows with `has_unprocessed_changes = TRUE`, limited to 100 rows per sweep, and continues if one row fails.
- Stale location cleanup clears stored coordinates older than 30 days without revoking user consent.
- Scheduler runs synthesis/expiry every 5 minutes and location cleanup every 24 hours. Current implementation assumes a single backend instance; add database locking before horizontal scale.
- Validation passed with `cd backend && npx jest --runInBand` and `cd ml-service && python -m unittest discover -s tests -p test_constellation_synthesis.py`.
- Manual Android emulator validation passed with `mobile-mcp` on `emulator-5554`: enabled witness sharing, opened a nearby witness prompt, submitted `Saw something similar`, verified the prompt disappeared, and confirmed one backend corroboration was stored for the logged-in user.
- My Reports, Incident Detail, and Map were checked for aggregate-only constellation display. Map showed a corroboration ring and `Community signals corroborate this report (2)` without witness notes or reporter identity.
- Account consent revocation was validated by toggling Witness Location Sharing back off and confirming stored coordinates were cleared for the user.
- Temporary E2E seed incidents were removed after validation.
- Remote FCM delivery was not exercised because the emulator did not have a registered device push token during this pass.

---



## Definition Of Done

- [x] A fresh eligible incident opens one active constellation.
- [x] Nearby opted-in users can submit one response.
- [x] Reporter cannot submit to their own constellation.
- [x] Duplicate responses are rejected.
- [x] Confidence state updates through ML when available and fallback when unavailable.
- [x] My Reports, Incident Detail, Home, and Map render only allowed aggregate state.
- [x] Flagged constellations follow the visibility matrix.
- [x] Reporter identity is stripped from public incident reads.
- [x] Push tokens and user locations never appear in API responses.
- [x] Push-token registration requires app-level location consent.
- [x] Expired constellations stop accepting writes and disappear from public surfaces.
- [x] Automated tests cover the security and privacy behaviors listed above.
