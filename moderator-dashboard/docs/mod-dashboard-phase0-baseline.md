# Moderator Dashboard Phase 0 Baseline

## Purpose

Baseline the current moderator dashboard behavior before decomposition so Phase 1+ can be verified against known flows.

## Scope

- App: `moderator-dashboard`
- Focus routes:
  - `/` Dashboard
  - `/reports`
  - `/users`
  - `/settings`
  - `/lei`
  - `/admin`
  - `/data-analysis-center`

## Critical User Flows

1. Auth and route protection
- Login with valid credentials.
- Reject invalid credentials.
- Verify role-gated routes redirect on forbidden access.

2. Reports workflow
- Load report queue.
- Filter/search/sort reports.
- Select report and open details.
- Verify, reject, update category, and duplicate-link actions.
- Use keyboard shortcuts (Escalate/Reject/Next).
- Resize report panels and preserve usability.

3. Users workflow
- Load users list.
- Search/filter by role and status.
- Select user and inspect detail pane.
- Suspend/restore user.
- Change role (admin path).

4. Settings workflow
- Load settings from API.
- Toggle/save notification and moderation settings.
- Trigger reset to defaults.
- Toggle dark mode and verify persisted preference behavior.

5. Realtime and notifications
- Incident/socket updates trigger expected query invalidation.
- Toast notifications render and auto-dismiss.

## Manual Parity Checklist (Per Phase)

- [ ] Login success/failure paths unchanged.
- [ ] Role protection unchanged (`/reports`, `/users`, `/lei`, `/admin`).
- [ ] Reports list/detail/actions unchanged.
- [ ] Users list/detail/actions unchanged.
- [ ] Settings load/save/reset/dark mode unchanged.
- [ ] Realtime updates still refresh dashboard/report/user/admin queries.
- [ ] No new console errors.
- [ ] No broken route navigation.

## Current Automation Status

- Automated test suite for these page workflows is not present in `moderator-dashboard` scripts.
- Available automation checks:
  - `npm run lint`
  - `npm run build`

## Acceptance Gate for Phase 0 Completion

Phase 0 is considered complete when:

1. This baseline document exists and is reviewed.
2. API surface map is documented (`mod-dashboard-api-surface-map.md`).
3. Lint/build checks pass.
4. Manual parity checklist is available and used for each phase PR.
