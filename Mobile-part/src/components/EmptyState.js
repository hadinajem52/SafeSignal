import React from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AppText from './Text';
import Button from './Button';
import { useTheme } from '../context/ThemeContext';
import { DURATION } from '../theme/motion';


export const EMPTY_ART = {
  reports: require('../../assets/illustrations/empty-states/empty-reports.png'),
  feed: require('../../assets/illustrations/empty-states/empty-feed.png'),
  map: require('../../assets/illustrations/empty-states/empty-map.png'),
  timeline: require('../../assets/illustrations/empty-states/empty-timeline.png'),
  search: require('../../assets/illustrations/empty-states/empty-search.png'),
  notifications: require('../../assets/illustrations/empty-states/empty-notifications.png'),
  errorNetwork: require('../../assets/illustrations/empty-states/error-network.png'),
  errorGeneric: require('../../assets/illustrations/empty-states/error-generic.png'),
};





export default function EmptyState({
  illustration,
  title,
  message,
  actionLabel,
  onAction,
  size = 180,
  style,
}) {
  const { theme } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(DURATION.page)} style={[styles.container, style]}>
      {illustration ? (
        <Image source={illustration} style={[styles.art, { width: size, height: size }]} resizeMode="contain" />
      ) : null}
      {title ? (
        <AppText variant="h4" style={[styles.title, { color: theme.text }]}>{title}</AppText>
      ) : null}
      {message ? (
        <AppText variant="body" style={[styles.message, { color: theme.textSecondary }]}>{message}</AppText>
      ) : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  art: { marginBottom: 16 },
  title: { textAlign: 'center' },
  message: { marginTop: 8, textAlign: 'center' },
  action: { marginTop: 20, alignSelf: 'center', minWidth: 230 },
});
