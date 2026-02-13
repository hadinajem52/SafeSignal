/**
 * Typography scale - single source of truth for all text styles
 * Used by both mobile screens and shared components
 */
export const typography = {
  // Headings
  h1: { fontSize: 28, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: '700' },
  h4: { fontSize: 18, fontWeight: '600' },
  h5: { fontSize: 16, fontWeight: '600' },

  // Body text
  bodyLarge: { fontSize: 16, lineHeight: 24 },
  body: { fontSize: 14, lineHeight: 20 },
  bodySmall: { fontSize: 13, lineHeight: 18 },

  // Labels and captions
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 12 },
  small: { fontSize: 11 },

  // Buttons
  button: { fontSize: 16, fontWeight: '600' },
  buttonSmall: { fontSize: 14, fontWeight: '500' },
};
