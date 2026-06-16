import { Easing } from 'react-native-reanimated';


export const DURATION = {
  micro: 140,
  base: 220,
  page: 300,
};

export const EASING = {
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
};

export const DISTANCE = {
  rise: 16,
  press: 0.97,
};


export const stagger = (index, step = 40, max = 240) => Math.min(index * step, max);
