/**
 * Typography scale - single source of truth for all text styles
 * Used by both mobile screens and shared components
 */
export const fontFamilies = {
  display: 'Outfit_700Bold',
  displaySemiBold: 'Outfit_600SemiBold',
  body: 'SourceSans3_400Regular',
  bodyMedium: 'SourceSans3_500Medium',
  bodySemiBold: 'SourceSans3_600SemiBold',
  bodyBold: 'SourceSans3_700Bold',
};

export const typography = {
  // Headings
  h1: { fontFamily: fontFamilies.display, fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: fontFamilies.display, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: fontFamilies.displaySemiBold, fontSize: 20, lineHeight: 26 },
  h4: { fontFamily: fontFamilies.bodySemiBold, fontSize: 18, lineHeight: 24 },
  h5: { fontFamily: fontFamilies.bodySemiBold, fontSize: 16, lineHeight: 22 },

  // Body text
  bodyLarge: { fontFamily: fontFamilies.body, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  bodySmall: { fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 18 },

  // Labels and captions
  label: { fontFamily: fontFamilies.bodySemiBold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.bodyMedium, fontSize: 12, lineHeight: 16 },
  small: { fontFamily: fontFamilies.bodyMedium, fontSize: 11, lineHeight: 14 },

  // Buttons
  button: { fontFamily: fontFamilies.bodySemiBold, fontSize: 16, lineHeight: 22 },
  buttonSmall: { fontFamily: fontFamilies.bodyMedium, fontSize: 14, lineHeight: 20 },
};
