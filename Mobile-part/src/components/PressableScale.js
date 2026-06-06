import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { DURATION, DISTANCE } from '../theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Tappable wrapper with a subtle UI-thread scale on press. Drop-in for
 * TouchableOpacity where you want a calmer, smoother press than opacity flicker.
 */
export default function PressableScale({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  scaleTo = DISTANCE.press,
  disabled = false,
  ...rest
}) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * (1 - scaleTo) }],
    opacity: 1 - pressed.value * 0.05,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={(event) => {
        pressed.value = withTiming(1, { duration: DURATION.micro });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withTiming(0, { duration: DURATION.micro });
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
