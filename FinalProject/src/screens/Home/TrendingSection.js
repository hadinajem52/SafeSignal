import React from 'react';
import { View } from 'react-native';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import incidentConstants from '../../../../constants/incident';
import styles from './homeStyles';

const { CATEGORY_DISPLAY } = incidentConstants;

const getTrendIcon = (change) => {
  if (change > 0) return '↑';
  if (change < 0) return '↓';
  return '→';
};

const getTrendColor = (theme, change) => {
  if (change > 0) return theme.trendUp;
  if (change < 0) return theme.trendDown;
  return theme.trendNeutral;
};

const formatCategoryName = (category) => {
  return CATEGORY_DISPLAY[category]?.label || category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const TrendingSection = ({ trendingCategories }) => {
  const { theme } = useTheme();

  if (!trendingCategories?.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>📈 Trending This Week</AppText>
      <Card style={styles.trendingContainer}>
        {trendingCategories.map((cat, index) => {
          const config = CATEGORY_DISPLAY[cat.category] || CATEGORY_DISPLAY.other;
          const trendColor = getTrendColor(theme, cat.changePercentage);

          return (
              <View key={index} style={[styles.trendingItem, { borderBottomColor: theme.divider }]}>
                <View style={[styles.trendingIcon, { backgroundColor: `${config.trendColor}15` }]}>
                  <AppText style={styles.trendingEmoji}>{config.trendIcon}</AppText>
                </View>
                <View style={styles.trendingInfo}>
                  <AppText variant="label" style={[styles.trendingCategory, { color: theme.text }]}> 
                    {formatCategoryName(cat.category)}
                  </AppText>
                  <AppText variant="caption" style={[styles.trendingCount, { color: theme.textSecondary }]}> 
                    {cat.count} reports
                  </AppText>
                </View>
                <View style={[styles.trendBadge, { backgroundColor: `${trendColor}15` }]}>
                  <AppText variant="caption" style={[styles.trendText, { color: trendColor }]}> 
                    {getTrendIcon(cat.changePercentage)} {Math.abs(cat.changePercentage)}%
                  </AppText>
                </View>
              </View>
          );
        })}
      </Card>
    </View>
  );
};

export default TrendingSection;
