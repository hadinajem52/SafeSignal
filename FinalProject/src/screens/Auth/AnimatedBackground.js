
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Deterministic LCG pseudo-random ─────────────────────────────────────────
const lcg = (seed) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
};

const SHAPES = ['diamond', 'square', 'circle'];
const PARTICLE_COUNT = 20;

const buildParticles = () => {
  const rand = lcg(137);
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: rand() * SCREEN_W,
    startY: SCREEN_H * 0.1 + rand() * SCREEN_H * 1.1,
    size: 7 + rand() * 16,
    opacity: 0.05 + rand() * 0.12,
    duration: 9000 + rand() * 13000,
    delay: rand() * 7000,
    drift: (rand() - 0.5) * 55,
    rotate: rand() * 360,
    shape: SHAPES[Math.floor(rand() * SHAPES.length)],
  }));
};

const PARTICLES = buildParticles();

// ─── Single drifting particle ─────────────────────────────────────────────────
const Particle = ({ config, color }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(-(config.startY + 80), {
          duration: config.duration,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );

    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.drift, {
            duration: config.duration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: config.duration / 2,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.opacity, {
            duration: config.duration * 0.2,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(config.opacity, { duration: config.duration * 0.55 }),
          withTiming(0, {
            duration: config.duration * 0.25,
            easing: Easing.in(Easing.quad),
          })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(translateX);
      cancelAnimation(opacity);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  const s = config.size;
  let shapeStyle;

  if (config.shape === 'diamond') {
    shapeStyle = {
      width: s,
      height: s,
      borderWidth: 1,
      borderColor: color,
      backgroundColor: 'transparent',
      transform: [{ rotate: `${config.rotate + 45}deg` }],
    };
  } else if (config.shape === 'circle') {
    shapeStyle = {
      width: s,
      height: s,
      borderRadius: s / 2,
      borderWidth: 1,
      borderColor: color,
      backgroundColor: 'transparent',
    };
  } else {
    shapeStyle = {
      width: s,
      height: s,
      borderWidth: 1,
      borderColor: color,
      backgroundColor: 'transparent',
      transform: [{ rotate: `${config.rotate}deg` }],
    };
  }

  return (
    <Animated.View
      style={[styles.particle, { left: config.x, top: config.startY }, animStyle]}
    >
      <View style={shapeStyle} />
    </Animated.View>
  );
};

// ─── Expanding pulse ring ─────────────────────────────────────────────────────
const PulseRing = ({ cx, cy, maxRadius, color, delay, duration }) => {
  const scale = useSharedValue(0.25);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.out(Easing.cubic) }),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.14, { duration: duration * 0.12 }),
          withTiming(0.10, { duration: duration * 0.6 }),
          withTiming(0, {
            duration: duration * 0.28,
            easing: Easing.out(Easing.quad),
          })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const size = maxRadius * 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: cx - maxRadius,
          top: cy - maxRadius,
          width: size,
          height: size,
          borderRadius: maxRadius,
          borderWidth: 1,
          borderColor: color,
        },
        animStyle,
      ]}
    />
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
const AnimatedBackground = () => {
  const { theme, isDark } = useTheme();
  const primaryColor = theme.primary;
  const accentColor = isDark ? theme.accentBlue : theme.primaryDark;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLES.map((p) => (
        <Particle key={p.id} config={p} color={primaryColor} />
      ))}

      {/* Upper-right focal point — two staggered expanding rings */}
      <PulseRing
        cx={SCREEN_W * 0.8}
        cy={SCREEN_H * 0.17}
        maxRadius={110}
        color={primaryColor}
        delay={0}
        duration={4800}
      />
      <PulseRing
        cx={SCREEN_W * 0.8}
        cy={SCREEN_H * 0.17}
        maxRadius={190}
        color={primaryColor}
        delay={1700}
        duration={4800}
      />

      {/* Lower-left focal point */}
      <PulseRing
        cx={SCREEN_W * 0.2}
        cy={SCREEN_H * 0.74}
        maxRadius={90}
        color={accentColor}
        delay={800}
        duration={6200}
      />
      <PulseRing
        cx={SCREEN_W * 0.2}
        cy={SCREEN_H * 0.74}
        maxRadius={150}
        color={accentColor}
        delay={2400}
        duration={6200}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});

export default AnimatedBackground;
