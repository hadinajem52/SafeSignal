import { usePreferences } from '../context/PreferencesContext';

// Preferences are now backed by a single shared PreferencesProvider so every
// screen reads the same state. This wrapper preserves the original hook API
// ({ preferences, isLoading, updatePreference, updatePreferences,
// reloadPreferences }) so existing call sites need no changes.
const useUserPreferences = () => usePreferences();

export default useUserPreferences;
