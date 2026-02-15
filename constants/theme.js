/**
 * Theme Constants
 * Centralized light and dark color palettes for the entire app
 */

export const lightTheme = {
  // Core colors
  background: '#F8FAFC',
  surface: '#EEF2F7',
  surface2: '#E2E8F0',
  card: '#FFFFFF',
  
  // Text colors
  text: '#0F172A',
  textMuted: '#334155',
  textSecondary: '#334155',
  textTertiary: '#64748B',
  
  // Status and accents
  primary: '#1D4ED8',
  accent: '#0D9488',
  primaryLight: 'rgba(29, 78, 216, 0.14)',
  primaryDark: '#1E40AF',
  gradientStart: '#F8FAFC',
  gradientEnd: '#E2E8F0',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#0284C7',

  // Safety scores
  safetyGood: '#16A34A',
  safetyModerate: '#D97706',
  safetyPoor: '#DC2626',

  // Trend indicators
  trendUp: '#DC2626',
  trendDown: '#16A34A',
  trendNeutral: '#64748B',

  // Accent palette
  accentGreen: '#16A34A',
  accentBlue: '#2563EB',
  accentOrange: '#F59E0B',
  accentPurple: '#7C3AED',
  accentTeal: '#0D9488',
  accentRed: '#DC2626',
  
  // Severity levels
  severityLow: '#10B981',
  severityMedium: '#F59E0B',
  severityHigh: '#F97316',
  severityCritical: '#DC2626',
  
  // UI elements
  border: '#D0D9E5',
  divider: '#E5EAF2',
  shadow: 'rgba(15, 23, 42, 0.12)',
  overlay: 'rgba(15, 23, 42, 0.45)',

  // Map and category markers
  mapMarkerDefault: '#1D4ED8',

  // Brand colors
  googleBlue: '#4285F4',
  googleButtonBg: '#E8F0FE',

  // Verification flow
  codeInputBg: '#EFF6FF',
  codeBorder: '#1D4ED8',

  // Neutral grays for legacy styles
  neutralGray100: '#F1F5F9',
  neutralGray200: '#E2E8F0',
  neutralGray300: '#CBD5E1',
  
  // Input
  input: '#FFFFFF',
  inputBorder: '#CBD5E1',
  inputPlaceholder: '#94A3B8',
  inputError: '#DC2626',

  // Warning notice surfaces
  warningNoticeBg: '#FEF3C7',
  warningNoticeText: '#92400E',
  warningContrastText: '#000000',

  // Switch state colors
  switchTrackOff: '#CBD5E1',
  switchThumbOff: '#F8FAFC',
  
  // Navigation
  tabBar: '#FFFFFF',
  tabBarActive: '#1D4ED8',
  tabBarInactive: '#64748B',
};

export const darkTheme = {
  // Core colors
  background: '#0F1729',
  surface: '#1E293B',
  surface2: '#243244',
  card: '#111827',
  
  // Text colors
  text: '#F8FAFC',
  textMuted: '#C7D2E3',
  textSecondary: '#C7D2E3',
  textTertiary: '#94A3B8',
  
  // Status and accents
  primary: '#2DD4BF',
  accent: '#2DD4BF',
  primaryLight: 'rgba(45, 212, 191, 0.20)',
  primaryDark: '#14B8A6',
  gradientStart: '#0F1729',
  gradientEnd: '#1E293B',
  success: '#34D399',
  warning: '#F59E0B',
  error: '#F87171',
  info: '#38BDF8',

  // Safety scores
  safetyGood: '#34D399',
  safetyModerate: '#F59E0B',
  safetyPoor: '#F87171',

  // Trend indicators
  trendUp: '#F87171',
  trendDown: '#34D399',
  trendNeutral: '#94A3B8',

  // Accent palette
  accentGreen: '#34D399',
  accentBlue: '#60A5FA',
  accentOrange: '#F59E0B',
  accentPurple: '#A78BFA',
  accentTeal: '#2DD4BF',
  accentRed: '#FB7185',
  
  // Severity levels
  severityLow: '#4ADE80',
  severityMedium: '#FACC15',
  severityHigh: '#FB923C',
  severityCritical: '#F87171',
  
  // UI elements
  border: '#334155',
  divider: '#243244',
  shadow: 'rgba(2, 8, 23, 0.6)',
  overlay: 'rgba(2, 8, 23, 0.72)',

  // Map and category markers
  mapMarkerDefault: '#2DD4BF',

  // Brand colors
  googleBlue: '#60A5FA',
  googleButtonBg: '#153B57',

  // Verification flow
  codeInputBg: '#132235',
  codeBorder: '#2DD4BF',

  // Neutral grays for legacy styles
  neutralGray100: '#1E293B',
  neutralGray200: '#334155',
  neutralGray300: '#475569',
  
  // Input
  input: '#0B1424',
  inputBorder: '#2B3D55',
  inputPlaceholder: '#64748B',
  inputError: '#F87171',

  // Warning notice surfaces
  warningNoticeBg: '#3A2B12',
  warningNoticeText: '#FCD34D',
  warningContrastText: '#111827',

  // Switch state colors
  switchTrackOff: '#475569',
  switchThumbOff: '#334155',
  
  // Navigation
  tabBar: '#0F1729',
  tabBarActive: '#2DD4BF',
  tabBarInactive: '#64748B',
};

export const getTheme = (isDark) => {
  return isDark ? darkTheme : lightTheme;
};
