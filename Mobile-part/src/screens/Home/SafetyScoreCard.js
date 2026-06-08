import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const getSafetyScoreColor = (theme, score) => {
  if (score >= 80) return theme.safetyGood;
  if (score >= 60) return theme.safetyModerate;
  return theme.safetyPoor;
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
  const confidence = safetyScore?.confidence;

  if (!Number.isFinite(incidentCount) || !Number.isFinite(windowDays)) {
    return 'Based on recent verified incident reports';
  }

  const incidentWord = incidentCount === 1 ? 'incident' : 'incidents';
  const note = `Based on ${incidentCount} verified ${incidentWord} within ${formatRadius(safetyScore.radiusKm)} over ${windowDays} days`;

  return confidence ? `${note}. Confidence: ${confidence}` : note;
};

const SafetyScoreCard = ({ safetyScore, location, unavailableReason, ctaLabel, onCtaPress }) => {
  const { theme } = useTheme();
  const [displayScore, setDisplayScore] = useState(0);
  const enterAnim = useRef(new Animated.Value(0.94)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(enterAnim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [enterAnim, opacityAnim]);

  useEffect(() => {
    const target = normalizeScore(safetyScore?.score);
    let current = 0;
    if (target <= 0) {
      setDisplayScore(0);
      return undefined;
    }

    const timer = setInterval(() => {
      current += Math.max(1, Math.ceil(target / 25));
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(timer);
      } else {
        setDisplayScore(current);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [safetyScore?.score]);

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
  const scoreColor = getSafetyScoreColor(theme, score);
  const safetyNote = buildSafetyNote(safetyScore);

  return (
    <Animated.View style={{ transform: [{ scale: enterAnim }], opacity: opacityAnim }}>
      <Card style={[styles.safetyCard, { borderColor: scoreColor }]}> 
        <View style={styles.safetyHeader}>
          <AppText variant="label" style={[styles.safetyTitle, { color: theme.text }]}>Area Activity Score</AppText>
          {location ? (
            <View style={[styles.locationBadge, { backgroundColor: theme.surface2 }]}> 
              <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
              <AppText variant="caption" style={[styles.locationBadgeText, { color: theme.textSecondary }]}> 
                Your Location
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.safetyContent}>
          <View style={[styles.scoreRing, { borderColor: `${scoreColor}40` }]}> 
            <View style={[styles.scoreCircle, { backgroundColor: theme.surface }]}> 
              <AppText variant="h1" style={[styles.scoreNumber, { color: scoreColor }]}>{displayScore}</AppText>
              <AppText variant="caption" style={[styles.scoreLabel, { color: theme.textSecondary }]}>{safetyScore.label}</AppText>
            </View>
          </View>

          <View style={styles.safetyInfo}>
            <AppText variant="body" style={[styles.safetyDescription, { color: theme.text }]}> 
              {safetyScore.description}
            </AppText>
            <AppText variant="bodySmall" style={[styles.safetyNote, { color: theme.textTertiary }]}> 
              {safetyNote}
            </AppText>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
};

export default SafetyScoreCard;
