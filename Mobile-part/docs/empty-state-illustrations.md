# Empty-State Illustrations — SafeSignal

A single source of truth for every empty / error / success illustration in the mobile app:
**what** to make, **where** it goes, and a **detailed generation prompt** tuned to merge with
SafeSignal's **dark-mode** UI.

> SafeSignal is a **civic safety / community incident-reporting** app. The illustration tone is
> **calm, trustworthy, supportive, community-minded** — *not* the playful, cartoonish vibe of a
> food-delivery app. Think "reassuring public-service design," not "mascot."
>
> **All illustrations are designed for the app's dark theme:** luminous aqua-teal hero shapes that
> glow softly against a deep midnight-navy canvas, with off-white text and muted steel-blue details.
> Prompts use **named colors**, not hex — generators interpret descriptive color names far more
> reliably. The hex equivalents are in §1 only for wiring the code.

---

## 1. Design DNA (read this before generating anything)

Pulled from the **dark theme** in [constants/theme.js](../../constants/theme.js) and
[constants/typography.js](../../constants/typography.js). Every illustration must read as if it belongs
on the app's dark screens.

### Named color vocabulary (use the NAME in prompts; hex is only for code)

| Name to write in prompts | What it is | Hex (code only) |
|---|---|---|
| **bright aqua-teal** / **turquoise** | the hero accent — glows on dark | `#2DD4BF` |
| **deep teal** | shadow/edge of the teal shapes | `#14B8A6` |
| **soft sky blue** | secondary accent | `#60A5FA` |
| **deep midnight navy** | the canvas / background | `#0F1729` |
| **dark slate blue** | raised surfaces, card fills | `#1E293B` |
| **muted slate gray** | neutral line work & props | `#94A3B8` |
| **pale steel blue** | secondary detail / soft text | `#C7D2E3` |
| **near-white / off-white** | highlights, paper, small text | `#F8FAFC` |
| **mint green** | success / "all clear" only | `#34D399` |
| **warm amber** | caution only | `#F59E0B` |
| **soft coral red** | error only | `#F87171` |
| **translucent teal glow** | the halo blob behind the subject | `#2DD4BF` @ 20% |

### Style rules (apply to EVERY prompt)

- **Flat vector**, geometric, soft **rounded** corners — no skeuomorphism, no realism.
- **No harsh gradients, no drop shadows, no photo texture, no fine detail.** A single subtle inner glow
  on the teal hero shape is allowed (that's the dark-mode "lift"); everything else is flat color.
  Keeping it flat is what keeps the SVG small, crisp, and cleanly traceable.
- **One consistent line weight** (~2px relative) if outlined, or pure flat shapes with no outline.
- **Single centered subject**, lots of negative space, sitting inside a soft **translucent teal glow**
  blob so it lifts off the dark canvas.
- **2–3 colors + neutrals max.** Lead with aqua-teal; sky blue is the usual secondary; status colors
  (mint / amber / coral) appear only on the state that needs them, and only as a small accent.
- **1:1 square**, subject occupies ~70% of the frame.
- **Background: deep midnight navy** (so it sits seamlessly on the dark app) **OR transparent** if you
  prefer the app to supply the navy. Pick one and keep it consistent across all 9.
- Human figures (if used) are **diverse, simple, minimal/faceless**, civic and everyday — never comical.
- Every shape must look **luminous against dark**, never muddy: favor the bright aqua-teal, sky blue,
  off-white, and pale steel; avoid dark-on-dark.

### Dark-only, single asset

Because the whole set targets dark mode, **one asset per state** is enough — no light/dark variants
needed. If you later add a light theme, you'd regenerate with the light palette, but that's out of
scope here.

---

## 2. Where the files live

```
Mobile-part/
  assets/
    illustrations/            ← CREATE THIS
      empty-reports.svg
      empty-feed.svg
      empty-map.svg
      empty-notifications.svg
      empty-timeline.svg
      empty-search.svg
      error-network.svg
      error-generic.svg
      success-submitted.svg
```

A **single reusable component** consumes them (see §4). Per-illustration wiring is in §3.

---

## 3. The illustrations to make

Status legend: **[exists]** = screen already has a placeholder to upgrade · **[new]** = add it.
Each prompt is structured so you can paste it straight into Recraft / an image model, or hand it to a
designer as a brief.

---

### 3.1 `empty-reports.svg` — "No reports yet" **[exists]**

- **Screen:** [MyReports/EmptyReportsState.js](../src/screens/MyReports/EmptyReportsState.js) —
  currently a plain Ionicon (`document-text-outline`) in a tinted circle. Replace the `<View>`+`<Ionicons>`
  block (lines 23–25) with the illustration.
- **When shown:** user has submitted no incident reports (also per-filter: drafts / resolved / etc.).
- **Message pairing:** "No reports yet" + "You haven't submitted any incident reports yet."

```json
{
  "concept": "empty_reports",
  "subject": "a single clean document/report sheet standing upright with one corner gently folded, a small bright aqua-teal checkmark badge on it, and three short rounded placeholder text lines in pale steel blue",
  "composition": "the document is centered and tilted ~8 degrees, floating just above a soft translucent teal glow blob that lifts it off the dark canvas; very generous negative space all around so it feels light and uncluttered",
  "style": "flat vector illustration, geometric with soft rounded corners, modern public-service aesthetic, single consistent 2px line weight",
  "line_treatment": "thin off-white outlines where edges meet the dark background so shapes stay crisp and luminous",
  "colors": "document body in dark slate blue with off-white edges, the checkmark badge in bright aqua-teal, placeholder lines in pale steel blue, the backing halo as a translucent teal glow; everything must glow against deep midnight navy",
  "lighting": "subtle inner glow on the teal checkmark only; no drop shadows, no harsh gradients",
  "mood": "calm, encouraging, a clean fresh start",
  "background": "deep midnight navy (matches the app's dark screens)",
  "do_not": ["no human face", "no realistic paper texture", "no off-palette colors", "no busy detail", "no red"],
  "output": "1:1 square, flat vector / SVG-friendly, single centered subject occupying ~70% of the frame"
}
```

---

### 3.2 `empty-feed.svg` — "No community reports yet" **[exists]**

- **Screen:** [Home/CommunityFeed.js](../src/screens/Home/CommunityFeed.js) — `EMPTY_MESSAGES` block
  (lines 39–45) renders text only. Add the illustration above the message in the list's empty component.
- **When shown:** the community feed (and its filters: resolved / arrest / false-alarm / filed) is empty.
- **Message pairing:** "No community reports yet" + "Check back later."

```json
{
  "concept": "empty_community_feed",
  "subject": "three simple stacked feed cards (rounded rectangles) fanned with a slight flat offset, the top card carrying a small bright aqua-teal location pin, suggesting a calm community noticeboard at rest",
  "composition": "the card stack is centered on a soft translucent teal glow blob, depth implied only by flat offset (never shadow); airy negative space framing the group",
  "style": "flat vector illustration, geometric with soft rounded corners, modern civic aesthetic, consistent 2px line weight",
  "line_treatment": "off-white hairline edges on the cards so they separate cleanly against the dark canvas",
  "colors": "cards in dark slate blue with off-white top edges, location pin in bright aqua-teal, one accent line on a card in soft sky blue, backing halo as translucent teal glow",
  "lighting": "faint inner glow on the teal pin only; flat elsewhere",
  "mood": "quiet, peaceful neighborhood, all calm",
  "background": "deep midnight navy",
  "do_not": ["no human face", "no real photos inside the cards", "no off-palette colors", "no clutter", "no red"],
  "output": "1:1 square, flat vector / SVG-friendly, single centered subject group occupying ~70% of the frame"
}
```

---

### 3.3 `empty-map.svg` — "All clear here" **[new]**

- **Screen:** [Map/MapScreen.js](../src/screens/Map/MapScreen.js) — overlay/banner shown when the current
  map viewport + timeframe filter returns zero incidents.
- **Message pairing:** "All clear here" + "No incidents reported in this area for the selected timeframe."

```json
{
  "concept": "empty_map_all_clear",
  "subject": "a simplified folded map fragment with faint grid/route lines, a single soft location pin rising from its surface, and a small mint-green check tucked beside the pin to signal a safe, clear area",
  "composition": "the map fragment is centered and tilted slightly, resting on a soft translucent teal glow blob, with the pin as the tallest focal point; lots of breathing room around it",
  "style": "flat vector illustration, geometric with soft rounded corners, modern mapping aesthetic, consistent 2px line weight",
  "line_treatment": "off-white and pale-steel route lines on the map so it reads clearly against dark navy",
  "colors": "map surface in dark slate blue, route lines in pale steel blue, the pin in bright aqua-teal, the small check in mint green, backing halo as translucent teal glow",
  "lighting": "subtle glow on the teal pin; flat map surface",
  "mood": "reassuring, safe, nothing to worry about",
  "background": "deep midnight navy",
  "do_not": ["no human face", "use mint green only for the tiny check", "no off-palette colors", "no red alarm imagery"],
  "output": "1:1 square, flat vector / SVG-friendly, single centered subject occupying ~70% of the frame"
}
```

---

### 3.4 `empty-notifications.svg` — "You're all caught up" **[new]**

- **Screen:** notifications surface (FCM-driven; tied to the recent notification work and
  [Account/AccountScreen.js](../src/screens/Account/AccountScreen.js)).
- **Message pairing:** "You're all caught up" + "New alerts about your reports and your area will show here."

```json
{
  "concept": "empty_notifications",
  "subject": "a single rounded, friendly notification bell at rest (not ringing), with a tiny bright aqua-teal sparkle near its top and a small off-white 'zero' or empty badge where the count would be",
  "composition": "the bell is centered on a soft translucent teal glow blob, with one or two tiny floating dots above it for lightness; generous empty space so it feels tidy and resolved",
  "style": "flat vector illustration, geometric with soft rounded corners, modern UI aesthetic, consistent 2px line weight",
  "line_treatment": "clean off-white outline on the bell so it glows against the dark canvas",
  "colors": "bell body in dark slate blue with off-white edge and a bright aqua-teal highlight band, sparkle in bright aqua-teal, floating dots in soft sky blue, backing halo as translucent teal glow",
  "lighting": "gentle glow on the sparkle and the teal highlight; flat elsewhere",
  "mood": "calm, tidy, nothing urgent, a sense of being on top of things",
  "background": "deep midnight navy",
  "do_not": ["no red badge", "bell must not look like it is ringing or alarming", "no human face", "no off-palette colors"],
  "output": "1:1 square, flat vector / SVG-friendly, single centered subject occupying ~70% of the frame"
}
```

---

### 3.5 `empty-timeline.svg` — "No updates yet" **[exists]**

- **Screen:** [components/IncidentTimeline.js](../src/components/IncidentTimeline.js) (line ~258, "No
  messages yet") — the witness / incident timeline thread when there are no updates.
- **Message pairing:** "No updates yet" + "Witness updates and status changes will appear here."

```json
{
  "concept": "empty_timeline",
  "subject": "two simple empty rounded speech bubbles (one bright aqua-teal, one soft sky blue, no text inside) sitting above a short vertical timeline made of a thin line with two small node dots",
  "composition": "the bubbles are centered and slightly overlapping above the short timeline, all resting on a soft translucent teal glow blob; the vertical timeline implies updates are expected over time; airy negative space",
  "style": "flat vector illustration, geometric with soft rounded corners, modern messaging aesthetic, consistent 2px line weight",
  "line_treatment": "off-white edges on the bubbles and an off-white timeline line so the structure reads against dark navy",
  "colors": "one bubble bright aqua-teal, one soft sky blue, timeline line and nodes in pale steel blue, backing halo as translucent teal glow",
  "lighting": "subtle glow on the teal bubble; flat elsewhere",
  "mood": "quiet, waiting, an open channel ready for updates",
  "background": "deep midnight navy",
  "do_not": ["no text glyphs inside the bubbles", "no human face", "no off-palette colors", "no red"],
  "output": "1:1 square, flat vector / SVG-friendly, single centered subject group occupying ~70% of the frame"
}
```

---

### 3.6 `empty-search.svg` — "Nothing matches" **[new]**

- **Screen:** any filtered list that returns nothing (e.g. Reports `StatusFilterBar`, Map
  `CategoryFilterBar`, future search). The "no matches for this filter" state.
- **Message pairing:** "Nothing matches" + "Try changing your filters or timeframe."

```json
{
  "concept": "empty_search_results",
  "subject": "a rounded magnifying glass with a bright aqua-teal rim and clear lens, overlapping the corner of a faint placeholder list card that has a few short empty rows, suggesting a search that came back empty",
  "composition": "the magnifying glass sits over the lower-right corner of the faint card, the pair centered on a soft translucent teal glow blob; calm and informational, not alarming; generous negative space",
  "style": "flat vector illustration, geometric with soft rounded corners, modern UI aesthetic, consistent 2px line weight",
  "line_treatment": "off-white outline on the magnifier and pale-steel rows on the card",
  "colors": "magnifier rim and handle in bright aqua-teal, lens a faint off-white tint, placeholder card in dark slate blue with pale steel blue rows, backing halo as translucent teal glow",
  "lighting": "soft glow on the teal rim; flat card",
  "mood": "neutral, gently informative — this is a 'no results', not an error",
  "background": "deep midnight navy",
  "do_not": ["no red", "no X or error mark", "no human face", "no off-palette colors"],
  "output": "1:1 square, flat vector / SVG-friendly, single centered subject occupying ~70% of the frame"
}
```

---

### 3.7 `error-network.svg` — "Connection lost" **[new]**

- **Screen:** shared error states across [Map/MapScreen.js](../src/screens/Map/MapScreen.js),
  [Home/CommunityFeed.js](../src/screens/Home/CommunityFeed.js), and any failed fetch with retry.
- **Message pairing:** "Connection lost" + "Check your network and try again." + Retry button.

```json
{
  "concept": "error_network_offline",
  "subject": "a friendly rounded cloud with a broken/segmented signal arc above it (a small gap in the arc showing the disconnect), calm rather than alarming",
  "composition": "the cloud is centered on a soft translucent teal glow blob, the broken signal arc rising from its top with a clear gap; a tiny warm-amber dot marks the break; lots of negative space",
  "style": "flat vector illustration, geometric with soft rounded corners, modern connectivity aesthetic, consistent 2px line weight",
  "line_treatment": "off-white outline on the cloud, pale-steel signal arc with one segment in warm amber at the break",
  "colors": "cloud in dark slate blue with off-white edge, signal arc in pale steel blue, the break marker in warm amber, backing halo as translucent teal glow (keep the overall feel cool and calm)",
  "lighting": "flat; only a faint glow on the amber break marker",
  "mood": "a calm, clearly recoverable problem — reassuring, 'just reconnect'",
  "background": "deep midnight navy",
  "do_not": ["no aggressive red", "use warm amber sparingly only at the break", "no human face", "no off-palette colors", "no panic imagery"],
  "output": "1:1 square, flat vector / SVG-friendly, single centered subject occupying ~70% of the frame"
}
```

---

### 3.8 `error-generic.svg` — "Something went wrong" **[new]**

- **Screen:** fallback error boundary / unexpected failure across screens.
- **Message pairing:** "Something went wrong" + "We hit a snag. Please try again." + Retry button.

```json
{
  "concept": "error_generic",
  "subject": "a warning triangle softened into a friendly rounded shape with a small exclamation, paired with a circular refresh/retry arrow curving around its lower side to signal recoverability",
  "composition": "the softened triangle is centered on a soft translucent teal glow blob, the refresh arrow sweeping around it in bright aqua-teal; balanced and calm, never aggressive; generous negative space",
  "style": "flat vector illustration, geometric with soft rounded corners, modern UI aesthetic, consistent 2px line weight",
  "line_treatment": "off-white outline on the triangle, smooth aqua-teal refresh arrow",
  "colors": "triangle in warm amber softened with an off-white edge, exclamation in off-white, refresh arrow in bright aqua-teal, backing halo as translucent teal glow",
  "lighting": "subtle glow on the teal refresh arrow; flat triangle",
  "mood": "honest but reassuring — a snag, easily retried",
  "background": "deep midnight navy",
  "do_not": ["no harsh red", "keep the amber soft and rounded, not aggressive", "no human face", "no off-palette colors"],
  "output": "1:1 square, flat vector / SVG-friendly, single centered subject occupying ~70% of the frame"
}
```

---

### 3.9 `success-submitted.svg` — "Report submitted" **[new, optional]**

- **Screen:** after submitting via [ReportIncidentScreen.js](../src/screens/ReportIncidentScreen.js)
  and/or the [WitnessPromptScreen.js](../src/screens/WitnessPromptScreen.js) confirmation. Not an "empty"
  state but uses the same family.
- **Message pairing:** "Report submitted" + "Thanks for keeping your community safe."

```json
{
  "concept": "success_report_submitted",
  "subject": "a single rounded safety shield with a clean off-white checkmark inside, reading as community protection (not military), with two or three tiny celebratory dots drifting upward around it",
  "composition": "the shield is centered on a soft translucent teal glow blob, checkmark crisp in the middle, small accent dots floating up and outward for a gentle celebratory feel; airy negative space",
  "style": "flat vector illustration, geometric with soft rounded corners, modern civic aesthetic, consistent 2px line weight",
  "line_treatment": "off-white outline and checkmark so the shield glows against dark navy",
  "colors": "shield in bright aqua-teal with a mint-green inner accent, checkmark off-white, floating dots in soft sky blue and mint green, backing halo as translucent teal glow",
  "lighting": "soft glow on the teal/mint shield to feel celebratory; flat dots",
  "mood": "positive, civic pride, gratitude, reassurance",
  "background": "deep midnight navy",
  "do_not": ["shield must read as safety not military/police", "no human face", "no off-palette colors", "no red"],
  "output": "1:1 square, flat vector / SVG-friendly, single centered subject occupying ~70% of the frame"
}
```

---

## 4. The component that renders them (one place, reused)

Build a single `EmptyState` so every screen looks identical and on-brand. Wire it to the theme so the
heading uses Outfit and the body uses Source Sans, exactly like the rest of the app.

Suggested location: `Mobile-part/src/components/EmptyState.js`, re-exported from
[components/index.js](../src/components/index.js).

```jsx
import React from 'react';
import { View } from 'react-native';
import { AppText, Button } from './';
import { useTheme } from '../context/ThemeContext';

// illustration = an imported .svg component (via react-native-svg-transformer)
export default function EmptyState({ illustration: Art, title, message, actionLabel, onAction }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      {Art ? <Art width={160} height={160} /> : null}
      <AppText variant="h4" style={{ color: theme.text, marginTop: 24, textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="body" style={{ color: theme.textSecondary, marginTop: 8, textAlign: 'center' }}>
        {message}
      </AppText>
      {actionLabel ? <Button title={actionLabel} onPress={onAction} style={{ marginTop: 20 }} /> : null}
    </View>
  );
}
```

### Enabling SVG imports (one-time)

```bash
cd Mobile-part
npx expo install react-native-svg react-native-svg-transformer
```

Then update [Mobile-part/metro.config.js](../metro.config.js) to route `.svg` through the transformer
(move `svg` from `assetExts` to `sourceExts`). After that:

```jsx
import EmptyReportsArt from '../../../assets/illustrations/empty-reports.svg';
<EmptyState
  illustration={EmptyReportsArt}
  title="No reports yet"
  message="You haven't submitted any incident reports yet."
  actionLabel="Submit your first report"
  onAction={onReportPress}
/>
```

> PNG fallback (no transformer): drop a `@3x` PNG and use `<Image source={require(...)}
> style={{ width: 160, height: 160 }} resizeMode="contain" />`.

> Because the art is drawn on **deep midnight navy**, it sits seamlessly on dark screens. If you later
> add a light theme, regenerate the set with a light palette — don't reuse these on a white background.

---

## 5. Generation workflow (to keep the set consistent)

1. **Lock the style once.** Pick a tool that holds style across images — **Recraft.ai** (native SVG +
   style-lock) is ideal; otherwise generate all 9 in one session, keeping the §1 `style` /
   `line_treatment` / `colors` language identical and changing only `concept` / `subject` /
   `composition`.
2. **Normalize the colors after export.** Open each SVG and snap fills to the exact §1 hexes
   (`#2DD4BF`, `#60A5FA`, `#0F1729`, `#1E293B`, `#94A3B8`, `#C7D2E3`, `#F8FAFC`, plus mint/amber/coral)
   so every asset shares identical colors — generators drift slightly.
3. **Strip cruft.** Run each SVG through **SVGO** (`npx svgo *.svg`).
4. **If you only got PNGs**, trace with **Vectorizer.ai** or Inkscape *Trace Bitmap (multiple colors)* —
   only viable because the style is flat with no gradients (that's why §1 forbids them).
5. **Sanity check on a real dark screen** — drop each into `EmptyState` and view it on the app's dark
   background before committing; confirm nothing reads dark-on-dark or muddy.

---

## 6. Quick checklist

- [ ] `assets/illustrations/` folder created
- [ ] 6 core states made: reports, feed, map, notifications, timeline, search
- [ ] 2 error states made: network, generic
- [ ] (optional) success-submitted made
- [ ] All assets drawn for **dark mode**: luminous teal/sky/off-white on deep midnight navy
- [ ] All assets use ONLY the §1 color vocabulary, flat (no gradients/shadows beyond the one subtle glow)
- [ ] `react-native-svg` + transformer installed, `metro.config.js` updated
- [ ] `EmptyState` component built and re-exported from `components/index.js`
- [ ] Existing placeholders replaced (MyReports, CommunityFeed, IncidentTimeline)
- [ ] Verified on the app's dark screens
