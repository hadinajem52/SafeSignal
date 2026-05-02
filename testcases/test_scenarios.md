## QA Test Scenarios

Date: 2026-04-28
Target: `http://localhost:5174/`
Application: `moderator-dashboard`

### Scope

- Usability testing for the login and access request entry points
- Functional testing for authentication, protected routes, role-based redirects, and moderator-visible navigation
- Non-functional testing for console stability, basic performance, and mobile layout sanity

### Assumptions

- The local app at `http://localhost:5174/` is the current QA target.
- The demo credentials shown on the login screen are valid for moderator-role testing.
- No admin or law-enforcement credentials are available unless exposed by the running app.

### Checklist

#### Public Entry

- [ ] `TC-U-01` Login page clarity
  Verify the first screen clearly communicates product identity, sign-in purpose, and primary actions.

- [ ] `TC-U-02` Login form affordances
  Verify labeled fields, password visibility toggle, auto-fill control, and clear sign-in CTA are present and usable.

- [ ] `TC-F-01` Login validation messages
  Submit empty and malformed login values and verify actionable validation feedback appears.

- [ ] `TC-F-02` Invalid login rejection
  Submit invalid credentials and verify access is denied with an error message.

- [ ] `TC-F-03` Demo credential login
  Use the visible demo credentials and verify successful redirect into the authenticated dashboard.

- [ ] `TC-F-04` Apply access flow
  Switch to the access request tab, submit a valid request, verify success feedback, and verify the back-to-login action.

- [ ] `TC-U-03` Mobile layout sanity
  Verify the login page remains readable and actionable on a narrow mobile viewport.

#### Authentication And Routing

- [ ] `TC-AUTH-01` Protected route redirect while logged out
  Open `/`, `/reports`, `/users`, `/settings`, `/admin`, `/lei`, and `/data-analysis-center` while unauthenticated and verify redirect behavior.

- [ ] `TC-AUTH-02` Moderator navigation visibility
  After login, verify moderator-expected navigation items are visible and restricted items are hidden.

- [ ] `TC-AUTH-03` Sidebar controls
  Verify navigation links and sidebar collapse or expand button work as expected.

- [ ] `TC-AUTH-04` Moderator role denial handling
  While logged in as moderator, open `/admin` and `/lei` and verify the app denies access safely.

- [ ] `TC-F-06` Logout behavior
  Trigger logout and verify the session is cleared and protected pages are no longer accessible.

#### Dashboard

- [ ] `TC-DASH-01` Dashboard render
  Verify KPIs, map panel, activity feed, recent reports, category breakdown, and top reporters sections load.

- [ ] `TC-DASH-02` Dashboard links
  Verify `View all` and `All users` links navigate correctly.

- [ ] `TC-DASH-03` Dashboard map behavior
  Verify visible map states, marker interactions, popup close action, or graceful fallback if the map cannot load.

- [ ] `TC-DASH-04` Dashboard data consistency
  Compare dashboard counts and visible report/activity summaries against the reports page for obvious contradictions.

#### Reports Queue

- [ ] `TC-REP-01` Reports page load
  Verify the reports queue loads and displays list, filters, and detail pane states.

- [ ] `TC-REP-02` Search and status filters
  Verify search input, status tabs, and sort buttons change the list as expected.

- [ ] `TC-REP-03` Report selection controls
  Verify row selection, select-all checkbox, and next-report action work.

- [ ] `TC-REP-04` Bulk actions
  Verify selected-row bulk actions open the correct confirmation flow and complete or fail clearly.

- [ ] `TC-REP-05` Single report actions
  Verify escalate and reject actions open the correct confirmation flow and complete or fail clearly.

- [ ] `TC-REP-06` Detail panel links and ML actions
  Verify `Open in Maps`, `Apply Suggested Category`, duplicate candidate links, and `Mark as Duplicate` behave correctly or fail clearly.

#### Users Management

- [ ] `TC-USR-01` Users page load
  Verify KPI cards, search, role filter, status filters, list panel, and detail panel render.

- [ ] `TC-USR-02` User filtering and selection
  Verify search, role filter, status chips, and row selection update the results and detail panel correctly.

- [ ] `TC-USR-03` Invite and retry controls
  Verify the `Invite User` button behavior and any retry controls if an error state appears.

- [ ] `TC-USR-04` Account status consistency
  Verify newly requested or visible user states are internally consistent between list, detail, and login behavior.

#### Settings

- [ ] `TC-SET-01` Section navigation
  Verify left-side settings section buttons switch the content area correctly.

- [ ] `TC-SET-02` Profile editing
  Verify `Edit Profile`, field editing, and `Save` behavior.

- [ ] `TC-SET-03` Preference selectors
  Verify language, timezone, date format, and appearance selectors persist or provide clear feedback.

- [ ] `TC-SET-04` Notification toggles and save actions
  Verify channel toggles, unsupported toggles, severity tiles, weekly digest controls, and save/send actions.

- [ ] `TC-SET-05` Security controls
  Verify password visibility toggle, password validation, update-password messaging, and 2FA toggle messaging.

- [ ] `TC-SET-06` Danger zone reset flow
  Verify `Reset to Defaults` opens the confirmation flow and completes or fails clearly.

#### Data Analysis Center

- [ ] `TC-DAC-01` Analytics page load
  Verify KPI cards, charts, hotspots, heatmap, AI insights, and error banners render.

- [ ] `TC-DAC-02` Period filter buttons
  Verify `7d`, `30d`, `90d`, and `1y` period buttons update the view.

- [ ] `TC-DAC-03` AI insights refresh
  Verify the refresh button regenerates insights or fails clearly.

#### Non-Functional

- [ ] `TC-N-01` Initial load performance sanity
  Verify the login view becomes usable within an acceptable local-development time window.

- [ ] `TC-N-02` Console error scan
  Verify there are no uncaught runtime errors during login, navigation, denial redirects, and major page interactions.

- [ ] `TC-N-03` Basic security posture
  Verify no unexpected sensitive information is exposed beyond intentionally displayed demo content and that protected pages do not render when logged out.

### Coverage Limits

- Admin-only controls such as promotion, suspension, application approval, and system admin settings require admin credentials.
- Law-enforcement-specific workflows require a law-enforcement or admin account.
- The target for this pass is every visible and reachable button or control in public and moderator-accessible flows.

### Additional Coverage Vectors

- [ ] `TC-AUTH-05` Full logged-out route matrix
  Re-check `/`, `/reports`, `/users`, `/settings`, `/admin`, `/lei`, `/data-analysis-center`, and an unknown route while logged out.

- [ ] `TC-REP-07` Report keyboard shortcuts
  Verify `N`, `E`, and `R` trigger next, escalate, and reject behavior when focus is not inside an input.

- [ ] `TC-REP-08` Report panel resize interaction
  Verify the report splitter can be dragged and that the layout remains usable after resize.

- [ ] `TC-REP-09` Report external map link
  Verify the report `Open in Maps` link resolves to a valid external maps URL.

- [ ] `TC-DAC-04` Remaining analytics periods
  Verify `90d` and `1y` period buttons update the view and expose consistent zero-data or populated states.

- [ ] `TC-LEI-01` Law-enforcement account reachability
  If a newly created law-enforcement account can authenticate, verify `/lei` access and sidebar visibility.

- [ ] `TC-LEI-02` LE queue controls
  Verify LE queue search, status filter, sort buttons, row selection, and splitter behavior.

- [ ] `TC-LEI-03` LE incident detail actions
  Verify workflow action button, closure fields, disclosure toggles, map link, and close-case flow for any reachable incident.

- [ ] `TC-LEI-04` LE alternate tabs
  Verify the `Map` and `Closed` tabs switch views cleanly.

- [ ] `TC-U-04` Reachability of non-functional toggles and hidden targets
  Re-attempt previously unresponsive checkbox-style controls and identify whether they are truly broken or only hard to target.
