import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';

const LEVEL_CONFIG = {
  calm: { label: 'Calm', colorKey: 'safetyGood', icon: 'leaf-outline' },
  caution: { label: 'Caution', colorKey: 'safetyModerate', icon: 'alert-circle-outline' },
  elevated: { label: 'Elevated', colorKey: 'safetyPoor', icon: 'warning-outline' },
};

const TREND_CONFIG = {
  rising: { icon: 'trending-up', label: 'Rising' },
  falling: { icon: 'trending-down', label: 'Easing' },
  stable: { icon: 'remove-outline', label: 'Steady' },
};

const titleCase = (value) => {
  const text = String(value || '').replace(/_/g, ' ');
  return text ? text[0].toUpperCase() + text.slice(1) : text;
};

const CardHeader = ({ theme, right }) => (
  <View style={styles.headerRow}>
    <View style={[styles.iconBadge, { backgroundColor: `${theme.primary}1f` }]}>
      <Ionicons name="sparkles" size={14} color={theme.primary} />
    </View>
    <AppText variant="label" style={[styles.title, { color: theme.text }]}>AI Insights</AppText>
    <View style={styles.headerSpacer} />
    {right}
  </View>
);

const InsightLoading = ({ theme }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Card style={[styles.card, { borderColor: `${theme.primary}55` }]}>
      <CardHeader
        theme={theme}
        right={<Animated.View style={[styles.skeletonChip, { backgroundColor: theme.surface2, opacity: pulse }]} />}
      />
      <Animated.View style={{ opacity: pulse }}>
        <View style={[styles.skeletonLine, { backgroundColor: theme.surface2, height: 16, width: '60%', marginBottom: 12 }]} />
        <View style={[styles.skeletonLine, { backgroundColor: theme.surface2, width: '100%' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: theme.surface2, width: '82%' }]} />
        <View style={[styles.skeletonTipBox, { backgroundColor: theme.surface, borderColor: theme.border }]} />
      </Animated.View>
      <AppText variant="caption" style={[styles.loadingText, { color: theme.textTertiary }]}>
        Analyzing recent activity near you…
      </AppText>
    </Card>
  );
};

const AreaInsightsCard = ({ insight, loading }) => {
  const { theme } = useTheme();
  const enterAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!insight) return;
    Animated.parallel([
      Animated.spring(enterAnim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 7 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [insight, enterAnim, opacityAnim]);

  if (loading && !insight) {
    return <InsightLoading theme={theme} />;
  }

  if (!insight) {
    return null;
  }

  const level = LEVEL_CONFIG[insight.level] || LEVEL_CONFIG.caution;
  const accent = theme[level.colorKey] || theme.warning;
  const stats = insight.stats || {};
  const trend = stats.trend ? TREND_CONFIG[stats.trend] : null;
  const reportWord = stats.total === 1 ? 'report' : 'reports';

  return (
    <Animated.View style={{ transform: [{ scale: enterAnim }], opacity: opacityAnim }}>
      <Card style={[styles.card, { borderColor: `${theme.primary}55` }]}>
        <CardHeader
          theme={theme}
          right={
            <View style={[styles.levelChip, { backgroundColor: `${accent}1f` }]}>
              <View style={[styles.levelDot, { backgroundColor: accent }]} />
              <AppText variant="caption" style={[styles.levelText, { color: accent }]}>{level.label}</AppText>
            </View>
          }
        />

        <AppText variant="h5" style={[styles.headline, { color: theme.text }]}>
          {insight.headline}
        </AppText>
        <AppText variant="body" style={[styles.summary, { color: theme.textSecondary }]}>
          {insight.summary}
        </AppText>

        <View style={[styles.tipRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="bulb-outline" size={15} color={accent} style={styles.tipIcon} />
          <AppText variant="bodySmall" style={[styles.tipText, { color: theme.text }]}>
            {insight.tip}
          </AppText>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.metaChip}>
            <Ionicons name="document-text-outline" size={12} color={theme.textTertiary} />
            <AppText variant="small" style={[styles.metaText, { color: theme.textTertiary }]}>
              {stats.total ?? 0} {reportWord}
            </AppText>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="locate-outline" size={12} color={theme.textTertiary} />
            <AppText variant="small" style={[styles.metaText, { color: theme.textTertiary }]}>
              {stats.radiusKm ?? 1} km · {stats.windowDays ?? 7}d
            </AppText>
          </View>
          {stats.dominantCategory ? (
            <View style={styles.metaChip}>
              <Ionicons name="pricetag-outline" size={12} color={theme.textTertiary} />
              <AppText variant="small" style={[styles.metaText, { color: theme.textTertiary }]}>
                {titleCase(stats.dominantCategory)}
              </AppText>
            </View>
          ) : null}
          {trend ? (
            <View style={styles.metaChip}>
              <Ionicons name={trend.icon} size={12} color={theme.textTertiary} />
              <AppText variant="small" style={[styles.metaText, { color: theme.textTertiary }]}>
                {trend.label}
              </AppText>
            </View>
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    letterSpacing: 0.2,
  },
  headerSpacer: {
    flex: 1,
  },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  levelDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 6,
  },
  levelText: {
    letterSpacing: 0.2,
  },
  headline: {
    marginBottom: 6,
  },
  summary: {
    lineHeight: 21,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 14,
    gap: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 4,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonChip: {
    width: 64,
    height: 20,
    borderRadius: 999,
  },
  skeletonTipBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  loadingText: {
    marginTop: 12,
  },
});

export default AreaInsightsCard;
