# Mobile App — FPS Optimization Plan

> **Status:** **APPLIED** (2026-06-15). Tiers A, B, and C1–C3 were implemented after two code
> reviews (pragmatist: *execute with trims*; senior: *approve with follow-up*). C4, C5, C6 and all of
> Tier D were intentionally **not** done (see §0). The sections below are the original plan, kept for
> rationale; §0 records what actually shipped and the review corrections folded in.

_Target: `Mobile-part/` — Expo SDK 54, React Native 0.81.5, React 19, Reanimated 4, react-native-maps._

---

## 0. Implementation status (what shipped)

**Applied:**

- **A1 — marker re-rasterization.** `MapView.js` resolved markers now use a `tracksViewChanges` state
  that paints once on each `incidents` change, then freezes. Per the senior review, the freeze timer is
  **900ms** (not 500ms) so it doesn't race `MapScreen`'s `fitToCoordinates` timer.
- **A2 — marker recreation on pan.** Marker elements are built in a `useMemo` (keyed on
  incidents/mode/categoryDisplay/theme/onMarkerPress/tracksViewChanges); `MapCanvas` is `React.memo`;
  `onMarkerPress` is now a `useCallback` in `MapScreen`. _Note (senior review): the memo holds because
  `theme` is a stable module-level reference — keep it that way or the memo silently stops working._
- **B1 — My Reports list.** `ReportItem` is `React.memo`; handlers and `renderItem` are `useCallback`;
  FlatList got `removeClippedSubviews` / `initialNumToRender` / `maxToRenderPerBatch` / `windowSize`.
- **B2 — Map tab freezing.** Applied as **per-screen** `freezeOnBlur: true` on the Map tab only (narrow
  blast radius, per senior review — not a global `enableFreeze`). **This is the one behavior-affecting
  change: smoke-test on device** — switch away from Map and back, confirm map/markers/location resume,
  and that the custom tab slide transition still looks right.
- **C1 — context value memo.** `ThemeContext` and `PreferencesContext` `value` objects are `useMemo`'d
  (`setThemeMode` is now `useCallback`'d). _Correction (both reviews): the earlier rationale wrongly
  said this drives FeedCard re-renders via preferences — `useUserPreferences` reads PreferencesContext,
  not Theme, and the functions were already `useCallback`'d. It's a trivial-but-free cleanup; impact is
  small because these providers rarely change state._
- **C2 — `NotificationItem`** wrapped in `React.memo`.
- **C3 — Incident Detail.** `Divider`/`SectionHeader` hoisted to module scope (they read `useTheme`
  internally, so no call sites changed) to stop remounting on every screen re-render.

**Deliberately NOT applied (per verdict):**

- **C4** (memoize FeedCard's `media`) and **C5** (`React.memo` on `AppText`) — cut as negligible; C5 is
  defeated by inline `style={{…}}` call sites anyway.
- **C6** (flatten list-item elevation) — visual change, needs design sign-off.
- **Tier D** (`expo-image`, timeline virtualization, marker clustering) — deferred until measurement
  shows it's still needed.

**Scope note (senior review):** A1/A2 deliberately cover only the main Map screen. The other three
MapViews (`IncidentLocationMap`, `IncidentLocationPicker`, `WitnessPromptScreen`) render 0–1 markers
and are not a frame-rate concern.

**Verification:** All 9 changed files parse-check clean through the project's Babel + Reanimated
plugin. Runtime FPS should still be confirmed with the Perf Monitor on a release build (see §6),
especially the Map in resolved mode with many markers, and the B2 resume smoke-test.

### Round 2 — additional FPS pass (applied)

Follow-up work after the first round, again low-risk first:

- **#1 — Android lite-map.** [IncidentLocationMap.js](src/components/IncidentLocationMap.js) renders a
  static `liteMode` snapshot on Android for the exact-location (marker) case. _Gated off for the
  approximate (Circle) case — lite mode doesn't reliably draw circle overlays._
- **#2 — Map pan no longer re-renders the screen.** Region is tracked in a ref
  ([MapScreen.js](src/screens/Map/MapScreen.js)) instead of `setState`; the map is uncontrolled
  (`initialRegion`) so nothing reads it post-mount. Panning no longer re-renders the control panel,
  filter bars, or controls. `setRegion` removed from `useMapRegion`'s consumed surface.
- **#3 — Toast context value memoized.** [ToastContext.js](src/context/ToastContext.js) — consumers no
  longer re-render every time a toast appears/auto-dismisses.
- **#4 — expo-image (new dep `expo-image` ~3.0.11).** [FadeInImage.js](src/components/FadeInImage.js)
  reimplemented on `expo-image` (memory+disk cache, downsampling, native cross-fade) keeping its API,
  so [FeedCardMedia.js](src/screens/Home/FeedCardMedia.js) and the detail photo list are covered with
  no call-site changes. The detail **fullscreen** viewer also uses `expo-image` (shows instantly from
  the cache the feed warmed). _Local/static images (empty-state art, form thumbnails, the single
  profile avatar) deliberately left on RN `Image` — no caching benefit, not scroll-critical._
  **Device check:** confirm feed/detail images still load and fade in correctly.
- **#5 — FlashList (new dep `@shopify/flash-list` 2.0.2).** Swapped the two high-value vertical lists:
  [CommunityFeed.js](src/screens/Home/CommunityFeed.js) (feed `marginTop`→`paddingTop` since FlashList
  contentContainerStyle is padding-only) and [MyReportsScreen.js](src/screens/MyReports/MyReportsScreen.js).
  FlatList-only props (`removeClippedSubviews`/`initialNumToRender`/`maxToRenderPerBatch`/`windowSize`)
  removed — FlashList recycles natively. **Notifications kept on FlatList** on purpose: it's a short
  list and its empty state centers via `flexGrow`, which FlashList's contentContainerStyle doesn't
  honor. **Device check:** confirm feed + My Reports scroll, pull-to-refresh, header, and empty states.
- **#6 — Marker clustering: EVALUATED, NOT APPLIED.** After A1 the markers are frozen
  (`tracksViewChanges=false`), so the per-frame cost that clustering would solve is already gone —
  clustering's remaining benefit is memory/visual-clarity, not sustained FPS. `react-native-map-clustering`
  replaces the MapView component and I can't verify here that it forwards the `ref` methods this screen
  relies on (`animateToRegion`/`fitToCoordinates` for My Location and fit-to-incidents) or how it treats
  the active-mode circles + invisible tap markers. Held to avoid an unverifiable regression to core map
  controls; revisit as a dedicated, on-device-tested change only if the dense resolved map still drags.

**Ruled out (already optimal):** Hermes is **on** (`android/gradle.properties: hermesEnabled=true`);
Reanimated/worklets correct; Toast/Modal/auth-shake animations use the native driver. `CategoryFilter`'s
`useNativeDriver: false` is **correct** (animates color, which can't be native-driven; 180ms on tap).

**Still deferred:** C6 (flatten list-item elevation — visual, needs design sign-off), timeline
virtualization (only if chat threads get long).

---

## 1. Executive summary

The codebase is already in good shape for performance — animations run on the UI thread (Reanimated +
worklets are correctly configured), the Community Feed is a well-tuned `FlatList`, video players mount
lazily, and the auth-screen animation pauses in the background. There is **no single broken thing**
dragging the whole app down.

The biggest, clearest wins are concentrated on the **Map screen**, where markers continuously
re-rasterize and the entire marker set is recreated on every pan/zoom. After that, the **My Reports
list** re-renders every (heavy) row on unrelated state changes. The remaining items are cheap, safe
micro-optimizations (context value memoization, a few `React.memo` wraps).

Estimated effort vs. payoff:

| Tier | Items | Effort | FPS payoff |
|------|-------|--------|------------|
| **A — High** | Map marker re-rasterization, map marker recreation on pan | ~half day | Large (Map screen goes from janky→smooth with many markers) |
| **B — Medium** | My Reports list memoization, background-tab screen freezing | ~half day | Moderate (smoother list scroll, lower idle CPU) |
| **C — Low/polish** | Context value memo, component memos, in-render component defs | ~1–2 hrs | Small but free |
| **D — Optional** | `expo-image`, timeline virtualization, marker clustering | larger | Situational |

---

## 2. How this was investigated

- Read the entry points (`App.js`, `index.js`, navigation) and confirmed provider/tree structure.
- Read every FPS-sensitive surface: Community Feed + feed card + media/video, both Map components,
  My Reports list, Notifications list, Incident Detail + its animated children (chat FAB, timeline,
  video controls, skeletons).
- Verified the Reanimated 4 / `react-native-worklets` babel setup (it is **correct** — see §3).
- Grepped for the usual culprits: `tracksViewChanges`, `.map()`-rendered lists, `console.*` in hot
  paths, shadows/elevation on list items.

---

## 3. What is already good (don't touch)

These are working correctly and are **not** part of the plan — listed so we don't accidentally
"fix" them:

- **Worklets/Reanimated babel config is correct.** `babel.config.js` uses
  `react-native-reanimated/plugin`, which in Reanimated 4.1.6 simply re-exports
  `react-native-worklets/plugin`. Animations (PressableScale, FadeInImage, Skeleton, FeedCard press,
  AnimatedBackground, ChatFab) genuinely run on the UI thread.
- **Community Feed** (`src/screens/Home/CommunityFeed.js`) — `FlatList` with memoized `renderItem`,
  memoized header element (with a good comment explaining why it's an element, not a function),
  `initialNumToRender`/`maxToRenderPerBatch`/`windowSize`/`removeClippedSubviews` all tuned. `FeedCard`
  is `React.memo`'d.
- **Video** (`FeedVideo.js`, `VideoControls.js`) — players mount only when needed; the high-frequency
  `timeUpdate` scrubber is mounted only while the chrome is visible (documented).
- **Auth `AnimatedBackground.js`** — UI-thread only, pauses on `AppState` background, respects
  reduce-motion, static grid lines.
- **`Skeleton`, `IncidentChatFab`** — UI-thread animations, properly cancelled, gated on visibility.
- **`console.*` usage** — only in `catch`/error paths, none in render/scroll/map callbacks.

---

## 4. Findings & plan

### TIER A — High impact, low risk (do first)

#### A1. Map markers re-rasterize continuously (`tracksViewChanges`)

- **Where:** `src/screens/Map/MapView.js` — the **resolved-mode** markers (lines ~98–132) render a
  custom `<View>` (icon container + arrow + callout) but **do not set `tracksViewChanges`**.
- **Why it kills FPS:** In `react-native-maps`, a `Marker` with custom children defaults to
  `tracksViewChanges={true}`, which makes the native map **re-render every marker to a bitmap on every
  frame** until it decides the view is stable. With the resolved feed paginated at 100/page (often
  hundreds of markers), this is a sustained CPU/GPU drain and the single largest frame-rate hit in the
  app. (The active-mode invisible tap-target marker already sets `tracksViewChanges={false}` at
  line 88 — the resolved branch was just missed.)
- **Fix (safe pattern):** Drive `tracksViewChanges` from state so each marker rasterizes **once**, then
  stops:
  - Add a `tracksViewChanges` boolean (default `true`) that flips to `false` shortly after the marker
    set renders (e.g., a `setTimeout(…, 500)` reset whenever `incidents` changes, or per-marker
    `onLayout`). Pass it to the resolved `<Marker tracksViewChanges={tracking}>`.
  - Why not just hard-code `false`? On some RN/maps versions a custom marker hard-set to `false` from
    the very first render can paint blank. The brief `true → false` window guarantees it draws, then
    freezes — this is the documented community pattern and preserves exact appearance.
- **Risk:** Very low. No visual change; markers look identical, they just stop re-rasterizing.

#### A2. Every marker is recreated on each pan/zoom

- **Where:** `src/screens/Map/MapScreen.js` wires `onRegionChange={setRegion}` →
  `onRegionChangeComplete` (line ~260), and `region` is passed to `MapView` as **`initialRegion`**
  only (`MapView.js:40`). The marker list is built inline via `incidents.filter(...).map(...)` inside
  `MapCanvas` on every render.
- **Why it kills FPS:** Each pan/zoom completion calls `setRegion`, re-rendering `MapScreen` →
  `MapCanvas` → rebuilding **all** `<Marker>`/`<Circle>` elements from scratch (new closures, full
  reconciliation, native re-diff). Combined with A1 this is why panning a busy map stutters. Note the
  `region` state isn't even used to control the live map (the map is uncontrolled via `initialRegion`),
  so these re-renders are essentially wasted work.
- **Fix:**
  1. **Memoize the marker children** inside `MapCanvas` with `useMemo`, keyed on
     `[incidents, showActiveOverlays, categoryDisplay, theme, onMarkerPress]`. Region changes then
     reuse the same element array → React sees no change → no marker recreation.
  2. Wrap `MapCanvas` in `React.memo`.
  3. Stabilize `onMarkerPress` in `MapScreen` with `useCallback` (currently an inline arrow at
     lines ~265–269) so the memo holds.
  4. *(Optional, verify first)* Since `region` only feeds `initialRegion`, the `setRegion` write on
     every pan could be dropped or throttled. **Recommendation: keep it** and rely on memoization (1–3)
     — that removes the cost without changing any behavior.
- **Risk:** Low. Pure render-path memoization; map interaction and marker taps unchanged.

> **A1 + A2 together** convert the Map from "recreate + re-raster hundreds of markers on every frame
> and every pan" to "build once, freeze, reuse." This is the headline improvement.

---

### TIER B — Medium impact, low risk

#### B1. My Reports re-renders the whole list on unrelated state changes

- **Where:** `src/screens/MyReports/MyReportsScreen.js` + `src/screens/MyReports/ReportItem.js`.
  - `renderItem` is an **inline arrow** (lines ~85–91).
  - `handleIncidentPress` / `handleIncidentLongPress` are recreated each render (not `useCallback`).
  - `ReportItem` is **not** wrapped in `React.memo` (`ReportItem.js:213`), and each row is heavy
    (severity/status badges, a 5-step progress track, constellation/duplicate notices, footer).
- **Why it kills FPS:** Any state change — notably opening the draft/delete `ConfirmModal`
  (`setDraftModalIncident` / `setDeleteModalIncident`) — re-renders **every** row in the list, not just
  the affected one. This shows up as a hitch when long-pressing a draft and during scroll.
- **Fix:**
  - Wrap `ReportItem` in `React.memo`.
  - Wrap `handleIncidentPress`, `handleIncidentLongPress` in `useCallback`.
  - Memoize `renderItem` with `useCallback`.
  - Add `FlatList` perf props to match the Community Feed: `initialNumToRender`, `maxToRenderPerBatch`,
    `windowSize`, `removeClippedSubviews`.
- **Risk:** Low. `ReportItem` is a pure function of `item`/`onPress`/`onLongPress`; memoizing is safe.

#### B2. Freeze background tabs (especially Map)

- **Where:** `index.js` / `src/navigation/*`. No `enableFreeze()` from `react-native-screens` is called,
  and the Map tab stays mounted once visited.
- **Why it matters:** A mounted `react-native-maps` view keeps consuming CPU/GPU even when you're on
  another tab; any background re-renders also compete with the foreground screen's frames.
- **Fix:** **Verify** current behavior first (RN Screens v4 + React Navigation v7 may already freeze
  blurred screens). If not active, call `enableFreeze(true)` from `react-native-screens` at the entry
  point, and/or set `freezeOnBlur: true` in the tab `screenOptions`.
- **Risk:** Low, but **test the Map tab specifically** — confirm it resumes correctly (markers,
  location) when refocused. Roll back if any tab shows a stale/frozen frame on return.

---

### TIER C — Low impact, but cheap & safe (free wins)

#### C1. Memoize context `value` objects
- **Where:** `src/context/ThemeContext.js` (line ~54) and `src/context/PreferencesContext.js`
  (line ~92) build their provider `value` object inline every render.
- **Why:** Each provider render hands consumers a new object identity, re-rendering **all** consumers
  (e.g., every `FeedCard` reads preferences via `useUserPreferences`). Providers re-render infrequently,
  so impact is small — but the fix is a trivial `useMemo`.
- **Fix:** Wrap each `value` in `useMemo` with the correct dependency list.
- **Risk:** Very low.

#### C2. `React.memo` on `NotificationItem`
- **Where:** `src/screens/Notifications/NotificationsScreen.js` (line ~28). `renderItem`/handlers are
  already stabilized; the item itself isn't memoized. Lists are short, so low priority.

#### C3. Hoist in-render component definitions in Incident Detail
- **Where:** `src/screens/IncidentDetailScreen.js` defines `Divider` (line ~131) and `SectionHeader`
  (line ~133) **inside** the render function → they unmount/remount on every re-render (e.g., opening
  the fullscreen photo modal toggles `fullscreenPhoto` state).
- **Fix:** Move them to module scope (pass `theme` as a prop) or memoize. Single-screen impact, but it's
  a clean correctness improvement.

#### C4. Memoize derived arrays in `FeedCard`
- **Where:** `src/screens/Home/FeedCard.js` (lines ~39–47) rebuilds `photoUrls`/`media` each render.
  Only matters when the memoized card re-renders, so minor. `useMemo` the `media` derivation.

#### C5. Consider `React.memo` on `AppText`
- **Where:** `src/components/Text.js`. Used everywhere; memoizing avoids re-running restyle prop
  resolution when a parent re-renders with unchanged text props. Benefit is limited because many call
  sites pass inline `style={{…}}` objects (new identity each render), so weigh before doing.

#### C6. Flatten Android elevation on list-item cards
- **Where:** `src/components/Card.js` applies `shadows.card` (`constants/spacing.js`: `elevation: 4` +
  shadow). `ReportItem` wraps each row in `Card`, so every scrolling row casts an Android elevation
  shadow (overdraw + shadow recompute during scroll).
- **Fix:** Use a flatter list-item style (hairline border instead of elevation) for rows — `FeedCard`
  already does exactly this (flat border, no `Card`) and is the precedent to follow.
- **Risk:** Low, but it's a **visual** change — confirm with design before applying.

---

### TIER D — Optional / larger changes (note, decide later)

- **D1. `expo-image` instead of RN `Image`** for remote feed/detail images (`FadeInImage.js`,
  `FeedCardMedia.js`, `IncidentDetailScreen.js`). Better memory/disk caching, downsampling, and
  smoother list scrolling. It's an Expo-maintained package (low risk) but a new dependency and a
  broader swap — do **after** Tier A/B and measure.
- **D2. Virtualize `IncidentTimeline`** (`src/components/IncidentTimeline.js:323–340`) — currently
  renders all messages in a `ScrollView` via `.map()`. Fine for short chats; if timelines can grow
  long, convert to a (possibly inverted) `FlatList`. Behavior-sensitive (auto-scroll-to-bottom + per
  item `entering` animation), so defer and test carefully.
- **D3. Marker clustering** on the resolved map (e.g., a clustering wrapper). If resolved marker counts
  are routinely high, clustering improves both FPS and readability — but it's a new dependency and a
  bigger change. Reassess after A1/A2 if the resolved map is still heavy.

---

## 5. Recommended order of implementation

1. **A1** — `tracksViewChanges` on resolved markers (biggest single win, isolated change).
2. **A2** — memoize markers + `MapCanvas` + `onMarkerPress`.
3. **B1** — My Reports list memoization.
4. **C1** — context `value` memoization (touches shared providers; do as one careful pass).
5. **B2** — verify/enable screen freezing (test Map refocus).
6. **C2–C5** — remaining small memos / hoists, opportunistically.
7. **C6** — flatten list-item elevation (needs design sign-off).
8. **D-tier** — only if measurements still show headroom.

Do Tier A as its own commit/PR and measure before moving on — it likely delivers most of the gain.

---

## 6. How to measure (before & after)

Establish a baseline so improvements are provable and regressions are caught:

- **In-app Perf Monitor** (Dev Menu → "Show Perf Monitor") — watch **both** JS and UI thread FPS while
  (a) scrolling the Community Feed fast, (b) panning/zooming the Map in **resolved** mode with many
  markers, (c) scrolling My Reports while opening the draft modal.
- **React DevTools Profiler / "Highlight updates"** — confirm that panning the Map no longer re-renders
  all markers, and that opening a My Reports modal no longer re-renders every row.
- Prefer testing a **release/production build on a real mid-range Android device** — dev mode and the
  JS debugger distort frame timings, and Android is where marker/elevation costs bite hardest.
- Capture the marker count used in the resolved-map test (it scales the A1/A2 benefit).

---

## 7. Guardrails — preserving behavior

- **No feature/visual changes** in Tier A/B (C6 and parts of D are the only visual-affecting items and
  are flagged for design sign-off).
- The `tracksViewChanges` fix uses the brief `true → false` window specifically to avoid blank-marker
  regressions.
- Map memoization keeps `region`/`setRegion` wiring intact (no behavior change to camera or taps).
- Screen freezing (B2) must be validated on the Map tab for correct resume before keeping it.
- Each tier should be a separate commit/PR with before/after Perf Monitor numbers attached.

---

## 8. File reference index

| Concern | File |
|--------|------|
| Map markers / `tracksViewChanges` | `src/screens/Map/MapView.js` |
| Map re-render on pan, marker recreation | `src/screens/Map/MapScreen.js`, `src/hooks/useMapRegion.js` |
| My Reports list | `src/screens/MyReports/MyReportsScreen.js`, `src/screens/MyReports/ReportItem.js` |
| Screen freezing | `index.js`, `src/navigation/TabNavigator.js`, `src/navigation/AppNavigator.js` |
| Context value memo | `src/context/ThemeContext.js`, `src/context/PreferencesContext.js` |
| In-render component defs | `src/screens/IncidentDetailScreen.js` |
| Feed card derived arrays | `src/screens/Home/FeedCard.js` |
| List-item elevation | `src/components/Card.js`, `constants/spacing.js` |
| Timeline virtualization (optional) | `src/components/IncidentTimeline.js` |
| Image library (optional) | `src/components/FadeInImage.js`, `src/screens/Home/FeedCardMedia.js` |
| Already-correct worklets setup | `babel.config.js` |
