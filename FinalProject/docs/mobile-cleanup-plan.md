# Mobile Cleanup Plan (Phased, Safe Rollout)

## Current Status (2026-02-25)
- Phase 0: Started and baseline captured in `docs/mobile-phase0-baseline.md`.
- Phase 1: Started with service-layer decomposition while preserving `src/services/api.js` public exports.
- Validation state: `node --check` completed for service modules; lint and manual smoke tests are still pending before Phase 0/1 closeout.

## Goals
- Break large mobile files into smaller, single-purpose modules.
- Keep behavior stable while improving maintainability.
- Ship in small phases with explicit validation so nothing breaks.

## Scope (Phase Sequence)
- In scope: `FinalProject/src/**` mobile app code.
- Out of scope for now: `backend/`, `moderator-dashboard/`, `ml-service/`.

## Safety Rules (Apply to Every Phase)
1. Preserve public interfaces first, then improve internals.
2. Limit each PR to one concern area.
3. Run lint + targeted tests (or manual checklist) before merge.
4. Keep rollback simple: each phase must be revertible independently.
5. Do not mix refactor + feature work in the same diff.

## Baseline (Phase 0)
### Objective
Create a known-good baseline before structural changes.

### Tasks
- Capture mobile dependency graph and biggest files by size/complexity.
- Define “hot paths” manual smoke checks:
  - Auth: login/register/verify/logout
  - Incident: create draft/submit/list/detail
  - Map: markers/filter/open detail
  - Account: profile/preferences/save
- Ensure lint command runs clean for mobile app.

### Exit Criteria
- Baseline checklist documented and runnable.
- No active feature changes mixed with cleanup work.

## Phase 1: Service Layer Decomposition
### Objective
Split large `src/services/api.js` into focused modules without changing callers.

### Tasks
- Extract modules:
  - API client/config/interceptors
  - token storage
  - auth API
  - incident API
  - stats API
  - timeline API
- Keep existing export surface compatible via a stable barrel (`src/services/api.js`).
- Add light contract checks for returned payload shapes (where feasible).

### Risk Controls
- Do not rename consumer imports in same phase unless required.
- Validate all auth and incident flows via baseline smoke tests.

### Exit Criteria
- No behavior regressions in auth/incident/map flows.
- `src/services/api.js` reduced to orchestration/exports.

## Phase 2: Screen-Level Modularization
### Objective
Break large screen files into container + presentational parts.

### Initial Targets
- `src/screens/ReportIncidentScreen.js`
- `src/screens/Account/AccountScreen.js`
- `src/screens/Map/MapScreen.js`

### Tasks
- Move business logic into hooks/selectors.
- Keep UI components focused and stateless where possible.
- Co-locate screen-specific styles/helpers near feature folders.

### Risk Controls
- One screen per PR for easier review and rollback.
- Preserve route names/params and navigation behavior.

### Exit Criteria
- Target screens split into smaller files with unchanged UX behavior.

## Phase 3: Duplicate/Legacy Screen Consolidation
### Objective
Remove duplicate entry points and stale files safely.

### Tasks
- Audit duplicated screens (root `src/screens/*` vs nested feature folders).
- Identify canonical file per route.
- Remove or deprecate unused screen implementations.

### Risk Controls
- Confirm each deleted file has zero active imports.
- Keep temporary aliases only when migration requires them.

### Exit Criteria
- Single canonical implementation per screen route.
- No dead screen files referenced by navigation.

## Phase 4: Shared UI and Hook Boundaries
### Objective
Clarify reusable component/hook boundaries to prevent future sprawl.

### Tasks
- Standardize shared UI primitives in `src/components/`.
- Keep feature-specific components inside their feature folders.
- Normalize hook naming and ownership by domain.

### Risk Controls
- Avoid “global utils” dumping; assign clear ownership per module.
- Introduce shared abstractions only after 2+ concrete use cases.

### Exit Criteria
- Cleaner imports, reduced cross-feature coupling, predictable ownership.

## Phase 5: Hardening and Documentation
### Objective
Lock in maintainability standards.

### Tasks
- Add/update tests for high-risk logic paths.
- Add architecture notes:
  - folder ownership
  - import conventions
  - refactor checklist for new work
- Add PR template checklist for safe refactor changes.

### Exit Criteria
- Team can continue refactoring incrementally without regressions.

## Execution Cadence
- Suggested pace: 1 phase per PR stream, small mergeable slices.
- Review gate per phase:
  - Functional validation (smoke checks)
  - Simplicity review (KISS/DRY/YAGNI)
  - Rule compliance review

## Immediate Next Step
- Execute Phase 0 baseline capture, then start Phase 1 (`api.js` decomposition) in small, reviewable commits.
