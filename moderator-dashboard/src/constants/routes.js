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

export const FULL_BLEED_ROUTES = new Set([
  ROUTES.REPORTS,
  ROUTES.USERS,
  ROUTES.ADMIN,
  ROUTES.SETTINGS,
])
