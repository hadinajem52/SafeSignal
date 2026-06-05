# Incident-Type Illustrations — SafeSignal

Character-driven illustrations (with **human elements**, Toters-style) for each incident **category**.
They share the exact visual DNA of the
[empty-state illustrations](./empty-state-illustrations.md) — dark-mode canvas, luminous glow, flat
geometric vector — but add a simple person reacting to / reporting / responding to the scene, and lead
with **each category's own semantic color** instead of always teal.

> Same family, two jobs: empty-states use **objects** on a teal glow; incident types use **people**
> on the **category's color** glow, with teal kept as a small unifying accent so the whole set still
> reads as one system.

> **Note on categories:** the 10 categories below are the real ones in
> [constants/incident.js](../../constants/incident.js). There is **no separate "shooting" category** —
> a shooting maps to **assault** and/or **medical_emergency** at **critical** severity. Stick to these 10.

---

## 1. Shared design DNA (inherits from the empty-state set)

Read §1 of [empty-state-illustrations.md](./empty-state-illustrations.md) for the full named-color
vocabulary and style rules. The same rules apply here:

- **Flat vector**, geometric, soft rounded corners, single consistent ~2px line weight.
- **Deep midnight navy** background (the app's dark canvas), subject on a **translucent glow blob**.
- One **subtle inner glow** on the hero shape for the dark-mode lift; otherwise flat — **no harsh
  gradients, no drop shadows, no photo texture**.
- **Off-white / pale-steel** line work and neutral props; **dark slate blue** for environment fills.
- Single centered focal scene, **1:1 square**, subject ~70% of frame.

**What's different from the empty states:**

1. **Lead color = the category's semantic color** (see each prompt), used for the hero element and the
   backing glow blob. **Bright aqua-teal stays as a small secondary accent** (e.g. the reporter's
   jacket, a phone screen, a small UI badge) so every incident illustration still belongs to the
   SafeSignal family.
2. **A human element is required** (see §2).

---

## 2. Human-element guidelines (one shared style family, varied people)

The goal is **variety of people, one consistent style** — exactly like the **Toters** illustration
set: every scene shows a *different* person (varied hair, gender, age, build — **skin is always
transparent/unfilled, never a color**), yet all are
drawn in the **same flat-vector family** so the whole set feels cohesive. The mismatch we're fixing
is people drawn in *different styles* — not the fact that they're different people.

> **Important — every prompt is standalone.** The image generator only ever sees **one JSON prompt at
> a time, with no shared memory and no reference image.** So the full people-style DNA below must be
> written *into each prompt's `human_element`* (it already is in §5) — never write "same person as the
> others" or "per §2," because the model can't see the others.

**The shared style family — keep these CONSTANT in every prompt:**

- Modern **flat-vector**, Toters / Storyset–like: **rounded geometric body, friendly slightly-stylized
  proportions**, minimal facial detail with a **small calm neutral expression** (never
  exaggerated, comical, fearful, or aggressive).
- **Transparent / no-fill skin** — the **face and hands are left unfilled**, so the deep-navy canvas
  shows straight through them; they're defined **only by the ~2px off-white outline** and a few
  minimal off-white features (small eyes, soft brows). **No skin color anywhere on any figure.**
- Single **~2px off-white outline**; clothing in **flat fills** with **one soft inner shade** for the
  dark-mode lift — no realistic rendering, no gradient shading, no photo texture.
- Same **head-to-body ratio and line weight** every time, so the ten people read as siblings.

**What VARIES per scene — for an inclusive, Toters-style range:**

- **The person** — vary **hairstyle, hair color, gender, age, build, and accessories** (glasses, cap,
  beard) each time; **never** use skin tone to differentiate (skin is always transparent). No
  stereotyping by category.
- **The pose/action** — pointing, phoning it in, observing, helping. They are the **reporter /
  responder / aware bystander**, never the focus of harm.

**Constant brand tie:** give each person a **bright aqua-teal garment** (jacket, scarf, vest, or
armband) **and** an **aqua-teal phone screen**, so every illustration still reads as SafeSignal.

- **One figure per scene.**

---

## 3. Sensitivity & tone (mandatory — these are crime & emergency topics)

This is a civic-safety app; the art must be **respectful, calm, and non-graphic**. For **every** prompt:

- **No blood, no gore, no injuries, no weapons shown in use, no visible victims in distress.**
- **No depiction of the violent act itself.** Show the **aftermath, the response, the awareness, or
  the reporting** — a person calling it in, pointing it out, standing safely back, helping.
- Keep faces **calm/neutral**, never terrified or comical.
- Convey *"a safe person responsibly reporting/responding,"* not *"a victim being harmed."*
- When in doubt, abstract it (a symbol + an aware bystander) rather than literal.

---

## 4. Where they go in the app

| Placement | Size | Variant to use | How it's used |
|---|---|---|---|
| **Incident Detail hero** ([IncidentDetailScreen.js](../src/screens/IncidentDetailScreen.js), header card ~line 130) | ~160–200px | **hero** (full scene + human) | When a report has **no uploaded photo/media**, show the category illustration as the hero banner instead of a blank header. |
| **Community feed card** ([Home/FeedCard.js](../src/screens/Home/FeedCard.js)) | ~64px leading thumbnail | **badge** | Add a small square illustration on the **left of the card**, content to its right. Picked per `incident.category`. (Card is currently text-only — see §4a.) |
| **Trending This Week box** ([Home/TrendingSection.js](../src/screens/Home/TrendingSection.js), `trendingIcon` slot) | ~52px | **badge** | Replace the 38px Ionicon tile with a ~52px illustration tile, keyed by `cat.category`. (Box is 250px wide, horizontal row — see §4a.) |
| **Report flow — selected-category preview** ([IncidentCategoryPicker.js](../src/components/IncidentForm/IncidentCategoryPicker.js)) | ~120px | **hero** | The 3-col grid cells (84px) are **too small** — keep the existing Ionicons there. Show the **hero** illustration larger once a category is picked (a preview above the grid, or on a review/confirm step). |

### 4a. Two size variants (important — the detail won't survive shrinking)

The full human scenes are authored for **≥120px**. At feed-thumbnail (~64px) and trending (~52px)
sizes the figure and props turn to mush. So produce **two renders per category**:

- **`hero`** — the full scene described in §5 (human + props + color glow). For the detail hero and the
  category preview (**≥120px**).
- **`badge`** — the **same scene simplified to its hero symbol + color glow, with the human removed**
  (e.g. fire → just the stylized flame on its orange glow blob; medical → just the cross + kit). Same
  palette, same glow, same family — just legible small. For the feed card and trending box (**≤64px**).

> The `badge` variant is essentially a richer, illustrated version of today's category Ionicon — so it
> drops into the small slots cleanly while still feeling like the new illustration set.

File location (PNG, same format decision as the empty states — these have humans + glow, so **do not
vectorize**; export PNG `@2x`/`@3x` from Figma, transparent background):

```
Mobile-part/assets/illustrations/incidents/
  hero/                          badge/
    theft.png  @2x  @3x            theft.png  @2x  @3x
    assault.png ...                assault.png ...
    vandalism.png                  vandalism.png
    suspicious-activity.png        suspicious-activity.png
    traffic-incident.png           traffic-incident.png
    noise-complaint.png            noise-complaint.png
    fire.png                       fire.png
    medical-emergency.png          medical-emergency.png
    hazard.png                     hazard.png
    other.png                      other.png
```

(See §6 for the keyed component that resolves `category` + `variant`.)

---

## 5. The illustrations to make (one per category)

Each prompt is structured to paste into Recraft / an image model or hand to a designer.
`hero_color` = the category's semantic color; `accent` = aqua-teal unifying brand accent.

> Each prompt below is the **`hero`** variant (full scene + human). To make the **`badge`** variant,
> reuse the same prompt but **remove the `human_element`**, keep only the `hero_color` symbol/props on
> the glow blob, and add `"badge variant: single centered symbol, no human, no text, reads clearly at
> 48px"` to the prompt. Same palette, same glow.

---

### 5.1 `theft.png` — Theft

```json
{
  "concept": "incident_theft",
  "hero_color": "warm coral red",
  "scene": "a small handbag or wallet with a motion swoosh suggesting it was just snatched, and a person nearby reacting and reaching for their phone to report it",
  "human_element": "a woman with a shoulder-length dark-brown bob, drawn in the shared SafeSignal people style (modern flat-vector, Toters/Storyset-like, rounded geometric friendly proportions, minimal calm neutral features; TRANSPARENT no-fill skin — face and hands unfilled so the navy background shows through, defined only by the ~2px off-white outline; no skin color; clothing in flat fills with one soft inner shade); wearing an open bright aqua-teal jacket, holding up her aqua-teal phone screen to report the theft; calm/alert posture",
  "composition": "figure on one side, the bag mid-motion on the other, both on a soft translucent warm-coral glow blob; airy negative space",
  "style": "flat vector, geometric, soft rounded corners, consistent 2px line weight, modern civic aesthetic",
  "line_treatment": "off-white outlines so shapes glow on dark navy",
  "colors": "hero elements in warm coral red, the reporter's phone/jacket accent in bright aqua-teal, environment in dark slate blue, details in pale steel blue and off-white, backing glow a translucent warm coral",
  "lighting": "subtle glow on the coral hero element; flat elsewhere",
  "mood": "alert but calm, responsible reporting",
  "background": "deep midnight navy",
  "do_not": ["no violence", "no physical struggle", "no weapons", "no fearful faces", "no off-palette colors"],
  "output": "1:1 square, flat vector / PNG with transparent areas, subject ~70% of frame"
}
```

---

### 5.2 `assault.png` — Assault

```json
{
  "concept": "incident_assault",
  "hero_color": "deep crimson red",
  "scene": "an abstract alert/exclamation shield symbol indicating a personal-safety incident, with an aware bystander stepping in to call for help — NO depiction of the act itself",
  "human_element": "a man with short black hair, drawn in the shared SafeSignal people style (modern flat-vector, Toters/Storyset-like, rounded geometric friendly proportions, minimal calm neutral features; TRANSPARENT no-fill skin — face and hands unfilled so the navy background shows through, defined only by the ~2px off-white outline; no skin color; clothing in flat fills with one soft inner shade); wearing a bright aqua-teal jacket, in a calm protective posture — one hand raised in a 'stop/safe' gesture, the other holding his aqua-teal phone to call for help, NO HAPPY FACE BUT CONCERNED",
  "composition": "figure beside a softened alert symbol, both on a translucent deep-crimson glow blob; lots of negative space; tone is protective, not violent",
  "style": "flat vector, geometric, soft rounded corners, consistent 2px line weight",
  "line_treatment": "off-white outlines for crisp glow on dark navy",
  "colors": "alert symbol in deep crimson red, the reporter's aqua-teal jacket and phone screen in bright aqua-teal, environment dark slate blue, details pale steel blue and off-white, backing glow translucent crimson",
  "lighting": "subtle glow on the crimson symbol; flat figure",
  "mood": "protective, supportive, someone stepping up to help",
  "background": "deep midnight navy",
  "do_not": ["NEVER show the assault, a victim, bodies, blood, or weapons", "no fighting", "no fearful/aggressive faces", "keep it abstract and protective", "no off-palette colors"],
  "output": "1:1 square, flat vector / PNG with transparent areas, subject ~70% of frame"
}
```

---

### 5.3 `vandalism.png` — Vandalism

```json
{
  "concept": "incident_vandalism",
  "hero_color": "warm amber-orange",
  "scene": "a wall or property with a few stylized spray-paint marks / a cracked surface, and a resident noticing and documenting it",
  "human_element": "a young woman with short curly natural hair, drawn in the shared SafeSignal people style (modern flat-vector, Toters/Storyset-like, rounded geometric friendly proportions, minimal calm neutral features; TRANSPARENT no-fill skin — face and hands unfilled so the navy background shows through, defined only by the ~2px off-white outline; no skin color; clothing in flat fills with one soft inner shade); wearing a bright aqua-teal jacket, raising her aqua-teal phone to photograph the wall; calm and observant",
  "composition": "wall on one side with simple geometric graffiti marks, figure documenting on the other, both on a translucent amber-orange glow blob; airy space",
  "style": "flat vector, geometric, soft rounded corners, consistent 2px line weight",
  "line_treatment": "off-white outlines on the wall and figure",
  "colors": "graffiti marks and damaged surface accents in warm amber-orange, the phone/jacket accent in bright aqua-teal, wall and environment in dark slate blue, details pale steel blue and off-white, backing glow translucent amber",
  "lighting": "subtle glow on the amber marks; flat elsewhere",
  "mood": "noticing and documenting, civic care for shared spaces",
  "background": "deep midnight navy",
  "do_not": ["no offensive graffiti text or symbols", "abstract marks only", "no people being harmed", "no off-palette colors"],
  "output": "1:1 square, flat vector / PNG with transparent areas, subject ~70% of frame"
}
```

---

### 5.4 `suspicious-activity.png` — Suspicious Activity

```json
{
  "concept": "incident_suspicious_activity",
  "hero_color": "golden amber",
  "scene": "a watchful neighbor noticing something off — a stylized eye or a shadowy figure rounding a corner in the distance — and quietly reporting it",
  "human_element": "an older man with short grey hair and glasses, drawn in the shared SafeSignal people style (modern flat-vector, Toters/Storyset-like, rounded geometric friendly proportions, minimal calm neutral features; TRANSPARENT no-fill skin — face and hands unfilled so the navy background shows through, defined only by the ~2px off-white outline; no skin color; clothing in flat fills with one soft inner shade); wearing a bright aqua-teal scarf, peering attentively with one hand near his brow while holding his aqua-teal phone; calm, alert",
  "composition": "aware figure in foreground, a small abstract distant silhouette/eye motif in the background, all on a translucent golden-amber glow blob; generous space",
  "style": "flat vector, geometric, soft rounded corners, consistent 2px line weight",
  "line_treatment": "off-white outlines for clean separation on navy",
  "colors": "the watch/eye motif in golden amber, the observer's phone/jacket accent in bright aqua-teal, environment dark slate blue, details pale steel blue and off-white, backing glow translucent golden amber",
  "lighting": "subtle glow on the amber motif; flat figure",
  "mood": "vigilant, neighborly, calm awareness",
  "background": "deep midnight navy",
  "do_not": ["distant figure must be a neutral abstract silhouette, not threatening or graphic", "no faces on the silhouette", "no weapons", "no off-palette colors"],
  "output": "1:1 square, flat vector / PNG with transparent areas, subject ~70% of frame"
}
```

---

### 5.5 `traffic-incident.png` — Traffic Incident

```json
{
  "concept": "incident_traffic",
  "hero_color": "bright sky blue",
  "scene": "two simplified cars with a minor fender bump and a safety cone, and a person safely on the sidewalk calling it in",
  "human_element": "a man with a short beard, drawn in the shared SafeSignal people style (modern flat-vector, Toters/Storyset-like, rounded geometric friendly proportions, minimal calm neutral features; TRANSPARENT no-fill skin — face and hands unfilled so the navy background shows through, defined only by the ~2px off-white outline; no skin color; clothing in flat fills with one soft inner shade); wearing a bright aqua-teal jacket, standing safely back on the sidewalk holding his aqua-teal phone to report; calm posture, NO HAPPY FACE EXPRESSSIONS",
  "composition": "the two cars and a cone grouped on one side, the reporting figure on the other, all on a translucent sky-blue glow blob; airy negative space",
  "style": "flat vector, geometric, soft rounded corners, consistent 2px line weight",
  "line_treatment": "off-white outlines on cars and figure",
  "colors": "cars and cone in bright sky blue with off-white accents, the reporter's phone/jacket in bright aqua-teal, road/environment dark slate blue, details pale steel blue and off-white, backing glow translucent sky blue",
  "lighting": "subtle glow on the blue hero elements; flat elsewhere",
  "mood": "minor, manageable, calmly handled",
  "background": "deep midnight navy",
  "do_not": ["no injuries", "no dramatic crash/explosion", "minor bump only", "no off-palette colors"],
  "output": "1:1 square, flat vector / PNG with transparent areas, subject ~70% of frame"
}
```

---

### 5.6 `noise-complaint.png` — Noise Complaint

```json
{
  "concept": "incident_noise",
  "hero_color": "soft violet",
  "scene": "a loud source (a speaker or a window with sound waves radiating out at night) and a neighbor reacting to the disturbance",
  "human_element": "a woman with hair in a high bun, drawn in the shared SafeSignal people style (modern flat-vector, Toters/Storyset-like, rounded geometric friendly proportions, minimal calm neutral features; TRANSPARENT no-fill skin — face and hands unfilled so the navy background shows through, defined only by the ~2px off-white outline; no skin color; clothing in flat fills with one soft inner shade); wearing a bright aqua-teal cardigan, lightly covering one ear with one hand while holding her aqua-teal phone to report; mild, calm annoyance",
  "composition": "speaker/window with stylized concentric sound waves on one side, the reacting neighbor on the other, on a translucent violet glow blob; airy space",
  "style": "flat vector, geometric, soft rounded corners, consistent 2px line weight",
  "line_treatment": "off-white outlines and pale-steel sound waves",
  "colors": "sound waves and speaker in soft violet, the neighbor's phone/jacket accent in bright aqua-teal, environment dark slate blue, details pale steel blue and off-white, backing glow translucent violet",
  "lighting": "subtle glow on the violet sound waves; flat figure",
  "mood": "mild, everyday nuisance, calmly reported",
  "background": "deep midnight navy",
  "do_not": ["no angry/comical faces", "keep it light", "no off-palette colors"],
  "output": "1:1 square, flat vector / PNG with transparent areas, subject ~70% of frame"
}
```

---

### 5.7 `fire.png` — Fire

```json
{
  "concept": "incident_fire",
  "hero_color": "vivid orange",
  "scene": "a building or container with stylized flame shapes (controlled, graphic, not realistic), and a person safely at a distance reporting it",
  "human_element": "a man with a short buzz cut, drawn in the shared SafeSignal people style (modern flat-vector, Toters/Storyset-like, rounded geometric friendly proportions, minimal calm neutral features; TRANSPARENT no-fill skin — face and hands unfilled so the navy background shows through, defined only by the ~2px off-white outline; no skin color; clothing in flat fills with one soft inner shade); wearing a bright aqua-teal jacket, standing well back, pointing toward the fire with one hand and holding his aqua-teal phone in the other; calm, safe posture",
  "composition": "the flaming structure on one side, the reporter safely apart on the other, on a translucent vivid-orange glow blob; clear safe distance between them; airy space",
  "style": "flat vector, geometric, soft rounded corners, consistent 2px line weight",
  "line_treatment": "off-white outlines; flames as clean geometric shapes, not realistic",
  "colors": "flames in vivid orange with warm-amber tips, the reporter's phone/jacket accent in bright aqua-teal, building/environment dark slate blue, details pale steel blue and off-white, backing glow translucent vivid orange",
  "lighting": "warm glow on the flames (the one place a stronger glow is welcome); flat figure",
  "mood": "urgent but controlled, safe reporting from a distance",
  "background": "deep midnight navy",
  "do_not": ["no people in the fire", "no panic/screaming faces", "no realistic smoke/gore", "stylized flames only", "no off-palette colors"],
  "output": "1:1 square, flat vector / PNG with transparent areas, subject ~70% of frame"
}
```

---

### 5.8 `medical-emergency.png` — Medical Emergency

```json
{
  "concept": "incident_medical",
  "hero_color": "clean medical red",
  "scene": "a medical cross symbol and a small first-aid kit, with a person calmly calling for help / a responder figure arriving — focus on CARE and RESPONSE, not a patient in distress",
  "human_element": "a woman with hair in a ponytail, drawn in the shared SafeSignal people style (modern flat-vector, Toters/Storyset-like, rounded geometric friendly proportions, minimal calm neutral features; TRANSPARENT no-fill skin — face and hands unfilled so the navy background shows through, defined only by the ~2px off-white outline; no skin color; clothing in flat fills with one soft inner shade); wearing a bright aqua-teal jacket, kneeling calmly beside the first-aid kit and holding her aqua-teal phone to call emergency services; supportive, composed",
  "composition": "medical cross + kit as the hero on one side, the calm responder on the other, on a translucent medical-red glow blob; reassuring, airy space",
  "style": "flat vector, geometric, soft rounded corners, consistent 2px line weight",
  "line_treatment": "off-white outlines; crisp medical cross",
  "colors": "medical cross and kit in clean medical red with off-white, the reporter's aqua-teal jacket and phone screen in bright aqua-teal, environment dark slate blue, details pale steel blue and off-white, backing glow translucent medical red",
  "lighting": "subtle glow on the red cross; flat figure",
  "mood": "calm, caring, help-is-coming reassurance",
  "background": "deep midnight navy",
  "do_not": ["no visible patient in distress", "no blood/injuries", "no body on the ground", "focus on the responder and the care symbol", "no off-palette colors"],
  "output": "1:1 square, flat vector / PNG with transparent areas, subject ~70% of frame"
}
```

---

### 5.9 `hazard.png` — Hazard

```json
{
  "concept": "incident_hazard",
  "hero_color": "warm amber with slate",
  "scene": "a hazard warning sign / a small spill or downed-cable motif with a safety cone, and a person flagging it and reporting",
  "human_element": "a man wearing a cap, drawn in the shared SafeSignal people style (modern flat-vector, Toters/Storyset-like, rounded geometric friendly proportions, minimal calm neutral features; TRANSPARENT no-fill skin — face and hands unfilled so the navy background shows through, defined only by the ~2px off-white outline; no skin color; clothing in flat fills with one soft inner shade); wearing a bright aqua-teal work vest, gesturing toward the safety cone while holding his aqua-teal phone; calm and cautious",
  "composition": "hazard sign + cone + abstract spill on one side, the cautious reporter on the other, on a translucent amber glow blob; airy space",
  "style": "flat vector, geometric, soft rounded corners, consistent 2px line weight",
  "line_treatment": "off-white outlines; clean geometric hazard sign",
  "colors": "hazard sign and cone in warm amber accented with dark slate, the reporter's phone/jacket in bright aqua-teal, environment dark slate blue, details pale steel blue and off-white, backing glow translucent amber",
  "lighting": "subtle glow on the amber sign; flat figure",
  "mood": "cautious, responsible, keeping others safe",
  "background": "deep midnight navy",
  "do_not": ["no graphic chemical/biohazard realism", "keep symbols clean and simple", "no people harmed", "no off-palette colors"],
  "output": "1:1 square, flat vector / PNG with transparent areas, subject ~70% of frame"
}
```

---

### 5.10 `other.png` — Other

```json
{
  "concept": "incident_other",
  "hero_color": "neutral slate blue",
  "scene": "a person thoughtfully filling out a report on a clipboard or phone form, for incidents that don't fit a category",
  "human_element": "a young person with short dark hair with aqua-teal tips, drawn in the shared SafeSignal people style (modern flat-vector, Toters/Storyset-like, rounded geometric friendly proportions, minimal calm neutral features; TRANSPARENT no-fill skin — face and hands unfilled so the navy background shows through, defined only by the ~2px off-white outline; no skin color; clothing in flat fills with one soft inner shade); wearing a bright aqua-teal jacket, tapping a report form on their aqua-teal phone; calm and considered",
  "composition": "the figure centered with a clipboard/form, a small neutral question-mark or document motif beside them, on a translucent slate-blue glow blob; generous negative space",
  "style": "flat vector, geometric, soft rounded corners, consistent 2px line weight",
  "line_treatment": "off-white outlines for clean glow on navy",
  "colors": "clipboard/form and question motif in neutral slate blue, the phone/jacket accent in bright aqua-teal, environment dark slate blue, details pale steel blue and off-white, backing glow translucent slate blue",
  "lighting": "subtle glow on the teal accent; flat elsewhere",
  "mood": "neutral, helpful, open-ended",
  "background": "deep midnight navy",
  "do_not": ["no specific incident imagery", "keep it generic and calm", "no off-palette colors"],
  "output": "1:1 square, flat vector / PNG with transparent areas, subject ~70% of frame"
}
```

---

## 6. Component wiring

Reuse the **PNG + `Image`** approach from the empty-state set (no SVG deps). Build one keyed lookup
that resolves a `category` + `variant` (`hero` | `badge`) to its illustration.

Suggested: `Mobile-part/src/components/IncidentIllustration.js`, re-exported from
[components/index.js](../src/components/index.js).

```jsx
import React from 'react';
import { Image } from 'react-native';

// React Native auto-selects @2x/@3x from the sibling files; reference the base name only.
const ART = {
  hero: {
    theft: require('../../../assets/illustrations/incidents/hero/theft.png'),
    assault: require('../../../assets/illustrations/incidents/hero/assault.png'),
    vandalism: require('../../../assets/illustrations/incidents/hero/vandalism.png'),
    suspicious_activity: require('../../../assets/illustrations/incidents/hero/suspicious-activity.png'),
    traffic_incident: require('../../../assets/illustrations/incidents/hero/traffic-incident.png'),
    noise_complaint: require('../../../assets/illustrations/incidents/hero/noise-complaint.png'),
    fire: require('../../../assets/illustrations/incidents/hero/fire.png'),
    medical_emergency: require('../../../assets/illustrations/incidents/hero/medical-emergency.png'),
    hazard: require('../../../assets/illustrations/incidents/hero/hazard.png'),
    other: require('../../../assets/illustrations/incidents/hero/other.png'),
  },
  badge: {
    theft: require('../../../assets/illustrations/incidents/badge/theft.png'),
    assault: require('../../../assets/illustrations/incidents/badge/assault.png'),
    vandalism: require('../../../assets/illustrations/incidents/badge/vandalism.png'),
    suspicious_activity: require('../../../assets/illustrations/incidents/badge/suspicious-activity.png'),
    traffic_incident: require('../../../assets/illustrations/incidents/badge/traffic-incident.png'),
    noise_complaint: require('../../../assets/illustrations/incidents/badge/noise-complaint.png'),
    fire: require('../../../assets/illustrations/incidents/badge/fire.png'),
    medical_emergency: require('../../../assets/illustrations/incidents/badge/medical-emergency.png'),
    hazard: require('../../../assets/illustrations/incidents/badge/hazard.png'),
    other: require('../../../assets/illustrations/incidents/badge/other.png'),
  },
};

export default function IncidentIllustration({ category, variant = 'hero', size = 160, style }) {
  const set = ART[variant] || ART.hero;
  const source = set[category] || set.other;
  return <Image source={source} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
}
```

**Incident Detail hero** (no media) — full scene:

```jsx
{!detailIncident.mediaUrl && (
  <IncidentIllustration category={detailIncident.category} variant="hero" size={200} />
)}
```

**Community feed card** ([FeedCard.js](../src/screens/Home/FeedCard.js)) — leading thumbnail. Wrap the
existing content in a row and add the badge on the left:

```jsx
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <IncidentIllustration
    category={incident.category}
    variant="badge"
    size={64}
    style={{ marginRight: 12 }}
  />
  <View style={{ flex: 1 }}>
    {/* existing category chip + title + meta */}
  </View>
</View>
```

**Trending This Week box** ([TrendingSection.js](../src/screens/Home/TrendingSection.js)) — replace the
38px `trendingIcon` Ionicon tile with the badge:

```jsx
<IncidentIllustration
  category={cat.category}
  variant="badge"
  size={52}
  style={{ marginRight: 10 }}
/>
{/* keep trendingInfo + trendBadge as-is */}
```

---

## 7. Generation workflow (keep the set consistent)

Because the generator sees **one JSON at a time with no shared memory**, consistency comes from the
**prompt text, not from reusing a session/reference**. So: keep the §2 style-family language
(`flat-vector, Toters/Storyset-like, rounded proportions, ~2px off-white outline, flat fills + one
soft inner shade`) **verbatim in every prompt's `human_element`**, and change only the **person**, the
**pose**, `concept` / `scene` / `hero_color`. Then export **PNG `@2x`/`@3x` transparent** from Figma.
Verify each on the app's dark screens, side by side, to confirm they read as one family. Run all
people through the **§3 sensitivity check** before committing.

---

## 8. Quick checklist

- [ ] `assets/illustrations/incidents/hero/` and `.../badge/` folders created
- [ ] All 10 categories made in **both variants** — `hero` (full scene + human) and `badge` (symbol only)
      (theft, assault, vandalism, suspicious_activity, traffic_incident, noise_complaint, fire,
      medical_emergency, hazard, other)
- [ ] Each leads with its **category color** + keeps a small **aqua-teal** brand accent
- [ ] Each `hero` shows a **different person** (varied hair/gender/age/accessories; **transparent no-fill skin, no skin color**) but in the **same flat-vector family** — calm, non-graphic (per §2–§3); `badge` has **no human**
- [ ] Sensitive categories (assault, fire, medical) reviewed: **no victims, blood, weapons, or the act itself**
- [ ] Same dark-mode pattern as the empty states (navy canvas, glow blob, flat, off-white lines)
- [ ] `badge` variant verified legible at ~48–52px
- [ ] Exported PNG `@2x`/`@3x`, transparent background
- [ ] `IncidentIllustration` component (with `variant` prop) built + re-exported from `components/index.js`
- [ ] Wired into: Incident Detail hero (`hero`), feed card thumbnail (`badge`), Trending box (`badge`)
- [ ] Verified on the app's dark screens
```

