import React from 'react';
import { Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { DURATION } from '../theme/motion';

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * Image that fades in once decoded — kills the "pop" of remote media landing.
 * Best for network images; local `require()` assets load instantly so a fade
 * isn't needed there.
 */
export default function FadeInImage({ style, onLoad, ...props }) {
  const opacity = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <AnimatedImage
      {...props}
      style={[style, animatedStyle]}
      onLoad={(e) => {
        opacity.value = reduceMotion ? 1 : withTiming(1, { duration: DURATION.base });
        onLoad?.(e);
      }}
    />
  );
}
