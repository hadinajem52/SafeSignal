# Witness Constellation

## TASK
- Define an AI feature that is specific to SafeSignal's identity as a community safety and incident reporting app.
- Describe how the feature should work in the mobile app.
- Map the implementation onto the current repo structure so it can be built incrementally.

## CONSTRAINTS
- Keep the feature mobile-first.
- Avoid generic chatbot, summary-card, or "AI assistant" patterns.
- Preserve user privacy and avoid exposing witness identities or exact movements.
- Favor an MVP that fits the current SafeSignal architecture.

## NON-GOALS
- No broad redesign of the entire reporting system.
- No attempt to automate moderation or police decisions.
- No public display of raw witness responses.
- No full implementation in this document.

## ASSUMPTIONS
1. SafeSignal's core identity is community safety, nearby awareness, and incident reporting with trust as a central product problem.
2. The current mobile implementation centers on the report flow, map, home dashboard, and my reports surfaces.
3. The backend already supports incident creation, map retrieval, dashboard stats, and ML-assisted analysis, so the cleanest path is to extend those seams rather than invent a parallel system.

## SIMPLEST VIABLE APPROACH
- Introduce one new concept: a short-lived `witness constellation` around a reported incident.
- Nearby users receive a neutral, lightweight prompt asking whether they observed unusual activity in that area and time window.
- AI synthesizes multiple weak signals into one trust-oriented incident confidence state.
- Surface the synthesized result across mobile in a few high-value places: Home, Map, Incident Detail, and My Reports.

## Feature Summary

`Witness Constellation` turns a single report into a temporary, privacy-safe corroboration zone. Instead of asking users to fill out another report, the app asks nearby users for one-tap witness feedback:

- `Saw something similar`
- `Heard something unusual`
- `Passed by and noticed nothing unusual`
- `Not sure`

Optional follow-up input can be a single short note, but the core interaction must stay fast.

The AI layer does not behave like a chatbot. Its job is to combine partial, messy, and sometimes conflicting witness signals into a structured confidence summary for the incident:

- `single_report`
- `corroborated`
- `mixed_signals`
- `activity_not_confirmed`
- `likely_ended`

This makes SafeSignal feel like a live community sensing network, not just a form submission app.

## Why This Fits SafeSignal

Most reporting apps stop at one person submitting one report. SafeSignal can differentiate itself by helping the community validate what is actually happening nearby without forcing everyone into long forms.

This feature is specific to the app's identity because it improves:

- trust in reports
- situational awareness
- speed of community participation
- confidence in map data

It also uses the strengths of mobile:

- location awareness
- immediate notifications
- one-tap feedback
- in-the-moment participation

## User Experience

### 1. Report Creation

When a user submits an incident through `FinalProject/src/screens/ReportIncidentScreen.js`, the backend evaluates whether the incident is eligible for a witness constellation.

Eligibility rules for MVP:

- non-draft incident
- valid coordinates
- recent timestamp
- not rejected by toxicity or abuse filters
- not obviously duplicate of an already active constellation

The reporting user does not manage the constellation directly. The feature should feel automatic.

### 2. Nearby Witness Prompt

Nearby users receive a discreet mobile notification or in-app prompt:

- "Unusual activity was reported nearby 8 minutes ago."
- "Did you notice anything in this area?"

Important:

- the prompt must remain neutral
- it should not disclose the original reporter
- it should not reveal exact addresses or sensitive details

The response UI should be extremely small:

- one tap to choose a signal
- optional one-line detail
- optional "skip"

### 3. Map Experience

In `FinalProject/src/screens/Map/MapScreen.js` and `FinalProject/src/screens/Map/IncidentMapDetail.js`, incidents with active constellation data should show a confidence layer, not just a marker.

Examples:

- ring glow intensity based on corroboration strength
- `Corroborated by nearby witnesses`
- `Mixed signals`
- `No ongoing activity confirmed`

The map becomes a live trust surface rather than a static incident list.

### 4. Home Experience

In `FinalProject/src/screens/Home/HomeScreen.js`, the app can show:

- `1 nearby incident needs corroboration`
- `A nearby report was independently confirmed`

This gives the home screen a more specific action loop than generic stats.

### 5. My Reports Experience

In `FinalProject/src/screens/MyReports/MyReportsScreen.js`, the reporting user should see whether their report gained community support:

- `Awaiting corroboration`
- `Corroborated by 3 nearby signals`
- `Mixed nearby responses`

This is valuable because it explains how the report is developing without exposing individual respondents.

## AI Responsibilities

The AI system should do synthesis, not freeform conversation.

Core responsibilities:

- cluster related witness responses around the same incident window
- compare supporting and contradicting signals
- extract consistent directionality from partial descriptions
- estimate whether activity is ongoing or likely ended
- generate a concise structured confidence summary

The AI should not:

- decide legal truth
- identify suspects
- reveal witness identity
- override moderation status

## Structured Output

For implementation, the AI output should stay structured. A practical response shape would be:

```json
{
  "confidence_state": "corroborated",
  "confidence_score": 0.81,
  "summary": "Three nearby users reported similar activity within 12 minutes of the original report.",
  "supporting_signals": 3,
  "contradicting_signals": 1,
  "ongoing_assessment": "unclear",
  "freshness_minutes": 12
}
```

This should remain machine-readable so the mobile UI can render badges, rings, labels, and timelines without parsing prose.

## Current App Seams To Reuse

### Mobile

Existing surfaces that should be extended:

- `FinalProject/src/screens/ReportIncidentScreen.js`
- `FinalProject/src/screens/Map/MapScreen.js`
- `FinalProject/src/screens/Map/IncidentMapDetail.js`
- `FinalProject/src/screens/Home/HomeScreen.js`
- `FinalProject/src/screens/MyReports/MyReportsScreen.js`
- `FinalProject/src/services/incidentAPI.js`
- `FinalProject/src/services/mobileNotifications.native.js`
- `FinalProject/src/hooks/useDashboardData.js`
- `FinalProject/src/hooks/useMyReports.js`

Why these seams:

- report submission already exists
- map incidents already load through one API boundary
- dashboard stats already drive the home screen
- local notifications are already available
- my reports already merges API-backed incidents with local state

### Backend

Existing seams to extend:

- `backend/src/routes/incidents.js`
- `backend/src/routes/map.js`
- `backend/src/routes/stats.js`
- `backend/src/services/incidentService.js`
- `backend/src/services/mapService.js`
- `backend/src/services/statsService.js`

### ML Service

Relevant seam:

- `ml-service/main.py`

This service already owns AI request and response contracts. It is the cleanest place to host the witness synthesis endpoint rather than embedding AI logic in the Node backend.

## Implementation Plan

### Phase 1: Data Model

Add a minimal constellation model in the backend database.

Suggested tables:

#### `incident_constellations`

- `constellation_id`
- `incident_id`
- `status`
- `center_latitude`
- `center_longitude`
- `radius_meters`
- `opens_at`
- `expires_at`
- `confidence_state`
- `confidence_score`
- `summary`
- `supporting_signals`
- `contradicting_signals`
- `ongoing_assessment`
- `last_synthesized_at`

#### `incident_corroborations`

- `corroboration_id`
- `constellation_id`
- `user_id`
- `signal_type`
- `note`
- `distance_meters`
- `submitted_at`
- `device_latitude_rounded`
- `device_longitude_rounded`

Why separate tables:

- one constellation belongs to one incident
- many witness signals can attach to one constellation
- synthesis can be recomputed without mutating raw witness responses

### Phase 2: Incident Triggering

When `incidentAPI.submitIncident()` ultimately creates an incident, the backend should evaluate whether to open a constellation.

Suggested logic in `backend/src/services/incidentService.js`:

1. After successful incident creation, check eligibility.
2. If eligible, create or reuse an active constellation for that incident.
3. Enqueue notification targeting for nearby users.

Do not open a constellation for:

- drafts
- reports without valid coordinates
- stale incidents
- obvious spam or abusive content

### Phase 3: Witness Prompt Delivery

Use `FinalProject/src/services/mobileNotifications.native.js` for device-side display and add backend targeting logic for who should receive the prompt.

Current limitation:

- the existing mobile notification module handles on-device display but does not by itself provide server-triggered remote push delivery
- full rollout will require push token registration, backend targeting, and notification dispatch infrastructure
- before that exists, the MVP can fall back to in-app prompt cards on Home or Map for eligible users

Targeting rules for MVP:

- users with notifications enabled
- users recently active in the app
- users within a coarse radius
- do not notify the reporting user as a witness

The notification payload should include:

- constellation id
- neutral prompt type
- coarse map anchor

### Phase 4: Mobile Response Flow

Add a dedicated lightweight corroboration flow instead of overloading the report form.

Suggested new mobile pieces:

- `FinalProject/src/screens/WitnessPromptScreen.js`
- `FinalProject/src/components/WitnessSignalCard.js`
- `FinalProject/src/services/constellationAPI.js`

This screen should:

- show minimal context
- offer 3 to 4 one-tap answers
- optionally accept one short note
- submit in under 10 seconds

### Phase 5: AI Synthesis Endpoint

Add a new ML contract, for example:

- `POST /constellations/synthesize`

Input:

- incident metadata
- current constellation metadata
- corroboration list
- time deltas
- rough distance data

Output:

- confidence state
- confidence score
- summary
- ongoing assessment

The Node backend remains thin:

- fetch raw constellation data
- call the ML service
- persist the structured result

### Phase 6: Mobile Surface Integration

#### Home

Extend `backend/src/services/statsService.js` and `FinalProject/src/hooks/useDashboardData.js` to return:

- nearby constellations needing response
- recently corroborated nearby incidents

#### Map

Extend `backend/src/routes/map.js` and `backend/src/services/mapService.js` so map incidents can optionally include:

- `confidence_state`
- `confidence_score`
- `supporting_signals`

Then update:

- `FinalProject/src/screens/Map/MapScreen.js`
- `FinalProject/src/screens/Map/IncidentMapDetail.js`

#### My Reports

Extend `incidentAPI.getMyIncidents()` response to include:

- `constellation_status`
- `constellation_summary`
- `supporting_signals`

Then render those on:

- `FinalProject/src/screens/MyReports/ReportItem.js`
- `FinalProject/src/screens/IncidentDetailScreen.js`

## MVP Definition

The MVP should stay narrow.

Included:

- one-tap witness prompt
- constellation created for eligible incidents
- AI synthesis from multiple signals
- map confidence state
- my reports confidence state
- basic home prompt entry point

Not included:

- open-ended witness chat
- audio transcription
- photo corroboration
- cross-incident constellation merging
- predictive policing or incident forecasting

## Privacy and Safety Requirements

This feature creates product value only if privacy is stronger than curiosity.

Required safeguards:

- never show witness identity to other users
- never show exact witness coordinates
- store coarse or rounded location for witness input
- rate-limit witness submissions
- prevent repeated responses from the same user for the same constellation
- keep prompts neutral to avoid rumor amplification
- expire constellations quickly

Recommended prompt copy:

- "Did you notice unusual activity in this area recently?"

Avoid:

- "Did you witness an assault at this address?"

The first preserves safety and reduces defamatory risk.

## Abuse and Quality Controls

Potential failure modes:

- malicious users mass-confirm false reports
- users guess rather than report direct observation
- low-signal constellations create noisy map UI

Controls:

- weight signals by proximity and recency
- cap contribution count per user
- require minimum signal volume before upgrading to `corroborated`
- keep low-confidence constellations visually subdued
- allow moderator review of constellation evidence summaries

## Rollout Strategy

### Phase A: Internal Prototype

- create constellation records
- manually seed witness responses
- test synthesis quality

### Phase B: Limited Mobile Beta

- enable for a small geographic area
- send only in-app prompts, not push
- evaluate response rates and noise

### Phase C: Full Mobile Rollout

- enable push notifications
- show confidence states on map and my reports
- add dashboard counters for witness participation

## Validation

### Product Validation

Success metrics:

- witness prompt response rate
- time from report creation to first corroboration
- percentage of eligible incidents with at least one corroboration
- moderator trust in synthesized summaries
- reduction in unresolved low-context reports

### Technical Validation

Automated coverage should include:

- constellation eligibility logic
- duplicate witness submission prevention
- synthesis contract validation
- map payload rendering with and without constellation data
- notification opt-in and skip behavior

Manual checks should include:

- nearby prompt arrives only for eligible users
- response completes in under 10 seconds
- map badges do not reveal sensitive details
- my reports shows state transitions clearly

## Rejected Alternatives

### Generic AI Chat Assistant

Rejected because it is broad, hard to trust, and weakly tied to SafeSignal's identity.

### AI Summary Cards On Mobile

Rejected because they are passive. This feature should improve trust and participation, not just restate data.

### Fully Automatic Truth Scoring

Rejected because the app should synthesize community evidence, not claim certainty where evidence is incomplete.

## Recommendation

If SafeSignal adds one flagship AI feature on mobile, `Witness Constellation` is the strongest candidate because it improves the app's core loop:

- report
- corroborate
- trust
- act

It is innovative without being theatrical. More importantly, it is specific to what SafeSignal is trying to become: a real-time, community-driven safety signal network.

## Verdict

Yes, but only as a tightly scoped MVP.

It is a strong product idea for SafeSignal because it is specific to the app’s core loop, not generic AI. Technically, it is feasible to integrate into this repo. But the hard part is not the AI. The hard part is witness targeting, privacy hardening, and trust rules.
My honest take:
- Suitable as a flagship feature: yes.
- Feasible as written end-to-end: only partially.
- Feasible as an MVP: yes, if you de-scope push targeting and public-map ambitions first.
Why It Fits
The best part of this proposal is that it is not “AI for AI’s sake.”
- The backend already has a post-create incident pipeline, ML hooks, and notification hooks, so there is a natural insertion point in backend/src/services/incidentService.js:434-1032.
- The mobile app already has the right surfaces to show status changes on Home, Map, My Reports, and detail screens.
- The ML service already uses structured request/response contracts, so adding one more synthesis contract is consistent with the existing design: ml-service/main.py:172-292, backend/src/utils/mlClient.js:211-276.
So at a concept level, this is one of the better ideas in the doc set.
What Makes It Feasible
These parts are already in place:
- PostGIS-backed incident location queries exist, so radius-based constellation logic is straightforward: backend/src/database/init.js:41-86, backend/src/services/statsService.js:130-255.
- Map and dashboard APIs are already thin service boundaries that can be extended without redesign: backend/src/routes/map.js:11-28, backend/src/routes/stats.js:117-137.
- My Reports is already API-driven and easy to enrich with extra fields: backend/src/services/incidentService.js:1101-1145, FinalProject/src/hooks/useMyReports.js:17-100.
- In-app realtime notifications already exist via sockets, even if real push does not: backend/src/index.js:75-159, FinalProject/src/hooks/useRealtimeNotifications.js:64-123.
What Makes It Hard
These are the real gaps.
1. Nearby witness targeting does not exist yet.
- There is no obvious server-side storage for user location, push tokens, or “recently active near X” state in the user schema: backend/src/database/init.js:12-27.
- Current notification infrastructure is staff-focused, not citizen proximity-focused: backend/src/services/notificationService.js:58-137.
- Mobile notifications are local display only; they do not give you remote push targeting by themselves: FinalProject/src/services/mobileNotifications.native.js:62-125.
This is the biggest implementation gap.
2. The current public map model conflicts with early corroboration.
- The active map only shows already-public/verified-like statuses: backend/src/services/mapService.js:13-16, 83-95.
- Your feature wants corroboration around fresh submitted incidents.
- That means either:
  1. constellations happen before the map can show them, or
  2. you broaden map exposure to less-trusted incidents, which changes the current trust/privacy model.
That is a real product decision, not just an engineering task.
3. Privacy assumptions are stricter than the current backend posture.
- GET /api/incidents/:id is public: backend/src/routes/incidents.js:386-408.
- That service returns joined reporter info including username and email: backend/src/services/incidentService.js:1153-1158.
For a feature centered on witness privacy and identity protection, I would fix that class of exposure before rollout.
4. Incident detail is snapshot-based, not live.
- MyReportsScreen passes an incident object directly into detail: FinalProject/src/screens/MyReports/MyReportsScreen.js:32-39.
- IncidentDetailScreen does not refetch by id; it renders the passed object: FinalProject/src/screens/IncidentDetailScreen.js:15-27.
So if corroboration evolves after submission, the detail UI will not naturally stay current without extra work.
AI-Specific Verdict
I would not pitch this internally as “an AI feature” first.
For the MVP, the core value is:
- witness collection
- privacy-safe aggregation
- confidence state rendering
The first synthesis can be deterministic and still be good:
- count supporting vs contradicting signals
- weight by recency and coarse distance
- require minimum volume before corroborated
- only use ML later for optional-note interpretation or summary wording
That is actually safer and easier to trust than jumping straight to LLM reasoning over sparse signals.
My Recommendation
Green-light it, but only in this narrowed shape:
1. Build constellation data + witness submission first.
2. Use in-app prompts for active users, not full remote push.
3. Show constellation state first in My Reports and maybe private detail views.
4. Delay public map confidence styling until you settle whether unverified incidents should influence map visibility.
5. Start with rule-based synthesis; add ML summary generation later.
Go / No-Go
Go for MVP.
Do not go for the full document as-is in one pass.
If you want, I can turn this into a concrete phased integration plan for this repo with exact file-by-file changes and risk order.