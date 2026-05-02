import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const QuickActions = ({ navigation, quickStats, userStats }) => {
  const { theme } = useTheme();

  const pendingReports = userStats?.pendingReports || 0;
  const activeNearby = quickStats?.activeNearby || 0;

  const suggestion = pendingReports > 0
    ? {
        title: `You have ${pendingReports} pending report${pendingReports > 1 ? 's' : ''}`,
        description: 'Review status updates and complete missing details if needed.',
        cta: 'View reports',
        icon: 'document-text-outline',
        onPress: () => navigation.navigate('Reports'),
      }
    : activeNearby > 0
      ? {
          title: `${activeNearby} active incident${activeNearby > 1 ? 's' : ''} near you`,
          description: 'Open the map to inspect incident locations and details.',
          cta: 'Open map',
          icon: 'map-outline',
          onPress: () => navigation.navigate('Map'),
        }
      : {
          title: 'Everything looks calm in your area',
          description: 'If you witness something important, submit a report quickly.',
          cta: 'Report incident',
          icon: 'add-circle-outline',
          onPress: () => navigation.navigate('SubmitReport'),
        };

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name="flash" size={18} color={theme.text} style={styles.sectionTitleIcon} />
        <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Suggested Action</AppText>
      </View>

      <Pressable onPress={suggestion.onPress}>
        {({ pressed }) => (
          <Card
            style={[
              styles.suggestionCard,
              {
                borderColor: theme.border,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <View style={styles.suggestionHeader}>
              <View style={[styles.suggestionIconWrap, { backgroundColor: theme.primaryLight || 'rgba(29,78,216,0.15)' }]}>
                <Ionicons name={suggestion.icon} size={18} color={theme.primary} />
              </View>
              <AppText variant="label" style={[styles.suggestionTitle, { color: theme.text }]}>
                {suggestion.title}
              </AppText>
            </View>

            <AppText variant="bodySmall" style={[styles.suggestionDescription, { color: theme.textSecondary }]}>
              {suggestion.description}
            </AppText>

            <View style={styles.suggestionFooter}>
              <AppText variant="buttonSmall" style={{ color: theme.primary }}>{suggestion.cta}</AppText>
              <Ionicons name="arrow-forward" size={16} color={theme.primary} />
            </View>
          </Card>
        )}
      </Pressable>
    </View>
  );
};

export default QuickActions;
