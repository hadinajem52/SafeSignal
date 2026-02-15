import React from 'react';
import { View } from 'react-native';
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

  if (!safetyScore) {
    return (
      <Card style={[styles.safetyCard, { borderLeftColor: theme.warning }]}> 
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
    );
  }

  const scoreColor = getSafetyScoreColor(theme, safetyScore.score);

  return (
    <Card style={[styles.safetyCard, { borderLeftColor: scoreColor }]}>
      <View style={styles.safetyHeader}>
        <AppText variant="label" style={[styles.safetyTitle, { color: theme.text }]}>Area Safety Score</AppText>
        {location ? (
          <View
            style={[
              styles.locationBadge,
              { backgroundColor: theme.surface },
            ]}
          >
            <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
            <AppText
              variant="caption"
              style={[styles.locationBadgeText, { color: theme.textSecondary }]}
            >
              Your Location
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.safetyContent}>
        <View style={[styles.scoreCircle, { backgroundColor: theme.surface }]}>
          <AppText variant="h1" style={[styles.scoreNumber, { color: scoreColor }]}>{safetyScore.score}</AppText>
          <AppText variant="caption" style={[styles.scoreLabel, { color: theme.textSecondary }]}>{safetyScore.label}</AppText>
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
  );
};

export default SafetyScoreCard;
