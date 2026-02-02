const PREFERENCE_KEYS = {
  STORAGE_KEY: 'safesignal_user_preferences',
};

const DEFAULT_PREFERENCES = {
  darkMode: false,
  locationServices: true,
  pushNotifications: true,
  defaultAnonymous: false,
  displayName: '',
  avatarUri: '',
};

module.exports = {
  PREFERENCE_KEYS,
  DEFAULT_PREFERENCES,
};
