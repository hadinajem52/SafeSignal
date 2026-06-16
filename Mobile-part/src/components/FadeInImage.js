import React from 'react';
import { Image } from 'expo-image';
import { useReducedMotion } from 'react-native-reanimated';
import { DURATION } from '../theme/motion';









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
