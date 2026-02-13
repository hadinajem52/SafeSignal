/**
 * Theme Constants
 * Centralized light and dark color palettes for the entire app
 */

export const lightTheme = {
  // Core colors
  background: '#FFFFFF',
  surface: '#F5F7FA',
  card: '#FFFFFF',
  
  // Text colors
  text: '#1A1A2E',
  textSecondary: '#666666',
  textTertiary: '#999999',
  
  // Status and accents
  primary: '#1A73E8',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#2563EB',

  // Safety scores
  safetyGood: '#27ae60',
  safetyModerate: '#f39c12',
  safetyPoor: '#e74c3c',

  // Trend indicators
  trendUp: '#e74c3c',
  trendDown: '#27ae60',
  trendNeutral: '#95a5a6',

  // Accent palette
  accentGreen: '#27ae60',
  accentBlue: '#3498db',
  accentOrange: '#f39c12',
  accentPurple: '#9b59b6',
  accentTeal: '#1abc9c',
  accentRed: '#e74c3c',
  
  // Severity levels
  severityLow: '#10B981',
  severityMedium: '#F59E0B',
  severityHigh: '#F97316',
  severityCritical: '#EF4444',
  
  // UI elements
  border: '#E0E0E0',
  divider: '#F0F0F0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.4)',

  // Map and category markers
  mapMarkerDefault: '#1976D2',

  // Brand colors
  googleBlue: '#4285F4',
  googleButtonBg: '#93c5fd',

  // Verification flow
  codeInputBg: '#f0f7ff',
  codeBorder: '#007AFF',

  // Neutral grays for legacy styles
  neutralGray100: '#f5f5f5',
  neutralGray200: '#e0e0e0',
  neutralGray300: '#E0E0E0',
  
  // Input
  input: '#FFFFFF',
  inputBorder: '#E5E7EB',
  inputPlaceholder: '#9CA3AF',
  inputError: '#e74c3c',

  // Switch state colors
  switchTrackOff: '#d1d5db',
  switchThumbOff: '#f4f3f4',
  
  // Navigation
  tabBar: '#FFFFFF',
  tabBarActive: '#1A73E8',
  tabBarInactive: '#9CA3AF',
};

export const darkTheme = {
  // Core colors
  background: '#0F172A',
  surface: '#1E293B',
  card: '#111827',
  
  // Text colors
  text: '#F9FAFB',
  textSecondary: '#CBD5F5',
  textTertiary: '#9CA3AF',
  
  // Status and accents
  primary: '#4DA6FF',
  success: '#22C55E',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  // Safety scores
  safetyGood: '#4ADE80',
  safetyModerate: '#FBBF24',
  safetyPoor: '#F87171',

  // Trend indicators
  trendUp: '#F87171',
  trendDown: '#4ADE80',
  trendNeutral: '#94A3B8',

  // Accent palette
  accentGreen: '#4ADE80',
  accentBlue: '#60A5FA',
  accentOrange: '#FBBF24',
  accentPurple: '#A78BFA',
  accentTeal: '#2DD4BF',
  accentRed: '#F87171',
  
  // Severity levels
  severityLow: '#4ADE80',
  severityMedium: '#FACC15',
  severityHigh: '#FB923C',
  severityCritical: '#F87171',
  
  // UI elements
  border: '#334155',
  divider: '#1E293B',
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Map and category markers
  mapMarkerDefault: '#60A5FA',

  // Brand colors
  googleBlue: '#60A5FA',
  googleButtonBg: '#1E3A5F',

  // Verification flow
  codeInputBg: '#1E293B',
  codeBorder: '#60A5FA',

  // Neutral grays for legacy styles
  neutralGray100: '#1E293B',
  neutralGray200: '#334155',
  neutralGray300: '#475569',
  
  // Input
  input: '#0B1220',
  inputBorder: '#1F2937',
  inputPlaceholder: '#6B7280',
  inputError: '#F87171',

  // Switch state colors
  switchTrackOff: '#4B5563',
  switchThumbOff: '#374151',
  
  // Navigation
  tabBar: '#111827',
  tabBarActive: '#4DA6FF',
  tabBarInactive: '#6B7280',
};

export const getTheme = (isDark) => {
  return isDark ? darkTheme : lightTheme;
};
