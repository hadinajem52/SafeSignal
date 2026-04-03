## Highest Impact

1. Turn the report form into a guided, step-based flow.
FinalProject/src/screens/ReportIncidentScreen.js:410
Right now reporting is one long scroll with many decisions at once: anonymous toggle, text, ML toggles, date, location, photos, draft, submit.
Better UX:
- Step 1: What happened
- Step 2: Where/when
- Step 3: Photos/details
- Step 4: Review and submit
Why: lower cognitive load, clearer progress, fewer missed required fields.
2. Add a sticky bottom action bar on the report screen.
FinalProject/src/screens/ReportIncidentScreen.js:560
Save Draft and Submit Report are only at the bottom of a long form.
Better UX:
- Keep primary CTA fixed
- Show validation summary like 2 fields missing
- Make Save Draft secondary but always accessible
Why: much better one-handed mobile use.
3. Make the map detail sheet actionable, not just informational.
FinalProject/src/screens/Map/IncidentMapDetail.js:50
The bottom sheet is clean, but it mostly stops at display.
Better UX:
- Add View Full Details
- Add Directions or Open in Maps
- Add Share area or Report nearby incident
Why: users on mobile expect the sheet to be the launch point for the next action.
4. Simplify the report status cards.
FinalProject/src/screens/MyReports/ReportItem.js:113
The 4-step progress strip is useful, but on small screens it’s visually dense and the labels are tiny.
Better UX:
- Replace full progress strip with one stronger status sentence
- Example: Under review, Resolved, Needs more info
- Keep timeline only inside detail view
Why: improves scan speed and reduces clutter.

## Strong Secondary Improvements

5. Make the home screen more task-oriented.
FinalProject/src/screens/Home/HomeScreen.js:52
Home currently mixes greeting, safety score, stats, trends, and feed.
Better UX:
- Put one primary action near the top: Report Incident
- Add one secondary action: Open Map
- Keep safety card first, but collapse lower-priority content behind sections
Why: mobile home screens work better when they answer “what should I do next?”
6. Upgrade filter usability in the community feed.
FinalProject/src/screens/Home/CommunityFeed.js:98
Horizontal chips work, but they don’t show much state or scale well.
Better UX:
- Add result counts per filter
- Add a clear active-filter summary
- Consider a bottom sheet filter menu if more filters are coming
Why: improves discoverability and reduces horizontal scrolling friction.
7. Improve tab bar clarity.
FinalProject/src/navigation/TabNavigator.js:76
The center FAB is good, but the remaining tabs rely heavily on icons.
Better UX:
- Ensure visible labels for all tabs
- Make the center action explicitly read as Report
- Add subtle haptic feedback on tab and primary actions
Why: reduces ambiguity and makes the app feel more intentional.
8. Improve permission UX in account/settings.
FinalProject/src/screens/Account/AccountScreen.js:158
You already expose permission state, which is good.
Better UX:
- Add direct Open Settings CTA when blocked
- Explain the feature impact inline: Location improves nearby safety score
- Surface missing permissions earlier in flows where needed
Why: users understand permissions better when tied to value.