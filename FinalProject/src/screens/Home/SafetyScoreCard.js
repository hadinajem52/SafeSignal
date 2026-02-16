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
    const parsedTarget = Number(safetyScore?.score);
    const target = Number.isFinite(parsedTarget) ? parsedTarget : 0;
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
            <AppText variant="label" style={[styles.safetyTitle, { color: theme.text }]}>Area Safety Score</AppText>
          </View>
          <AppText variant="body" style={[styles.safetyDescription, { color: theme.text }]}> 
            Safety score unavailable
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

  const scoreColor = getSafetyScoreColor(theme, safetyScore.score);

  return (
    <Animated.View style={{ transform: [{ scale: enterAnim }], opacity: opacityAnim }}>
      <Card style={[styles.safetyCard, { borderColor: scoreColor }]}> 
        <View style={styles.safetyHeader}>
          <AppText variant="label" style={[styles.safetyTitle, { color: theme.text }]}>Area Safety Score</AppText>
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
              Based on incidents within 5km radius
            </AppText>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
};

export default SafetyScoreCard;
