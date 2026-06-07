import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AppText from './Text';
import IncidentTimeline from './IncidentTimeline';
import { useTheme } from '../context/ThemeContext';
import { haptics } from '../utils/haptics';
import { DURATION, EASING } from '../theme/motion';

// Readable icon color on a solid accent (light teal vs dark blue, etc).
const readableOn = (hex) => {
  const c = typeof hex === 'string' ? hex.replace('#', '') : '';
  if (c.length < 6) return '#FFFFFF';
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#0B1220' : '#FFFFFF';
};

/**
 * Floating chat bubble for an incident. Tapping it slides up an animated chat
 * panel (the full IncidentTimeline). The bubble shows an unread badge + a
 * radar-ping pulse when new messages arrive while the panel is closed.
 *
 * The panel stays mounted (animated off-screen when closed) so the timeline
 * socket keeps running and unread activity is tracked even while it's hidden.
 */
export default function IncidentChatFab({ incidentId, accent }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const openRef = useRef(false);

  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);

  const bubbleColor = accent || theme.primary;
  const panelHeight = Math.min(windowHeight * 0.86, windowHeight - insets.top - 24);

  const animateTo = useCallback(
    (toOpen) => {
      progress.value = withTiming(toOpen ? 1 : 0, {
        duration: reduceMotion ? 120 : DURATION.page,
        easing: toOpen ? EASING.out : EASING.inOut,
      });
    },
    [progress, reduceMotion],
  );

  const openChat = useCallback(() => {
    haptics.light();
    openRef.current = true;
    setOpen(true);
    setUnread(0);
    animateTo(true);
  }, [animateTo]);

  const closeChat = useCallback(() => {
    haptics.selection();
    openRef.current = false;
    setOpen(false);
    animateTo(false);
  }, [animateTo]);

  const handleNewActivity = useCallback(() => {
    if (!openRef.current) {
      setUnread((u) => Math.min(u + 1, 99));
    }
  }, []);

  // Radar ping while there's unseen activity and the panel is closed.
  useEffect(() => {
    if (unread > 0 && !open && !reduceMotion) {
      pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false);
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
  }, [unread, open, reduceMotion, pulse]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [panelHeight + 60, 0]) }],
    opacity: interpolate(progress.value, [0, 0.12, 1], [0, 1, 1]),
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.6]) }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2]) }],
  }));

  return (
    <>
      {/* Dimmed backdrop */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeChat} />
      </Animated.View>

      {/* Sliding chat panel */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[
          styles.panel,
          {
            height: panelHeight,
            paddingBottom: tabBarHeight + 10,
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
          panelStyle,
        ]}
      >
        <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <View style={styles.panelTitleRow}>
            <View style={styles.panelTitleLeft}>
              <View style={[styles.panelIcon, { backgroundColor: `${bubbleColor}1F` }]}>
                <Ionicons name="chatbubbles" size={16} color={bubbleColor} />
              </View>
              <View style={styles.panelTitleText}>
                <AppText variant="label" style={{ color: theme.text }}>Updates & Messages</AppText>
                <AppText variant="small" style={{ color: theme.textTertiary }}>Status updates & witness chat</AppText>
              </View>
            </View>
            <Pressable onPress={closeChat} hitSlop={10} style={[styles.closeBtn, { backgroundColor: theme.surface2 }]}>
              <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.timelineWrap}>
          <IncidentTimeline incidentId={incidentId} onNewActivity={handleNewActivity} />
        </View>
      </Animated.View>

      {/* Floating bubble */}
      <Animated.View
        pointerEvents={open ? 'none' : 'box-none'}
        style={[styles.bubbleWrap, { bottom: tabBarHeight + 16 }, bubbleStyle]}
      >
        {unread > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.ring, { backgroundColor: bubbleColor }, ringStyle]} />
        ) : null}
        <Pressable onPress={openChat} style={[styles.bubble, { backgroundColor: bubbleColor, shadowColor: theme.shadow }]}>
          <Ionicons name="chatbubbles" size={26} color={readableOn(bubbleColor)} />
        </Pressable>
        {unread > 0 ? (
          <View pointerEvents="none" style={[styles.badge, { backgroundColor: theme.error, borderColor: theme.card }]}>
            <AppText variant="small" style={styles.badgeText}>{unread > 9 ? '9+' : unread}</AppText>
          </View>
        ) : null}
      </Animated.View>
    </>
  );
}

const BUBBLE_SIZE = 60;

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
  },
  panelHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  panelIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitleText: {
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  timelineWrap: {
    flex: 1,
  },

  bubbleWrap: {
    position: 'absolute',
    right: 16,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ring: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
