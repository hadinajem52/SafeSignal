import React, { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

/**
 * Pulsing skeleton block. Opacity-only loop (UI thread) — cheap and smooth even
 * in a list of placeholders. Pass width/height/borderRadius via `style`.
 */
export default function Skeleton({ style }) {
  const { theme } = useTheme();
  const pulse = useSharedValue(0.5);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.7;
      return undefined;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        { backgroundColor: theme.surface2 || theme.border, borderRadius: 8 },
        style,
        animatedStyle,
      ]}
    />
  );
}
