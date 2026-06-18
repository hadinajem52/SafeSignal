import { ROUTES } from './routes'

// Single source of truth for the sidebar sub-navigation.
//
// Each entry maps a parent route to the page's internal sections. `paramKey`
// and `defaultValue` are the deep-link contract the target page reads via
// useSearchParamState; `items` drive the sidebar sub-links. Values match the
// page's existing in-page tab/filter values so the URL stays the single source
// of truth for the active section.
export const SUBNAV = {
  [ROUTES.REPORTS]: {
    paramKey: 'status',
    defaultValue: 'submitted,auto_flagged,auto_processed',
    items: [
      { label: 'All Reports', value: 'all' },
      { label: 'Pending', value: 'submitted,auto_flagged,auto_processed' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'Closed', value: 'police_closed' },
    ],
  },
  [ROUTES.LEI]: {
    paramKey: 'view',
    defaultValue: 'queue',
    items: [
      { label: 'Incident Queue', value: 'queue' },
      { label: 'Operations Map', value: 'map' },
      { label: 'Closed Cases', value: 'closed' },
    ],
  },
  [ROUTES.USERS]: {
    paramKey: 'status',
    defaultValue: 'all',
    items: [
      { label: 'All Users', value: 'all' },
      { label: 'Active', value: 'active' },
      { label: 'Pending', value: 'pending' },
      { label: 'Suspended', value: 'suspended' },
    ],
  },
  [ROUTES.ADMIN]: {
    paramKey: 'tab',
    defaultValue: 'applications',
    items: [
      { label: 'Applications', value: 'applications' },
      { label: 'Database', value: 'database' },
    ],
  },
}

// Build the path + query string a sidebar sub-link points to.
export function subnavPath(route, paramKey, value) {
  const params = new URLSearchParams()
  params.set(paramKey, value)
  return `${route}?${params.toString()}`
}

// Whether `value` is the active section for `route`, given the current search
// string. Falls back to the section's default when the param is absent.
export function isSubnavItemActive(route, value, search) {
  const config = SUBNAV[route]
  if (!config) return false
  const current = new URLSearchParams(search).get(config.paramKey) ?? config.defaultValue
  return current === value
}
