import { Easing } from 'react-native-reanimated';

// Single source of truth for motion. Calm, fast, no bounce (civic-safety tone).
export const DURATION = {
  micro: 140, // press feedback, toggles
  base: 220, // entrances, fades
  page: 300, // larger transitions
};

export const EASING = {
  out: Easing.out(Easing.cubic), // entrances
  inOut: Easing.inOut(Easing.cubic), // moves
};

export const DISTANCE = {
  rise: 16, // how far list items / sheets travel on entrance
  press: 0.97, // scale on press
};

// Cap the per-item entrance stagger so long lists never feel slow.
export const stagger = (index, step = 40, max = 240) => Math.min(index * step, max);
