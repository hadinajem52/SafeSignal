import React, { useEffect, useRef } from 'react';
import { Animated, TextInput, View } from 'react-native';
import Reanimated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge, Button, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { fontFamilies } from '../../../../constants/typography';
import styles from './homeStyles';

const AnimatedTextInput = Reanimated.createAnimatedComponent(TextInput);

const getSafetyScorePresentation = (theme, score) => {
  if (score >= 80) return { color: theme.safetyGood, icon: 'shield-checkmark-outline' };
  if (score >= 60) return { color: theme.safetyModerate, icon: 'alert-circle-outline' };
  return { color: theme.safetyPoor, icon: 'warning-outline' };
};

const normalizeScore = (score) => {
  const parsedScore = Number(score);

  if (!Number.isFinite(parsedScore)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(parsedScore)));
};

const formatRadius = (radiusKm) => {
  const radius = Number(radiusKm);

  if (!Number.isFinite(radius)) {
    return 'this area';
  }

  return `${Number.isInteger(radius) ? radius : radius.toFixed(1)} km`;
};

const buildSafetyNote = (safetyScore) => {
  const incidentCount = Number(safetyScore?.incidentCount);
  const windowDays = Number(safetyScore?.windowDays);

  if (!Number.isFinite(incidentCount) || !Number.isFinite(windowDays)) {
    return 'Based on recent verified incident reports';
  }

  const incidentWord = incidentCount === 1 ? 'incident' : 'incidents';
  return `Based on ${incidentCount} verified ${incidentWord} within ${formatRadius(safetyScore.radiusKm)} over ${windowDays} days`;
};

const SafetyScoreCard = ({ safetyScore, location, unavailableReason, ctaLabel, onCtaPress }) => {
  const { theme } = useTheme();
  const enterAnim = useRef(new Animated.Value(0.94)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(enterAnim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [enterAnim, opacityAnim]);

  const targetScore = normalizeScore(safetyScore?.score);
  const animatedScore = useSharedValue(0);
  useEffect(() => {
    animatedScore.value = withTiming(targetScore, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [targetScore, animatedScore]);
  const scoreAnimatedProps = useAnimatedProps(() => ({
    text: `${Math.round(animatedScore.value)}`,
  }));

  if (!safetyScore) {
    return (
      <Animated.View style={{ transform: [{ scale: enterAnim }], opacity: opacityAnim }}>
        <Card style={[styles.safetyCard, { borderColor: theme.warning }]}>
          <View style={styles.safetyHeader}>
            <AppText variant="label" style={[styles.safetyTitle, { color: theme.text }]}>Area Activity Score</AppText>
          </View>
          <AppText variant="body" style={[styles.safetyDescription, { color: theme.text }]}>
            Activity score unavailable
          </AppText>
          <AppText variant="bodySmall" style={[styles.safetyNote, { color: theme.textSecondary }]}>
            {unavailableReason || 'We could not determine safety conditions for your area right now.'}
          </AppText>
          {ctaLabel && onCtaPress ? (
            <Button
              title={ctaLabel}
              onPress={onCtaPress}
              variant="secondary"
              style={styles.safetyCtaButton}
            />
          ) : null}
        </Card>
      </Animated.View>
    );
  }

  const score = normalizeScore(safetyScore.score);
  const { color: scoreColor, icon: scoreIcon } = getSafetyScorePresentation(theme, score);
  const safetyNote = buildSafetyNote(safetyScore);

  return (
    <Animated.View style={{ transform: [{ scale: enterAnim }], opacity: opacityAnim }}>
      <Card style={[styles.safetyCard, { borderColor: `${scoreColor}55` }]}>
        <View style={styles.safetyHeader}>
          <AppText variant="label" style={[styles.safetyTitle, { color: theme.text }]}>Area Activity Score</AppText>
          {location ? (
            <View style={[styles.locationBadge, { backgroundColor: theme.surface2 }]}>
              <Ionicons name="location-outline" size={11} color={theme.textSecondary} />
              <AppText variant="small" style={[styles.locationBadgeText, { color: theme.textSecondary }]}>
                Your Location
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.safetyContent}>
          <View style={[styles.scoreRing, { borderColor: `${scoreColor}59` }]}>
            <View style={[styles.scoreCircle, { backgroundColor: theme.surface }]}>
              <AnimatedTextInput
                editable={false}
                caretHidden
                underlineColorAndroid="transparent"
                defaultValue="0"
                animatedProps={scoreAnimatedProps}
                style={{
                  fontSize: 34,
                  fontFamily: fontFamilies.display,
                  color: scoreColor,
                  textAlign: 'center',
                  padding: 0,
                  includeFontPadding: false,
                }}
              />
            </View>
          </View>

          <View style={styles.safetyInfo}>
            <Badge
              label={safetyScore.label}
              color={scoreColor}
              icon={scoreIcon}
              style={styles.scoreLabelBadge}
            />
            <AppText variant="body" style={[styles.safetyDescription, { color: theme.text }]}>
              {safetyScore.description}
            </AppText>
          </View>
        </View>

        <View style={[styles.safetyNoteRow, { borderTopColor: theme.border }]}>
          <Ionicons name="shield-checkmark-outline" size={13} color={theme.textTertiary} style={styles.safetyNoteIcon} />
          <AppText variant="bodySmall" style={[styles.safetyNoteText, { color: theme.textTertiary }]}>
            {safetyNote}
          </AppText>
        </View>
      </Card>
    </Animated.View>
  );
};

export default SafetyScoreCard;
