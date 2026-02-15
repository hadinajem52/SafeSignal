
## Phase A1 — Design System: Color Palette & Typography

**Goal**: Replace the current generic color palette with a distinctive, intentional identity. Update typography to use custom fonts.

**Scope**: `constants/theme.js`, `constants/typography.js`, `constants/spacing.js`, `App.js`

### Design Decisions (Locked)

**Theme**: Civic Trust
**Why**: Official, stable, government-grade without being ugly — best fit for safety reporting apps.

* **Aesthetic tone**: Refined / Civic / Trust-first
* **Primary**: Deep navy `#0B1220`
* **Accent**: Teal `#0D9488` (CTAs + active states)
* **Display font**: Outfit
* **Body font**: Source Sans 3

### Steps

1. **Update `constants/theme.js`**

* Replace tokens in both `lightTheme` and `darkTheme`.
* Add core UI tokens (required): `background`, `surface`, `surface2`, `text`, `textMuted`, `border`, `divider`.
* Add brand tokens: `primary`, `primaryLight` (10% opacity), `primaryDark` (pressed), `accent`, `gradientStart`, `gradientEnd`.
* Add severity tokens (do NOT derive purely from primary/accent):
  `severityLow`, `severityMedium`, `severityHigh`, `severityCritical`.

2. **Update `constants/typography.js`**

* Replace system fonts with the chosen families.
* Add `fontFamily` to every text style.
* Create `fontFamilies` object:

  * `display: 'Outfit-Bold'`
  * `displaySemi: 'Outfit-SemiBold'`
  * `body: 'SourceSans3-Regular'`
  * `bodyMedium: 'SourceSans3-Medium'`
  * `bodySemiBold: 'SourceSans3-SemiBold'`

3. **Load fonts in `App.js`**

* Use `expo-font` + `useFonts`.
* Use `expo-splash-screen` to hold splash until fonts load.
* Add packages if needed:

  * `@expo-google-fonts/outfit`
  * `@expo-google-fonts/source-sans-3`

4. **Update `constants/spacing.js`**

* “Civic trust” style:

  * Shadows: subtle (low opacity), rely more on borders/dividers.
  * Border radius: medium (e.g., 12–16 for cards, 10–12 for inputs/buttons).

### Verification

* [ ] App loads with no font errors
* [ ] All text uses Outfit / Source Sans 3
* [ ] Light + dark themes both feel intentional
* [ ] No missing/broken tokens across screens

### Files Changed

* `constants/theme.js`
* `constants/typography.js`
* `constants/spacing.js`
* `FinalProject/App.js`
* `FinalProject/package.json` (if new font packages needed)

