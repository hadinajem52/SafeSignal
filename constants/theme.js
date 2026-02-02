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
  
  // Input
  input: '#FFFFFF',
  inputBorder: '#E5E7EB',
  inputPlaceholder: '#9CA3AF',
  
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
  
  // Input
  input: '#0B1220',
  inputBorder: '#1F2937',
  inputPlaceholder: '#6B7280',
  
  // Navigation
  tabBar: '#111827',
  tabBarActive: '#4DA6FF',
  tabBarInactive: '#6B7280',
};

export const getTheme = (isDark) => {
  return isDark ? darkTheme : lightTheme;
};
