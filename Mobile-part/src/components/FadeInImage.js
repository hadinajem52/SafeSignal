import React from 'react';
import { Image } from 'expo-image';
import { useReducedMotion } from 'react-native-reanimated';
import { DURATION } from '../theme/motion';

/**
 * Remote image that cross-fades in once decoded — kills the "pop" of remote media
 * landing. Backed by expo-image for memory+disk caching and automatic downsampling,
 * which scrolls smoother and uses far less memory than RN's <Image> in lists.
 *
 * Keeps the original API so call sites don't change: pass `source` + `style`, and
 * either `resizeMode` (RN-style, mapped to expo-image's contentFit) or `contentFit`.
 */
export default function FadeInImage({ style, resizeMode, contentFit, transition, ...props }) {
  const reduceMotion = useReducedMotion();
  return (
    <Image
      {...props}
      style={style}
      contentFit={contentFit ?? resizeMode ?? 'cover'}
      transition={reduceMotion ? 0 : transition ?? DURATION.base}
      cachePolicy="memory-disk"
    />
  );
}
