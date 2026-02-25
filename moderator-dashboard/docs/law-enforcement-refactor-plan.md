# Law Enforcement Page Refactor Plan (Phased, Safe)

Target file: `moderator-dashboard/src/pages/LawEnforcement/LawEnforcement.jsx` (~1673 lines)

## Goals
- Break the monolithic page into small, cohesive modules.
- Preserve behavior exactly during early phases.
- Reduce regression risk through phased delivery, checkpoints, and rollback strategy.

## Non-Goals
- No UI redesign.
- No API contract changes.
- No business rule changes unless explicitly approved.

## Assumptions
1. `LawEnforcement.jsx` is currently production-used and feature-complete.
2. Existing behavior is correct enough to preserve first, improve later.
3. We can add tests and small scaffolding files without changing runtime behavior.
4. Refactor work will be done in small PRs (one phase or sub-phase per PR).

If any assumption is wrong, stop and correct scope before implementation.

## Safety Principles
- Keep public page route and top-level component name stable.
- Move code first, change logic second.
- One concern per commit/PR.
- Maintain a working app after each phase.
- Track parity with a manual verification checklist and test suite.

## Phase 0: Baseline and Guardrails (No Behavioral Changes)
Purpose: Create a safety net before touching architecture.

Steps:
1. Capture current behavior baseline.
   - List critical user flows for this page (search/filter/view details/actions/map/timeline/etc.).
   - Record API calls and payload/response usage map.
2. Add/expand tests around existing behavior.
   - Component integration tests for key flows.
   - Utility tests for pure functions already embedded in the file (if any).
3. Add lightweight telemetry/log markers for error boundaries (if absent).
4. Freeze scope with explicit acceptance criteria for "refactor done".

Exit criteria:
- Baseline tests pass.
- Manual checklist is documented and reproducible.
- No code-path behavior changed.

Rollback:
- None needed (no behavior change).

## Phase 1: Structural Extraction (Move-Only)
Purpose: Reduce file size by extracting code without logic changes.

Proposed target structure:
- `src/pages/LawEnforcement/LawEnforcementPage.jsx` (container/orchestrator)
- `src/pages/LawEnforcement/components/`
  - `Header/Toolbar` components
  - `FiltersPanel`
  - `ResultList` + row/item components
  - `DetailPane` sections
  - `MapSection`, `TimelineSection`
  - `Dialogs` / confirmation UI
- `src/pages/LawEnforcement/hooks/`
  - `useLawEnforcementState`
  - `useLawEnforcementActions`
  - `useLawEnforcementQueries` (if using react-query)
- `src/pages/LawEnforcement/mappers/` (API-to-view transformations)
- `src/pages/LawEnforcement/constants/`

Steps:
1. Extract presentational JSX blocks into local components.
2. Extract constants/enums/config objects.
3. Extract pure helper functions.
4. Keep props explicit; avoid context proliferation.
5. Keep `LawEnforcement.jsx` as compatibility entry that re-exports or composes the new page.

Exit criteria:
- No visual/behavioral changes.
- Test suite and manual checklist pass.
- File size reduction target met (e.g., main file < 350 lines).

Rollback:
- Revert the latest extraction PR only; previous phases remain intact.

## Phase 2: State and Side-Effect Isolation
Purpose: Separate domain logic from UI and reduce cognitive load.

Steps:
1. Consolidate state transitions into custom hooks/reducer.
2. Isolate network calls behind `services/api.js` adapters (no direct fetch/axios in UI).
3. Move derived/computed state into memoized selectors.
4. Centralize error/loading/empty states into shared UI components.

Exit criteria:
- Side-effects are isolated and testable.
- No duplicated state or contradictory sources of truth.
- All tests and manual checks pass.

Rollback:
- Revert only the state isolation PR; keep structural extraction from Phase 1.

## Phase 3: Hardening and Parity Validation
Purpose: Prove no regressions and improve maintainability signal.

Steps:
1. Add regression tests for previously fragile flows and edge cases.
2. Verify performance parity (render count, slow interactions).
3. Run lint/type checks and remove dead code introduced during extraction.
4. Validate accessibility-critical interactions (keyboard nav, focus, labels) on core flows.

Exit criteria:
- Parity checklist passes 100%.
- No new console/runtime errors.
- Coverage and maintainability improved vs baseline.

Rollback:
- Revert only hardening commits if needed; core refactor remains.

## Phase 4: Optional Improvements (Only If Approved)
Purpose: Post-refactor enhancements that were intentionally deferred.

Candidates:
- UX polish and micro-interaction cleanup.
- Better empty/error messaging.
- Performance tuning beyond parity.

Exit criteria:
- Explicit product sign-off for each improvement.

## Verification Matrix (Run Every Phase)
1. Automated:
   - Unit/integration tests for Law Enforcement flows.
   - Lint/type checks.
2. Manual:
   - Login and role access.
   - Search/filter interactions.
   - List-to-detail transitions.
   - Action workflows and confirmations.
   - Map/timeline rendering and interactions.
   - Error/empty/loading states.
3. Regression:
   - API request shapes unchanged.
   - Route and deep-link behavior unchanged.

## PR Strategy (Recommended)
- PR 1: Baseline tests + checklist only.
- PR 2-n: Small extraction batches by concern (components, hooks, helpers).
- Final PR: Cleanup, dead code removal, docs update.

Each PR should include:
- "Behavior changed?" = Yes/No (default No for refactor phases).
- "How verified?" = tests + checklist evidence.
- "Rollback plan" = exact commit/PR to revert.

## Risk Register
- Hidden coupling inside monolith causing subtle regressions.
  - Mitigation: move-only first, parity tests, small PRs.
- Async race conditions after hook extraction.
  - Mitigation: isolate effects, cancellation guards, deterministic tests.
- Prop explosion across extracted components.
  - Mitigation: define stable view-model contracts per section.

## Definition of Done
- Main page orchestrator is small and readable.
- Concerns are split by UI, state, side-effects, and mapping.
- Behavior parity proven with tests and manual checklist.
- Team can modify one feature area without touching unrelated areas.
