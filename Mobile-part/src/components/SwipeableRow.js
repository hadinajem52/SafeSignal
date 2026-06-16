import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './Text';
import { useTheme } from '../context/ThemeContext';
import haptics from '../utils/haptics';

const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = 44;

// Swipe-left to reveal a Delete action, built on core PanResponder so it needs no
// native gesture dependency. The action is revealed on release and deleting is a
// second explicit tap, so a stray swipe can't destroy data.
export default function SwipeableRow({
  children,
  onDelete,
  deleteLabel = 'Delete',
  enabled = true,
  rowGap = 0,
  resetKey,
}) {
  const { theme } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);

  const settle = (toOpen) => {
    openRef.current = toOpen;
    Animated.spring(translateX, {
      toValue: toOpen ? -ACTION_WIDTH : 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      // Only claim clearly-horizontal drags so vertical list scrolling still works.
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_evt, gesture) => {
        const base = openRef.current ? -ACTION_WIDTH : 0;
        const next = Math.min(0, Math.max(-ACTION_WIDTH, base + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const base = openRef.current ? -ACTION_WIDTH : 0;
        const shouldOpen = base + gesture.dx < -OPEN_THRESHOLD;
        if (shouldOpen && !openRef.current) {
          haptics.selection();
        }
        settle(shouldOpen);
      },
      onPanResponderTerminate: () => settle(openRef.current),
    })
  ).current;

  // Reset position when this row is recycled onto a different item (FlashList reuse).
  useEffect(() => {
    translateX.setValue(0);
    openRef.current = false;
  }, [resetKey, translateX]);

  if (!enabled) {
    return children;
  }

  const handleDeletePress = () => {
    settle(false);
    onDelete?.();
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.actionLayer, { bottom: rowGap }]}>
        <TouchableOpacity
          style={[styles.action, { backgroundColor: theme.error }]}
          onPress={handleDeletePress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <AppText variant="caption" style={styles.actionText}>{deleteLabel}</AppText>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  actionLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  action: {
    width: ACTION_WIDTH,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
  },
  actionText: {
    color: '#FFFFFF',
  },
});
