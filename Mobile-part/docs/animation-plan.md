# Animation & Motion Plan — SafeSignal

How motion works across the app: **what** to animate, **where**, and — above all — **how to keep it
buttery smooth**. SafeSignal is a civic-safety app, so motion must feel **calm, fast, and
trustworthy**, never playful or showy.

> ## ⭐ North Star: smoothness over everything
> Every animation **must hold 60/120 fps on a mid-to-low-end Android phone**. If an effect can't be
> made smooth, **cut it** — a janky animation is worse than none. Smoothness beats richness, always.
> Concretely that means: run on the **UI thread** (Reanimated worklets), animate **only `transform` +
> `opacity`**, and **never block the JS thread or jank a scrolling list**.

---

## 1. Foundation (already installed — don't add heavy libs)

| Tool | Version | Role |
|---|---|---|
| **react-native-reanimated** | 4.1 (+ `react-native-worklets`) | UI-thread animations, entering/exiting/layout, gesture-driven values. The workhorse. |
| **@react-navigation/native-stack** | 7 | Native screen transitions + the interactive back gesture (free, native). |
| **react-native-screens** | 4.19 | Backs native-stack; predictive back, screen freezing. |
| **@shopify/restyle** | theming | Source for animated color targets (use sparingly). |

**Add only:** `expo-haptics` (tiny, high "feel" payoff). **Skip** Moti/Lottie/legacy `Animated` for now —
Reanimated covers ~90% of this. (Optional later: `expo-image` for built-in fade + faster decode on the
media-heavy feed.)

**Prerequisite:** the Reanimated/worklets **Babel plugin must be last** in `babel.config.js`. If it's
missing, Reanimated silently falls back to the JS thread and everything jank — verify this first.

---

## 2. Motion principles (the feel)

- **Calm & purposeful.** Ease-**out** curves, short durations (**160–300 ms**). **No spring overshoot /
  bounce** on serious content (reports, alerts, status).
- **Transform + opacity only.** Never animate `width`/`height`/`top`/`left`/`flex`/`margin` in a hot
  path — those trigger layout on every frame. Scale/translate/fade instead.
- **Never delay a safety action.** Reporting/confirming must stay instant; animation is garnish, never
  a gate. No artificial waits on the report flow.
- **Consistency via tokens.** One shared set of durations/easings/distances (see §3) — not ad-hoc
  numbers per screen.
- **Respect Reduce Motion.** Fall back to instant/opacity-only when the OS setting is on.

---

## 3. Motion tokens (single source of truth)

Create `src/theme/motion.js` so every animation pulls from the same values:

```js
import { Easing } from 'react-native-reanimated';

export const DURATION = {
  micro: 140,   // press feedback, toggles
  base:  220,   // entrances, fades
  page:  300,   // larger transitions
};

// Calm, no bounce. Ease-out for entrances, ease-in-out for moves.
export const EASING = {
  out:   Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
};

export const DISTANCE = {
  rise: 16,     // how far list items/sheets travel on entrance
  press: 0.97,  // scale on press
};
```

Everything below references these (`DURATION.base`, `EASING.out`, …).

---

## 4. The Smoothness Rulebook (this is the priority)

**Run it on the UI thread.**
- Use Reanimated **shared values + worklets**. Never drive an animation by `setState` in a loop — that
  re-renders React every frame and stutters.
- Don't read/write React state inside animation callbacks; use `useSharedValue` / `useAnimatedStyle`.

**Animate cheap properties only.**
- ✅ `translateX/Y`, `scale`, `opacity`, `rotate`.
- ❌ `width`, `height`, `top/left`, `flex`, `padding/margin`, and (mostly) `color`. For color, use
  `interpolateColor` on the UI thread and only on small elements.

**Keep lists smooth (the Community Feed is the highest risk).**
- Entrance animations (`FadeInDown`) are fine **on first mount**, but they can jank during fast scroll
  as rows recycle. Keep stagger small (≤ `i*40 ms`, cap the delay), and prefer a simple fade over
  layout animations in long lists.
- Tune the `FlatList`: `removeClippedSubviews`, `initialNumToRender`, `maxToRenderPerBatch`,
  `windowSize`, stable `keyExtractor`, and **`React.memo` on `FeedCard`** so unrelated state changes
  don't re-render every row.
- Don't run `onLayout`-driven measurement on every row mid-scroll.

**Defer heavy work past the transition.**
- Wrap non-urgent work (big fetches, expensive renders) in
  `InteractionManager.runAfterInteractions(...)` so it doesn't compete with an in-flight screen
  transition. Let the slide finish, *then* do the work.

**Images: fade, don't pop.**
- Fade the new feed media + illustrations in on `onLoad` (opacity 0→1, `DURATION.base`). Set explicit
  width/height so there's no reflow when they land. (Or adopt `expo-image` with `transition={220}`,
  which does this natively and decodes faster.)

**Free the JS thread.**
- No `console.log` in render/animation paths. Memoize derived values. Avoid re-creating callbacks/
  styles each render (`useCallback`, `useMemo`).
- Keep `react-native-screens` enabled (default). **Avoid `enableFreeze(true)`** here — freezing
  off-screen screens can release native `expo-video` surfaces and crash the player on return
  ("shared object already released"). Revisit only if the video lifecycle is hardened.

**Measure on the target device.**
- The smoothness bar is a **low-end Android**, not a flagship or the simulator. Profile with the
  Reanimated/Perf monitor; watch for frame drops on the feed scroll and screen push.

---

## 5. Navigation & transitions

### 5a. Interactive back-swipe gesture (edge-only) — a first-class deliverable

**The behavior we want:** swipe from the **left edge** and the current screen **tracks your finger in
real time** — drag it **back and forth**, the **previous screen peeks** behind with a subtle parallax,
and on **release** it **commits** (past a distance/velocity threshold) or **springs back to cancel**.
This is an *interactive* transition (progress bound to the gesture), not a fixed-duration animation.

**Decision: edge-only, globally.** Keep the swipe to the left **edge** only. **Do NOT enable
`fullScreenGestureEnabled`** — the feed media **carousel** ([FeedCardMedia.js](../src/screens/Home/FeedCardMedia.js))
and horizontal **chip / trending** rows would fight a whole-screen horizontal swipe.

**iOS — native & free.** `@react-navigation/native-stack` (what we use today) gives this exact
interactive pop gesture out of the box. Keep it on in [AppNavigator.js](../src/navigation/AppNavigator.js)
`screenOptions`:
```js
{ gestureEnabled: true, gestureDirection: 'horizontal' } // edge-only by default; never fullScreenGestureEnabled
// tune the edge hit area with gestureResponseDistance if needed
```

**Android — the honest caveat.** native-stack does **not** reproduce the iOS finger-dragged card on
Android by itself. Two ways to cover Android:
- **Predictive Back (recommended, smoothest):** set `android:enableOnBackInvokedCallback="true"` on
  `<application>` in `android/app/src/main/AndroidManifest.xml`. On Android 13/14+ the system renders a
  live predictive peek of the previous screen. Native, GPU-driven — matches our North Star.
- **Identical interactive drag on *all* Android:** only the JS-based **`@react-navigation/stack`**
  (gesture-handler + Reanimated) reproduces the exact finger-tracked drag-and-peek cross-platform.
  Tradeoff: transitions become **JS/Reanimated-driven, not native** — still smooth if disciplined, but
  higher jank risk on low-end devices, which competes with the smoothness North Star.

> **Status: DISCARDED (not needed right now).** We tried both routes:
> 1. native-stack + **Predictive Back** (manifest/config-plugin flag) — needs Android 13/14+ + a rebuild,
>    and is the system animation, not a finger-tracked card-drag; it didn't deliver.
> 2. JS **`@react-navigation/stack`** + `react-native-gesture-handler` — would give the real finger-drag
>    but adds native deps + a rebuild.
>
> Both were **reverted**: navigation is back on plain **native-stack** with simple `slide_from_right` /
> `slide_from_bottom` push transitions (no swipe-back gesture, no gesture-handler, no predictive-back
> flag/plugin). Revisit only if the interactive swipe-back becomes a priority.

### 5b. Screen transition presets

Set per-screen in [AppNavigator.js](../src/navigation/AppNavigator.js) `screenOptions`:

| Flow | `animation` | Why |
|---|---|---|
| Standard push (detail, lists) | platform default (`slide_from_right` feel) | native, expected |
| Report flow / modal-like screens | `slide_from_bottom` | reads as a "sheet" / task |
| Auth ↔ App switch | `fade` | calm context change |
| Tab switches (bottom-tabs) | quick cross-`fade` | subtle, no slide |

Keep transitions **native** (native-stack) rather than JS — it's the smoothest path and gives the
interactive gesture for free.

---

## 6. Animation inventory (tiered by impact ÷ effort)

Each item notes its **smoothness guardrail**.

### Tier 1 — high impact, low effort (do first)

| # | Animation | Where | Technique | Smoothness guardrail |
|---|---|---|---|---|
| 1 | **Screen transitions** | [AppNavigator.js](../src/navigation/AppNavigator.js) | native-stack `animation` presets (§5) | native = already smooth |
| 2 | **List entrance** | [CommunityFeed.js](../src/screens/Home/CommunityFeed.js) → [FeedCard.js](../src/screens/Home/FeedCard.js), Reports, [TrendingSection.js](../src/screens/Home/TrendingSection.js) | `Animated.View entering={FadeInDown.duration(base).delay(i*40)}` | cap stagger; `React.memo` rows; don't re-animate on scroll |
| 3 | **Skeleton shimmer** | existing skeletons in [myReportsStyles.js](../src/screens/MyReports/myReportsStyles.js); Map loading | one shared value driving a translateX gradient sweep | transform/opacity only; one loop, not per-row timers |
| 4 | **Image fade-in** | [FeedCardMedia.js](../src/screens/Home/FeedCardMedia.js) + [IncidentIllustration.js](../src/components/IncidentIllustration.js) | `onLoad` → opacity 0→1 | fixed dimensions (no reflow); or `expo-image` `transition` |
| 5 | **Press feedback** | [Button.js](../src/components/Button.js), [Card.js](../src/components/Card.js), feed/report cards | `Pressable` + `scale → DISTANCE.press` on pressIn | UI-thread shared value; no state |
| 6 | **Haptics** | report submit, confirm modals, pull-to-refresh, tab change | `expo-haptics` (`Light`/`Success`) | n/a — fire-and-forget |

### Tier 2 — nice polish

| # | Animation | Where | Notes |
|---|---|---|---|
| 7 | **Active filter-chip / tab indicator** | feed `FILTERS`, Reports `StatusFilterBar` | a sliding pill (translateX) behind the active chip |
| 8 | **Empty-state entrance** | [EmptyState.js](../src/components/EmptyState.js) | illustration gentle fade + small rise (`DISTANCE.rise`) |
| 9 | **Animated counters** | Safety Score, [TrendingSection.js](../src/screens/Home/TrendingSection.js) counts | count-up via shared value; round per frame |
| 10 | **Toast in/out** | [ToastContext.js](../src/context/ToastContext.js) | slide + fade from top/bottom |
| 11 | **Modal / ConfirmModal** | [Modal.js](../src/components/Modal.js), [ConfirmModal.js](../src/components/ConfirmModal.js) | backdrop fade + content scale 0.96→1 |
| 12 | **Category preview** | report flow — [IncidentIllustration](../src/components/IncidentIllustration.js) on select | fade + slight scale-in when a category is picked |

### Tier 3 — high "wow," higher effort/risk

| # | Animation | Where | Notes |
|---|---|---|---|
| 13 | **Shared-element transition** | feed card media/illustration → [IncidentDetailScreen.js](../src/screens/IncidentDetailScreen.js) hero | the image "morphs" into the detail hero; test carefully on Android |
| 14 | **Map marker drop/scale-in** | [MapScreen.js](../src/screens/Map/MapScreen.js) | stagger only a few; avoid animating dozens at once |
| 15 | **Theme crossfade** | [ThemeSection.js](../src/screens/Account/ThemeSection.js) toggle | brief crossfade on light/dark switch |

---

## 7. Accessibility — Reduce Motion

- Check once via Reanimated's `useReducedMotion()` (or `AccessibilityInfo.isReduceMotionEnabled()`).
- When on: **drop translations/scales, keep opacity-only or instant**. Transitions fall back to `fade`.
- A safety app should never make a user who needs stillness feel motion-sick.

---

## 8. Rollout order

1. **Foundation:** verify Babel plugin → add `src/theme/motion.js` → add `expo-haptics`.
2. **Tier 1** in this order: screen transitions → press feedback → image fade-in → list entrance →
   skeleton shimmer → haptics. (Biggest perceived-smoothness wins first.)
3. **Profile on a low-end Android** after Tier 1. Fix any feed-scroll jank before adding more.
4. **Tier 2**, then reassess whether Tier 3 is worth the risk.

---

## 9. Checklist

- [x] Babel reanimated/worklets plugin present & last
- [ ] `enableFreeze(true)` — **removed**: it can release native `expo-video` views (caused a "shared object already released" crash on the report detail). Re-add only if video is confirmed stable.
- [x] `src/theme/motion.js` tokens created; animations reference them
- [x] `expo-haptics` added; wired to submit / draft / confirm / refresh / tab change
- [ ] Interactive finger-tracked swipe-back — **DISCARDED/reverted** (native-stack + predictive back didn't deliver it; JS-stack route reverted). No swipe-back gesture for now.
- [x] Per-screen transitions: native-stack `slide_from_right` on push stacks, `slide_from_bottom` for report/witness; directional tab slide on the bottom tabs
- [x] Feed: `React.memo(FeedCard)` + FlatList perf props; used opacity-only `FadeIn` (no stagger) to stay scroll-safe
- [x] Images fade in on load (`FadeInImage` on feed media)
- [x] Skeleton pulse (`Skeleton` in MyReports loading)
- [x] Press feedback (`PressableScale` on feed cards + filter chips; Button already had it)
- [x] Entrances: EmptyState rise-fade, report category preview
- [x] Modal: backdrop fade + content scale/slide
- [x] Only `transform`/`opacity` animated in hot paths
- [x] Reduce-Motion: primitives gate via `useReducedMotion`; Reanimated entrances respect system setting
- [ ] **Deferred (need on-device iteration):** animated counters (TextInput-text trick), shared-element feed→detail, map marker drop-in, theme crossfade
- [ ] **Rebuild Android** for `expo-haptics` (native module) — `npx expo run:android`. (gesture-handler/masked-view were removed with the discarded swipe-back feature.)
- [ ] **Profile on a low-end Android — 60 fps on feed scroll & screen push**
