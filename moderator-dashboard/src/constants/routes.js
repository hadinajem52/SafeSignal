/** Canonical route paths. Import here instead of hard-coding strings. */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REPORTS: '/reports',
  LEI: '/lei',
  USERS: '/users',
  ADMIN: '/admin',
  SETTINGS: '/settings',
  DATA_ANALYSIS: '/data-analysis-center',
}

/** Routes that use full-bleed (no padding wrapper) layout. */
export const FULL_BLEED_ROUTES = new Set([
  ROUTES.REPORTS,
  ROUTES.USERS,
  ROUTES.ADMIN,
  ROUTES.SETTINGS,
])
