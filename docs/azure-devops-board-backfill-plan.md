# Azure DevOps Board Completion Plan With Assignments

## Purpose

Update the Azure DevOps board for `https://dev.azure.com/202310415/SafeSignal` so it reflects completed project work, completed QA coverage, and resolved defects discovered during testing.

The update is intentionally limited to board and documentation records. It should not modify source code or test files.

## Source Of Truth

- Azure DevOps organization: `https://dev.azure.com/202310415`
- Azure DevOps project: `SafeSignal`
- Azure DevOps team: `SafeSignal Team`
- Area path: `SafeSignal`
- CSV source: `testcases/unified-test-cases.csv`
- Board update reference: completed SafeSignal board records

Current CSV summary:
- Total test cases: `62`
- Passing test cases: `39`
- Failing test cases: `23`
- Distinct grouped bugs: `16`

## Strict Assignment Rule

Every created work item must have an assignee.

Zeina RIZKALLAH `<zeina.rizkallah@ua.edu.lb>` must be excluded from all work item assignment logic, even though she is a member of `SafeSignal Team`.

Allowed assignees:

| Team member | Azure DevOps identity | Ownership |
| --- | --- | --- |
| Hadi NAJEM | `202112356@ua.edu.lb` | Login, access request, authentication, protected routes, RBAC, security controls |
| Mario KOUBAYATI | `202310441@ua.edu.lb` | Dashboard, reports, Data Analysis Center, report actions, maps, data consistency |
| Elie WAKIM | `202310415@ua.edu.lb` | Users, access approvals, account status, profile/settings administration, test case coordination |
| Selim BAKHOS | `202211096@ua.edu.lb` | Law-enforcement interface, incident queue/detail, notification/preferences controls, runtime stability |

Assignment precedence for mixed-area items:

1. Authentication, authorization, access request, RBAC, and security: Hadi.
2. Dashboard, reports, analytics, maps, and data consistency: Mario.
3. User management, access approvals, account status, profile, and admin settings: Elie.
4. Law-enforcement workflows, runtime stability, notification controls, preferences, and non-functional issues: Selim.

## Sprint Iterations

Create or reuse these iterations and add all five to `SafeSignal Team`.

| Sprint | Start date | Finish date | Purpose |
| --- | --- | --- | --- |
| `SafeSignal\Sprint 1` | `2026-02-04` | `2026-02-11` | Authentication, login, route protection |
| `SafeSignal\Sprint 2` | `2026-02-12` | `2026-02-19` | Reports, dashboard, analytics |
| `SafeSignal\Sprint 3` | `2026-02-20` | `2026-02-27` | Users, access approvals, settings |
| `SafeSignal\Sprint 4` | `2026-02-28` | `2026-03-07` | Law-enforcement incident workflows |
| `SafeSignal\Sprint 5` | `2026-03-08` | `2026-03-15` | QA closure, runtime stability, final validation |

Completed status is represented by past sprint finish dates.

## User Stories

Create 8 `User Story` work items. Each story should be `Closed`, assigned to the listed owner, and placed in the listed sprint.

| Story title | Owner | Sprint | Priority | Story points |
| --- | --- | --- | --- | --- |
| Public login and access request flow | Hadi | Sprint 1 | 1 | 5 |
| Authentication, protected routing, and RBAC navigation | Hadi | Sprint 1 | 1 | 8 |
| Moderator report queue review and report actions | Mario | Sprint 2 | 1 | 8 |
| Dashboard and analytics data visibility | Mario | Sprint 2 | 1 | 8 |
| User management and access request administration | Elie | Sprint 3 | 2 | 5 |
| Settings, profile, notification, and security controls | Elie | Sprint 3 | 2 | 5 |
| Law-enforcement incident queue and detail workflow | Selim | Sprint 4 | 1 | 8 |
| Runtime stability, maps, performance, and final QA closure | Selim | Sprint 5 | 1 | 5 |

Each story description should include:

- Product area.
- User value.
- Completed scope.
- QA evidence reference to `testcases/unified-test-cases.csv`.

Each story acceptance criteria should state:

- Relevant screens render successfully.
- Main user workflow completes.
- Role-specific behavior is enforced.
- QA result is documented through linked test cases and bugs.

## Tasks

Create 24 `Task` work items, 3 tasks per user story. Each task should be `Closed`, assigned, prioritized, and linked as a child of its parent story.

| Parent story | Task title | Owner | Priority |
| --- | --- | --- | --- |
| Public login and access request flow | Implement branded login tabs and credential form validation | Hadi | 1 |
| Public login and access request flow | Add access request form role selector and pending feedback | Hadi | 2 |
| Public login and access request flow | Verify mobile login readability and password visibility behavior | Hadi | 3 |
| Authentication, protected routing, and RBAC navigation | Enforce protected route redirect for logged-out users | Hadi | 1 |
| Authentication, protected routing, and RBAC navigation | Restrict moderator access to admin and LE routes | Hadi | 1 |
| Authentication, protected routing, and RBAC navigation | Validate sidebar visibility for moderator and LE roles | Hadi | 2 |
| Moderator report queue review and report actions | Build reports default queue and filter states | Mario | 1 |
| Moderator report queue review and report actions | Support single report escalation and rejection flows | Mario | 1 |
| Moderator report queue review and report actions | Support bulk reject and bulk escalate confirmation flows | Mario | 2 |
| Dashboard and analytics data visibility | Render KPI panels, activity feed, and recent reports | Mario | 1 |
| Dashboard and analytics data visibility | Align dashboard, reports, and DAC report totals | Mario | 1 |
| Dashboard and analytics data visibility | Add map fallback and external map behavior | Mario | 2 |
| User management and access request administration | Render users page list, filters, and detail pane | Elie | 2 |
| User management and access request administration | Keep access request status consistent across login and users | Elie | 1 |
| User management and access request administration | Add invite user feedback and empty-filter detail handling | Elie | 3 |
| Settings, profile, notification, and security controls | Save profile edits without premature header mutation | Elie | 2 |
| Settings, profile, notification, and security controls | Provide clear preference and notification control feedback | Selim | 3 |
| Settings, profile, notification, and security controls | Validate password visibility, short-password errors, and 2FA controls | Hadi | 2 |
| Law-enforcement incident queue and detail workflow | Build LE shell navigation and role-specific landing behavior | Selim | 1 |
| Law-enforcement incident queue and detail workflow | Implement incident queue search, filter, sort, and splitter behavior | Selim | 1 |
| Law-enforcement incident queue and detail workflow | Implement incident detail actions, publish toggle, and fuzz controls | Selim | 2 |
| Runtime stability, maps, performance, and final QA closure | Resolve console/runtime proxy and router warnings where in scope | Selim | 1 |
| Runtime stability, maps, performance, and final QA closure | Verify non-functional performance and basic security posture checks | Selim | 2 |
| Runtime stability, maps, performance, and final QA closure | Create QA test case work items and link failed cases to bugs | Elie | 2 |

Task field policy:

- `System.State`: `Closed`
- `Microsoft.VSTS.Common.Priority`: as listed above
- `Microsoft.VSTS.Scheduling.CompletedWork`: `2`
- `Microsoft.VSTS.Scheduling.RemainingWork`: `0`
- `Microsoft.VSTS.Scheduling.OriginalEstimate`: `2`

## Bug Grouping

Create 16 `Bug` work items, grouped by distinct `Bug Id` from the CSV. Each bug should be `Resolved`, assigned, and linked to the closest user story.

| Bug ID | CSV failing rows | Primary area | Owner | Priority | Related story |
| --- | ---: | --- | --- | ---: | --- |
| `BUG-001` | 4 | Dashboard, reports, DAC data consistency | Mario | 1 | Dashboard and analytics data visibility |
| `BUG-002` | 3 | Account status, map/runtime mixed failures | Elie | 1 | User management and access request administration |
| `BUG-003` | 3 | Reports bulk/single actions and access status | Mario | 1 | Moderator report queue review and report actions |
| `BUG-004` | 1 | RBAC denial feedback | Hadi | 1 | Authentication, protected routing, and RBAC navigation |
| `BUG-005` | 1 | User filtering and detail sync | Elie | 2 | User management and access request administration |
| `BUG-006` | 1 | Invite user feedback | Elie | 3 | User management and access request administration |
| `BUG-007` | 1 | Profile save behavior | Elie | 2 | Settings, profile, notification, and security controls |
| `BUG-008` | 1 | Preference selector feedback | Selim | 3 | Settings, profile, notification, and security controls |
| `BUG-009` | 1 | Access request success copy | Hadi | 3 | Public login and access request flow |
| `BUG-010` | 1 | Notification controls and digest feedback | Selim | 3 | Settings, profile, notification, and security controls |
| `BUG-011` | 1 | Security controls accessibility and 2FA | Hadi | 2 | Settings, profile, notification, and security controls |
| `BUG-012` | 1 | Console/runtime and map loading errors | Selim | 1 | Runtime stability, maps, performance, and final QA closure |
| `BUG-QA-001` | 1 | Toggle and checkbox reachability | Selim | 2 | Law-enforcement incident queue and detail workflow |
| `BUG-QA-002` | 1 | Law-enforcement account status reachability | Elie | 1 | User management and access request administration |
| `BUG-QA-003` | 1 | LE sidebar and role navigation | Selim | 1 | Law-enforcement incident queue and detail workflow |
| `BUG-QA-004` | 1 | LE queue filter and stale detail state | Selim | 1 | Law-enforcement incident queue and detail workflow |

Each bug should include:

- CSV `Bug Id`.
- All related `Test Case ID` values.
- View names and feature names.
- Test steps from the CSV rows.
- Expected result.
- Actual result.
- Outcome.
- A note that the item is a resolved QA defect.

## Test Cases

Create 62 `Test Case` work items from every CSV row.

Test case policy:

- Work item type: `Test Case`
- State: `Closed`
- Title format: `[TC-ID] Test Case Title`
- Description includes the QA validation context.
- Assignment: derived from `View Name` and `Feature Name`
- Iteration: match the closest feature sprint

Description template:

```text
Source: testcases/unified-test-cases.csv
View: <View Name>
Feature: <Feature Name>
Test Case ID: <Test Case ID>
Description: <Description>
Steps: <Test Steps>
Expected Result: <Expected Result>
Actual Result: <Actual Result>
Outcome: <Outcome>
Bug Id: <Bug Id or None>
After Fix: <Test 2 (After fixing) or Not recorded>
```

Assignment examples:

- Login, access request, auth, RBAC, protected routes: Hadi.
- Dashboard, reports, DAC, maps, analytics: Mario.
- Users, access workflow, profile/admin settings: Elie.
- LE interface, incident queue/detail, notifications, preferences, runtime/non-functional: Selim.

Failed test case link policy:

- Link each failed test case to its grouped bug.
- Prefer a test-related Azure DevOps relation if accepted by the project process.
- Fall back to a related link if the test-specific relation is rejected.

## Idempotency Rules

Before creating a work item:

1. Query existing work items where `System.TeamProject = 'SafeSignal'`.
2. Match by exact `System.WorkItemType` and exact `System.Title`.
3. Reuse the existing work item when a match exists.
4. Keep descriptions concise and focused on project and QA context.
5. Do not delete or overwrite unrelated work items.

The existing `Azure CLI permission probe task` should remain untouched unless explicitly requested.

## Azure CLI Execution Order

Use explicit organization and project flags on every command because local Azure CLI defaults may point to another project.

Required flags:

```powershell
$org = "https://dev.azure.com/202310415"
$project = "SafeSignal"
$team = "SafeSignal Team"
$project = "SafeSignal"
```

Execution order:

1. Verify Azure CLI access with `az devops project show`.
2. Read team members with `az devops team list-member` and remove Zeina from the assignment pool.
3. Create or reuse sprint iterations with `az boards iteration project create`.
4. Add each sprint to the team with `az boards iteration team add`.
5. Create or reuse the 8 user stories.
6. Update user stories to `Closed`.
7. Create or reuse the 24 tasks.
8. Link each task to its parent story.
9. Update tasks to `Closed`.
10. Parse the CSV and group failed rows by `Bug Id`.
11. Create or reuse 16 grouped bugs.
12. Link each bug to the closest user story.
13. Update bugs to `Resolved`.
14. Create or reuse all 62 test cases.
15. Link failed test cases to grouped bugs.
16. Run validation queries.

## Field Mapping

Common fields:

- `System.Title`
- `System.Description`
- `System.AssignedTo`
- `System.AreaPath`
- `System.IterationPath`
- `System.Description`
- `System.State`
- `Microsoft.VSTS.Common.Priority`

Story fields:

- `Microsoft.VSTS.Scheduling.StoryPoints`
- `Microsoft.VSTS.Common.AcceptanceCriteria`

Task fields:

- `Microsoft.VSTS.Scheduling.OriginalEstimate`
- `Microsoft.VSTS.Scheduling.CompletedWork`
- `Microsoft.VSTS.Scheduling.RemainingWork`

Bug fields:

- `Microsoft.VSTS.TCM.ReproSteps`
- `Microsoft.VSTS.Common.Priority`

Test case fields:

- `System.Description`
- `Microsoft.VSTS.TCM.Steps` if direct CLI/REST formatting is practical.
- If structured test steps are not accepted, preserve steps in `System.Description`.

## Validation Checklist

Run read-only validation after the board update:

- Five sprint paths exist.
- All five sprints are assigned to `SafeSignal Team`.
- Work item counts are:
  - `8` user stories.
  - `24` tasks.
  - `16` bugs.
  - `62` test cases.
- States are:
  - User stories: `Closed`
  - Tasks: `Closed`
  - Bugs: `Resolved`
  - Test cases: `Closed`
- Every planned work item has `System.AssignedTo`.
- No planned work item is assigned to Zeina RIZKALLAH.
- Every planned task has a parent story.
- Every grouped bug description references at least one CSV test case ID.
- Every failed CSV row is represented by a grouped bug.
- The board policy document exists and matches the implemented work item structure.

## Risks And Mitigations

- Azure CLI may reject direct creation of `Closed` or `Resolved` work items. Mitigation: create in the default state, then transition with `az boards work-item update --state`.
- Azure DevOps may reject some fields at creation time. Mitigation: create the minimal item first, then update optional fields separately.
- Test Case structured steps may require XML formatting. Mitigation: store steps in the description if `Microsoft.VSTS.TCM.Steps` fails.
- Test-specific work item relations may not be accepted by the CLI. Mitigation: use `System.LinkTypes.Related`.
- Assignee matching may require identity unique names rather than display names. Mitigation: assign by email/unique name from the team membership query.

## Definition Of Done

The board update is complete only when:

- Sprint iterations are present and team-visible.
- All required work item counts are present and traceable through exact titles.
- All created work items are assigned to Hadi, Mario, Elie, or Selim.
- No created work item is assigned to Zeina.
- User stories and tasks are closed.
- Bugs are resolved.
- Test cases are closed.
- Failed CSV rows are traceable to grouped bugs.
- This markdown file reflects the implemented board policy.
