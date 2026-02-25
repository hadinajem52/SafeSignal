export function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '??'
}
export function loadLocalPrefs() {
  try { return JSON.parse(localStorage.getItem('settings_local_prefs') || '{}') } catch { return {} }
}
export function saveLocalPrefs(prefs) {
  localStorage.setItem('settings_local_prefs', JSON.stringify(prefs))
}
