# Mobile and Moderator Dashboard Features

This document summarizes the main user-facing features found in the mobile app and moderator dashboard.

## Mobile App Features

### Authentication and Onboarding
- User login and registration.
- Email verification flow.
- Google sign-in support.
- Persistent authenticated session handling.
- First-launch location permission prompt.

### Home and Safety Dashboard
- Personalized home dashboard for the signed-in user.
- Local safety score based on the user's area.
- Area insight cards for nearby activity.
- Quick stats for active and resolved incidents.
- Nearby active incident alert banner.
- Community feed with incident updates.
- Notification shortcut with unread indicator.

### Incident Reporting
- Create incident reports with title, description, category, severity, date, time, and location.
- Use current location or pick a location from the map.
- Add photo and video evidence.
- Submit reports anonymously.
- Save report drafts and continue them later.
- Optional ML-assisted category and risk handling.
- Emergency warning notice before report submission.

### Reports Management
- View the user's submitted reports.
- Filter reports by status.
- Open report details from the report list.
- Continue or delete saved drafts.
- Pull to refresh report history.

### Map and Location Features
- View incidents on an interactive map.
- Switch between active and resolved incident views.
- Filter map incidents by category.
- Filter resolved incidents by timeframe.
- View incident markers, clustered activity, and incident detail panels.
- Recenter on the user's location and refresh map data.

### Incident Details
- View incident category, severity, status, description, and timeline state.
- View attached photo and video evidence.
- Open media in a fullscreen viewer.
- See incident location on a map.
- See closure details for resolved incidents.
- Open incident chat when available.
- See nearby witness or constellation context when relevant.

### Notifications
- View in-app notifications.
- Track unread notifications.
- Mark individual notifications as read.
- Mark all notifications as read.
- Delete notifications.
- Open related incident details from notifications.

### Witness Prompts
- Receive prompts when near a relevant incident area.
- Respond with simple witness signals such as saw something, heard something, nothing unusual, already left, or not sure.
- Add an optional non-identifying note.
- Skip witness prompts.
- Preview simulated witness prompts from account tools.

### Account and Preferences
- View and update profile information.
- Change display name.
- Add or remove profile avatar.
- View contribution stats.
- Toggle dark and light theme.
- Manage location sharing preference.
- Manage push notification preference.
- Set default anonymous reporting preference.
- Manage feed video autoplay preference.
- Check device access status for location, notifications, camera, and photos.
- Test local and push notifications.
- Access support actions.
- Log out.
- Request account deletion.

## Moderator Dashboard Features

### Authentication and Access Control
- Staff login.
- Staff application flow for requested dashboard roles.
- Protected dashboard routes.
- Role-based access for moderator, admin, and law-enforcement sections.
- Access-denied feedback for unauthorized sections.

### Main Dashboard Overview
- Summary cards for total reports, pending reports, verified reports, and rejected reports.
- User overview cards for total users, active users, suspended users, and law-enforcement dispatches.
- Operational map for active incidents.
- Cluster and heatmap-style incident visualization.
- Live activity feed.
- Recent reports table.
- Category breakdown chart.
- Top reporter overview.

### Reports Queue
- Review submitted, auto-flagged, and auto-processed reports.
- Search reports.
- Filter reports by status.
- Sort reports by urgency or time.
- Select reports individually or in bulk.
- Bulk verify, escalate, or reject reports.
- Open report details.
- Use keyboard shortcuts for common moderation actions.
- View report timeline and communications.
- Use responsive desktop and mobile queue layouts.

### Report Review Details
- View full report metadata, reporter context, location, and submitted time.
- Review photo and video evidence.
- Open evidence in a fullscreen viewer.
- View report location on a map.
- Review ML category, confidence, risk, and toxicity signals.
- Apply suggested category changes.
- Review media judgment results.
- Retry media analysis when needed.
- View duplicate report candidates.
- Link or merge duplicate reports.
- Activate witness constellation requests.
- Review witness/community signal results.

### Incident Timeline and Messaging
- View system and staff timeline events for an incident.
- Add staff comments.
- Mark comments as internal when allowed.
- Receive realtime timeline updates.
- See messages awaiting reply.

### Law-Enforcement Workspace
- Role-gated law-enforcement incident queue.
- Search, filter, and sort assigned incidents.
- View live alert banners and realtime updates.
- Dispatch or update incident status.
- View selected incident details and action history.
- View linked duplicate incidents.
- Manage public disclosure settings.
- Set location fuzzing and media disclosure options.
- Close cases with outcome, case ID, and officer notes.
- View active incidents on an operations map.
- View closed cases separately.

### Data Analysis Center
- Analyze data across 7d, 30d, 90d, and 1y periods.
- View KPI summaries.
- Review AI insight cards.
- Analyze response-time metrics and trends.
- View incident heatmaps by day and hour.
- Review case funnel and resolution metrics.
- Track category trends.
- Monitor SLA performance.
- Review hotspot locations.
- Analyze reporter quality signals.

### User Management
- Search users.
- Filter users by role and status.
- View user details.
- Track user KPIs such as total users, active users, suspended users, staff users, and low-signal users.
- Invite new staff users.
- Copy invite links.
- Suspend or unsuspend users when authorized.
- Update user roles when authorized.

### Admin Tools
- Review pending staff applications.
- Approve or reject staff applications.
- Browse database tables.
- View table rows.
- Delete individual rows.
- Clear selected database tables.
- Clear all application data.
- Reset all reports.

### Settings
- Update staff profile name and email.
- Change account password.
- Manage language, timezone, and date format preferences.
- Manage dashboard notification settings.
- Manage alert severity preferences.
- Manage weekly digest settings.
- Send weekly digest immediately.
- Toggle dark mode.
- Adjust dashboard density preference.
- Reset dashboard settings.

### Realtime Dashboard Behavior
- Receive realtime invalidation updates.
- Show realtime toast notifications.
- Keep report, timeline, and dashboard data fresh while users work.
- Support collapsed sidebar and mobile navigation drawer.
