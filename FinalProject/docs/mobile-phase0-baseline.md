# Mobile Refactor Phase 0 Baseline

Date captured: 2026-02-25
Scope: `FinalProject/src/**`

## Objective
Create a stable baseline before refactoring so Phase 1+ changes can be verified quickly and rolled back safely if needed.

## Hotspot Inventory (Size-Based)
Top large files (bytes):

1. `src/services/api.js` - 21075
2. `src/screens/ReportIncidentScreen.js` - 14963
3. `src/screens/Auth/AnimatedBackground.js` - 12664
4. `src/screens/Account/AccountScreen.js` - 11350
5. `src/components/IncidentTimeline.js` - 10863
6. `src/screens/Auth/VerificationScreen.js` - 10830
7. `src/hooks/useLocationPicker.js` - 9558
8. `src/screens/Auth/RegisterScreen.js` - 9269
9. `src/screens/Map/MapScreen.js` - 9034
10. `src/components/IncidentForm/IncidentLocationPicker.js` - 7751

Primary Phase 1 hotspot: `src/services/api.js` (mixed concerns: client config, storage, and multiple domain APIs).

## Current Service Dependency Surface
Callers currently importing `services/api`:

- `src/context/AuthContext.js`
- `src/hooks/useDashboardData.js`
- `src/hooks/useMyReports.js`
- `src/hooks/useRealtimeNotifications.js`
- `src/screens/ReportIncidentScreen.js`
- `src/screens/Auth/VerificationScreen.js`
- `src/screens/Map/MapScreen.js`
- `src/components/IncidentTimeline.js`
- `src/index.js` (re-export)

Compatibility requirement: keep existing `services/api` exports stable during decomposition.

## Navigation / Flow Smoke Checklist
Run manually on device or simulator after each phase:

1. Auth flow:
- Register
- Verify email code
- Login
- Logout

2. Incident flow:
- Open report form
- Save draft
- Submit report
- Open report detail

3. Map flow:
- Load map markers
- Change category/timeframe filters
- Open incident detail from map

4. Account flow:
- Open account screen
- Edit profile name
- Update preferences/theme and verify persistence

## Structural Risk Notes
- Duplicate screen entry points exist (`src/screens/*.js` and nested feature screen folders like `src/screens/Auth/*`, `src/screens/Map/*`, `src/screens/Account/*`).
- `src/services/api.js` currently centralizes multiple domain responsibilities.
- Baseline risk level: Medium (moderate coupling, but clear decomposition seam exists in services).

## Validation Evidence (This Iteration)
- `node --check` passed for:
  - `src/services/api.js`
  - `src/services/apiClient.js`
  - `src/services/authAPI.js`
  - `src/services/tokenStorage.js`
  - `src/services/incidentAPI.js`
  - `src/services/statsAPI.js`
  - `src/services/timelineAPI.js`
- `eslint` execution could not be completed in this environment (permission/network fetch error when invoking `npx eslint`).
- Manual smoke checklist is defined above but not yet executed end-to-end in this iteration.

## Phase 0 Exit Status
- Baseline inventory captured: Complete
- Hot path checklist defined: Complete
- Refactor compatibility constraints recorded: Complete
- Lint verification: Pending
- Manual smoke execution: Pending
- Phase 0 completion state: In progress (not closed yet)
