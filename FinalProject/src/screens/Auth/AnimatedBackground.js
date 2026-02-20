
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Dimensions,
  StyleSheet,
  View,
} from 'react-native';
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

// ─── Deterministic LCG ───────────────────────────────────────────────────────
const makeLcg = (seed) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
};

// ─── Grid geometry ────────────────────────────────────────────────────────────
const COLS = 5;
const ROWS = 9;
const CELL_W = SCREEN_W / COLS;
const CELL_H = SCREEN_H / ROWS;

// ─── Pre-compute signal node positions at grid intersections ──────────────────
const buildNodes = () => {
  const rand = makeLcg(71);
  // Collect all inner intersections
  const pool = [];
  for (let r = 1; r < ROWS; r++) {
    for (let c = 1; c < COLS; c++) {
      pool.push({ x: c * CELL_W, y: r * CELL_H });
    }
  }
  // Fisher-Yates with LCG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 11).map((pos, i) => ({
    id: i,
    x: pos.x,
    y: pos.y,
    size: i < 2 ? 5 : 3,       // two larger "hot" nodes
    isAccent: i < 2,
    delay: i * 540,
    duration: 2600 + i * 180,
  }));
};

const NODES = buildNodes();

// ─── Signal node — opacity pulse only (compositor) ───────────────────────────
const SignalNode = ({ config, primaryColor, accentColor, running }) => {
  const opacity = useSharedValue(0);
  const color = config.isAccent ? accentColor : primaryColor;
  const peak = config.isAccent ? 0.75 : 0.55;

  useEffect(() => {
    if (!running) {
      cancelAnimation(opacity);
      opacity.value = withTiming(0, { duration: 200 });
      return;
    }
    opacity.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(peak, { duration: config.duration * 0.28, easing: Easing.out(Easing.quad) }),
          withTiming(peak * 0.6, { duration: config.duration * 0.42 }),
          withTiming(0, { duration: config.duration * 0.30, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(opacity);
  }, [running]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.node,
        {
          left: config.x - config.size / 2,
          top: config.y - config.size / 2,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
};

// ─── Node halo ring — expands from accent nodes ───────────────────────────────
const NodeHalo = ({ config, color, running }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const haloR = 14;

  useEffect(() => {
    if (!running) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      opacity.value = withTiming(0, { duration: 150 });
      return;
    }
    const dur = config.duration * 1.6;
    // Hold at 0 for the last 22% of each cycle — scale resets invisibly during that window
    const expandDur  = dur * 0.78;
    const holdDur    = dur * 0.22;
    scale.value = withDelay(
      config.delay + 200,
      withRepeat(
        withSequence(
          withTiming(1,   { duration: 0 }),
          withTiming(2.8, { duration: expandDur, easing: Easing.out(Easing.cubic) }),
          withTiming(2.8, { duration: holdDur })  // coast at final scale while opacity=0
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      config.delay + 200,
      withRepeat(
        withSequence(
          withTiming(0.45, { duration: expandDur * 0.12 }),
          withTiming(0,    { duration: expandDur * 0.88, easing: Easing.out(Easing.quad) }),
          withTiming(0,    { duration: holdDur })  // hold invisible — sync'd with scale hold
        ),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [running]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: config.x - haloR,
          top: config.y - haloR,
          width: haloR * 2,
          height: haloR * 2,
          borderRadius: haloR,
          borderWidth: 1,
          borderColor: color,
        },
        animStyle,
      ]}
    />
  );
};

// ─── Radar scan sweep — translateY only (compositor) ─────────────────────────
const ScanLine = ({ primaryColor, running }) => {
  const translateY = useSharedValue(-2);

  useEffect(() => {
    if (!running) {
      cancelAnimation(translateY);
      return;
    }
    translateY.value = withRepeat(
      withTiming(SCREEN_H + 2, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(translateY);
  }, [running]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.scanLine, { backgroundColor: primaryColor }, animStyle]}
    />
  );
};

// ─── Radar ring — scale + opacity only (compositor) ──────────────────────────
const RadarRing = ({ cx, cy, maxR, color, delay, duration, running }) => {
  const scale = useSharedValue(0.04);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!running) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      opacity.value = withTiming(0, { duration: 200 });
      return;
    }
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.04, { duration: 0 }),
          withTiming(1, { duration, easing: Easing.out(Easing.exp) })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration * 0.07 }),
          withTiming(0.45, { duration: duration * 0.52 }),
          withTiming(0, { duration: duration * 0.41, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [running]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const size = maxR * 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: cx - maxR,
          top: cy - maxR,
          width: size,
          height: size,
          borderRadius: maxR,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: color,
        },
        animStyle,
      ]}
    />
  );
};

// ─── Static corner reticle ────────────────────────────────────────────────────
const CornerReticle = ({ top, right, bottom, left: leftProp, color }) => {
  const ARM = 18;
  const T = StyleSheet.hairlineWidth;
  return (
    <View
      pointerEvents="none"
      style={[styles.reticle, { top, right, bottom, left: leftProp }]}
    >
      {/* horizontal */}
      <View style={[styles.reticleArm, { top: 0, left: 0, width: ARM, height: T, backgroundColor: color }]} />
      {/* vertical */}
      <View style={[styles.reticleArm, { top: 0, left: 0, width: T, height: ARM, backgroundColor: color }]} />
    </View>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
const AnimatedBackground = () => {
  const { theme, isDark } = useTheme();
  const [running, setRunning] = useState(true);

  // Respect prefers-reduced-motion
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const motionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    // Pause when app goes to background — battery / GPU savings
    const appSub = AppState.addEventListener('change', (next) => setRunning(next === 'active'));
    return () => {
      motionSub.remove();
      appSub.remove();
    };
  }, []);

  if (reduceMotion) return null;

  const primaryColor = theme.primary;
  const accentColor  = theme.accentOrange;   // amber — vivid contrast node/detail
  const gridOpacity  = isDark ? 0.045 : 0.055;
  const scanOpacity  = isDark ? 0.07  : 0.06;

  // Ring colors — primary for main focal, accent for secondary
  const ringColorA = primaryColor;
  const ringColorB = isDark ? theme.accentBlue : theme.primaryDark;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">

      {/* ── Grid lines (static — no animation, pure compositor cost = zero) ── */}
      {Array.from({ length: COLS + 1 }, (_, i) => (
        <View
          key={`vl-${i}`}
          style={[styles.gridLine, {
            left: i * CELL_W,
            top: 0,
            width: StyleSheet.hairlineWidth,
            height: SCREEN_H,
            backgroundColor: primaryColor,
            opacity: gridOpacity,
          }]}
        />
      ))}
      {Array.from({ length: ROWS + 1 }, (_, i) => (
        <View
          key={`hl-${i}`}
          style={[styles.gridLine, {
            top: i * CELL_H,
            left: 0,
            height: StyleSheet.hairlineWidth,
            width: SCREEN_W,
            backgroundColor: primaryColor,
            opacity: gridOpacity,
          }]}
        />
      ))}

      {/* ── Radar scan sweep ── */}
      <View style={[styles.scanWrap, { opacity: scanOpacity }]}>
        <ScanLine primaryColor={primaryColor} running={running} />
      </View>

      {/* ── Signal nodes at grid intersections ── */}
      {NODES.map((node) => (
        <SignalNode
          key={node.id}
          config={node}
          primaryColor={primaryColor}
          accentColor={accentColor}
          running={running}
        />
      ))}

      {/* ── Halo rings expand from the two accent nodes ── */}
      {NODES.filter((n) => n.isAccent).map((node) => (
        <NodeHalo
          key={`halo-${node.id}`}
          config={node}
          color={accentColor}
          running={running}
        />
      ))}

      {/* ── Secondary focal — bottom-left (accent) ── */}
      <RadarRing cx={SCREEN_W * 0.18} cy={SCREEN_H * 0.78} maxR={70}  color={ringColorB} delay={1100} duration={7000} running={running} />
      <RadarRing cx={SCREEN_W * 0.18} cy={SCREEN_H * 0.78} maxR={120} color={ringColorB} delay={3200} duration={7000} running={running} />

      {/* ── Corner targeting reticles (static) ── */}
      <CornerReticle top={22}        left={22}        color={primaryColor} />
      <CornerReticle bottom={22}     right={22}       color={primaryColor} />

    </View>
  );
};

const styles = StyleSheet.create({
  gridLine: {
    position: 'absolute',
  },
  scanWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SCREEN_W,
    height: 1.5,
  },
  node: {
    position: 'absolute',
  },
  reticle: {
    position: 'absolute',
    width: 22,
    height: 22,
    opacity: 0.25,
  },
  reticleArm: {
    position: 'absolute',
  },
});

export default AnimatedBackground;
