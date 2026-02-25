# Moderator Dashboard API Surface Map

Source: `moderator-dashboard/src/services/api.js`

## authAPI

- `register({ username, email, password, role })`
- `login(email, password)`
- `me(token, signal)`

## reportsAPI

- `getAll(params)`
- `getById(id)`
- `getDedup(id)`
- `getMlSummary(id)`
- `updateCategory(id, category)`
- `linkDuplicate(id, duplicateIncidentId)`
- `updateStatus(id, status)`
- `verify(id)`
- `reject(id, reason)`

## usersAPI

- `getAll(params)`
- `getById(id)`
- `suspend(id)`
- `unsuspend(id)`
- `updateRole(id, role)`

## statsAPI

- `getDashboardStats()`

## settingsAPI

- `get()`
- `update(settings)`
- `reset()`
- `sendWeeklyDigestNow()`

## leiAPI

- `getAll(params)`
- `getById(id)`
- `updateStatus(id, payload)`

## adminAPI

- `getPendingApplications()`
- `approveApplication(id)`
- `rejectApplication(id)`
- `getDatabaseTables()`
- `getTableRows(tableName, limit)`
- `deleteTableRow(tableName, rowId)`
- `clearTable(tableName)`
- `clearAllData()`
- `resetAllReports()`

## timelineAPI

- `getTimeline(incidentId)`
- `postComment(incidentId, content, isInternal, attachments)`

## Contract Notes

- All APIs normalize to shape:
  - success path: `{ success: true, data, message? }`
  - failure path: `{ success: false, error, status }`
- Existing call-site behavior depends on this normalized shape and should be preserved during refactor.
