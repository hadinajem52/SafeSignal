import * as Haptics from 'expo-haptics';

// Thin, crash-safe wrapper. No-ops if the native module isn't available yet
// (e.g. before an Android rebuild) or if haptics are unsupported.
const safe = (fn) => () => {
  try {
    fn()?.catch?.(() => {});
  } catch {
    /* ignore */
  }
};

export const haptics = {
  light: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  selection: safe(() => Haptics.selectionAsync()),
  success: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export default haptics;
