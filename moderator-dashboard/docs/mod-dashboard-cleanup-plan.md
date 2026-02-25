# Moderator Dashboard Cleanup Plan (Safe Refactor)

## ASSUMPTIONS I'M MAKING

1. Scope is `moderator-dashboard` only (not `backend`, `FinalProject`, or `ml-service`).
2. Goal is maintainability cleanup and decomposition, with no intentional behavior/API/UI contract changes unless explicitly approved.
3. Work should be done in small, reviewable phases with validation after each phase.
   -> Correct these if needed before implementation starts.

## Objective

Break large, mixed-concern dashboard code into smaller, cohesive modules while preserving runtime behavior.

## Non-Goals

- No feature additions.
- No backend contract changes.
- No redesign work.
- No broad "cleanup everything" pass in a single PR.

## High-Risk Areas (from scan)

- `src/pages/Settings/Settings.jsx`
- `src/pages/Users.jsx`
- `src/pages/Reports/Reports.jsx`
- `src/services/api.js`
- `src/layouts/Layout.jsx` (realtime + invalidation side effects)

## Core Safety Rules

1. Move-first, logic-second.
2. One concern per PR.
3. Keep existing routes, query keys, and API method signatures stable.
4. Every phase must leave app buildable and testable.
5. No "done" claim without explicit verification evidence.

## Phase Plan

### Phase 0 - Baseline & Guardrails

Purpose: Establish a stable baseline before moving code.

Tasks:
- Document key user flows per page (Settings, Users, Reports, Dashboard, LEI).
- Capture API surface map from `src/services/api.js`.
- Define parity checklist (below) and acceptance criteria.
- Add/confirm smoke tests for route access and primary workflows.

Exit criteria:
- Baseline flows documented.
- Smoke tests passing.
- Parity checklist agreed.

### Phase 1 - Extract Static Assets from Large Pages (No Behavior Change)

Purpose: Reduce file complexity safely.

Tasks:
- For `Settings.jsx` and `Users.jsx`:
  - Move inline CSS strings to dedicated style modules or CSS files.
  - Move icon maps/constants to `constants` files.
  - Move pure helpers to `utils` files.
- Keep page component behavior unchanged.

Exit criteria:
- Visual parity confirmed.
- No logic edits in extracted helpers (move-only).

### Phase 2 - Split Page Containers from Presentational Components

Purpose: Isolate rendering from orchestration.

Tasks:
- Split `Settings.jsx` into:
  - container component (queries/mutations/state)
  - presentational section components
- Split `Users.jsx` similarly.
- Keep state ownership in container; pass explicit props down.

Exit criteria:
- Containers are substantially smaller.
- No behavior regressions in existing flows.

### Phase 3 - Reports Page Side-Effect Isolation

Purpose: Make the highest interaction page safer to maintain.

Tasks:
- Extract hooks:
  - `useReportPanelResize`
  - `useReportSelection`
  - `useReportActions` (verify/reject/duplicate/category)
- Keep existing child components and route behavior unchanged.
- Ensure keyboard and pointer interactions still match current behavior.

Exit criteria:
- Reports container focuses on orchestration only.
- Keyboard shortcuts and panel resizing verified manually.

### Phase 4 - API Layer De-duplication (Contract Preserving)

Purpose: Remove repeated error-handling boilerplate without changing API contracts.

Tasks:
- Introduce shared request wrapper(s) for success/error normalization.
- Split domain APIs into separate modules:
  - `api/auth`, `api/reports`, `api/users`, `api/settings`, `api/admin`, `api/lei`, `api/timeline`
- Keep exported method names and return shape stable.

Exit criteria:
- Call sites unchanged or minimally changed.
- Response shape parity verified.

### Phase 5 - Realtime/Layout Isolation

Purpose: Decouple cross-cutting side effects from UI layout.

Tasks:
- Extract realtime socket bindings to a dedicated hook.
- Extract notification queue logic to a dedicated hook/module.
- Keep query invalidation keys unchanged.

Exit criteria:
- Layout component simplified.
- Realtime updates and notification behavior unchanged.

### Phase 6 - Hardening & Cleanup

Purpose: Validate parity and remove leftover complexity safely.

Tasks:
- Remove dead code after extractions.
- Add targeted regression tests for previously fragile flows.
- Validate lint/build/test pipeline.

Exit criteria:
- No known regressions.
- Maintainability improved with smaller, focused modules.

## Parity Checklist (Run Every Phase)

1. Authentication:
- Login success/failure paths.
- Route protection by role.

2. Reports:
- Filter/search/sort.
- Select report, bulk select, bulk actions.
- Verify/reject/category updates.
- Keyboard shortcuts.
- Split panel drag behavior.

3. Users:
- List/filter/select behavior.
- Role update and suspend/unsuspend flows.

4. Settings:
- Load settings.
- Save/reset settings.
- Dark mode toggle persistence.

5. Realtime:
- Incident updates trigger expected refresh behavior.
- Notifications appear and auto-dismiss.

6. General:
- No console/runtime errors.
- No broken navigation routes.

## Delivery Strategy

- Small PRs only; each PR maps to one phase or one sub-phase.
- PR template fields:
  - Behavior changed? (Yes/No)
  - What was verified? (tests + manual checklist)
  - Rollback plan (single revert target)

## Rollback Strategy

- Revert only the latest phase PR if regression appears.
- Do not bundle multiple risky concerns in one PR.
- Keep compatibility entry points during transitions to reduce rollback risk.

## Definition of Done

- Large files are decomposed into coherent modules.
- Behavior parity is demonstrated by checklist + tests.
- Side effects are isolated and easier to reason about.
- Future feature changes can be made in narrow, low-risk files.
