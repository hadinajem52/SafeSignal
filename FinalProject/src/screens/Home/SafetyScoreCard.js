import React from 'react';
import { Text, View } from 'react-native';
import { Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const getSafetyScoreColor = (theme, score) => {
  if (score >= 80) return theme.safetyGood;
  if (score >= 60) return theme.safetyModerate;
  return theme.safetyPoor;
};

const SafetyScoreCard = ({ safetyScore, location }) => {
  const { theme } = useTheme();

  if (!safetyScore) {
    return null;
  }

  const scoreColor = getSafetyScoreColor(theme, safetyScore.score);

  return (
    <Card style={[styles.safetyCard, { borderLeftColor: scoreColor }]}>
      <View style={styles.safetyHeader}>
        <Text style={[styles.safetyTitle, { color: theme.text }]}>Area Safety Score</Text>
        {location ? (
          <Text
            style={[
              styles.locationBadge,
              { color: theme.textSecondary, backgroundColor: theme.surface },
            ]}
          >
            📍 Your Location
          </Text>
        ) : null}
      </View>
      <View style={styles.safetyContent}>
        <View style={[styles.scoreCircle, { backgroundColor: theme.surface }]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>{safetyScore.score}</Text>
          <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>{safetyScore.label}</Text>
        </View>
        <View style={styles.safetyInfo}>
          <Text style={[styles.safetyDescription, { color: theme.text }]}>
            {safetyScore.description}
          </Text>
          <Text style={[styles.safetyNote, { color: theme.textTertiary }]}>
            Based on incidents within 5km radius
          </Text>
        </View>
      </View>
    </Card>
  );
};

export default SafetyScoreCard;
